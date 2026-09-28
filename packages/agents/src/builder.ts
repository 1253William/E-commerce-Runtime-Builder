import type { AIProvider } from "@seltra/ai";
import type { SandboxProvider } from "@seltra/sandbox";
import { builtinModules } from "node:module";
import ts from "typescript";
import type { Agent, AgentContext, AgentResult, AgentTask } from "./index.js";
import type { ResearcherAgent } from "./researcher.js";
import { preflightProject, rewriteResolvableRelativeImports, stripTypeScriptFromJavaScript, validateLocalImports } from "./validate-local-imports.js";
import { classifyBuildFailure } from "./build-failure-classifier.js";

interface GeneratedProject { files: Array<{ path: string; content: string }>; routes: string[]; }

function materializeRequiredManifestFiles(manifest: { router: "app" | "pages"; routes: string[]; files: Array<{ path: string; purpose: string; language: string; imports: string[] }> }) {
  const paths = new Set(manifest.files.map((file) => file.path.replace(/\\/g, "/")));
  const ensure = (path: string, purpose: string, language: string, imports: string[] = []) => {
    if (!paths.has(path)) { manifest.files.push({ path, purpose, language, imports }); paths.add(path); }
  };
  for (const route of manifest.routes) {
    if (!route.startsWith("/") || route.startsWith("/api/")) continue;
    const segments = route.split("/").filter(Boolean).map((segment) => segment.startsWith(":") ? `[${segment.slice(1)}]` : segment);
    const routePart = segments.join("/");
    const path = manifest.router === "app"
      ? `${routePart ? `app/${routePart}` : "app"}/page.tsx`
      : `${routePart ? `pages/${routePart}` : "pages"}/${routePart ? "index" : "index"}.tsx`;
    ensure(path, `Complete Next.js page implementing merchant route ${route}`, "tsx");
  }
  if (manifest.router === "app") {
    ensure("app/layout.tsx", "Required root App Router layout importing the global stylesheet and rendering html/body", "tsx", ["./globals.css"]);
    ensure("app/globals.css", "Global application styles", "css");
  } else {
    ensure("pages/_app.tsx", "Required Pages Router app shell importing the global stylesheet", "tsx", ["../styles/globals.css"]);
    ensure("styles/globals.css", "Global application styles", "css");
  }
  for (const file of [...manifest.files]) for (const specifier of file.imports ?? []) {
    if (!specifier.startsWith(".") && !specifier.startsWith("app/") && !specifier.startsWith("@/")) continue;
    const alias = specifier.startsWith("app/") || specifier.startsWith("@/");
    const parts = alias ? (specifier.startsWith("@/") ? specifier.slice(2) : specifier).split("/") : file.path.replace(/\\/g, "/").split("/").slice(0, -1);
    if (!alias) for (const segment of specifier.replace(/\\/g, "/").split("/")) { if (!segment || segment === ".") continue; if (segment === "..") parts.pop(); else parts.push(segment); }
    const target = parts.join("/").replace(/\.(?:js|jsx|ts|tsx|mjs|cjs|css|json)$/i, "");
    const exists = manifest.files.some((candidate) => {
      const path = candidate.path.replace(/\\/g, "/");
      return path === target || path.replace(/\.(?:js|jsx|ts|tsx|mjs|cjs|css|json)$/i, "") === target || path.startsWith(`${target}/index.`);
    });
    if (!exists) ensure(`${target}.tsx`, `Referenced by ${file.path} — implement per its usage`, "tsx");
  }
}

function normalizeNextConfig(files: GeneratedProject["files"]) {
  const config = files.find((file) => /^next\.config\.(?:js|mjs|cjs)$/.test(file.path));
  const content = "/** @type {import('next').NextConfig} */\nconst nextConfig = { distDir: process.env.SELTRA_REPAIR_BUILD === \"1\" ? \".next-repair\" : \".next\" };\nmodule.exports = nextConfig;\n";
  if (config) config.content = content;
  else files.push({ path: "next.config.js", content });
}

function disableRemoteGoogleFonts(files: GeneratedProject["files"]) {
  return files.map((file) => {
    if (!/\.[cm]?[jt]sx?$/.test(file.path)) return file;
    const source = ts.createSourceFile(file.path, file.content, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const replacements: Array<{ start: number; end: number; content: string }> = [];
    for (const statement of source.statements) {
      if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier) || statement.moduleSpecifier.text !== "next/font/google" || !statement.importClause || statement.importClause.isTypeOnly) continue;
      const bindings = statement.importClause.namedBindings;
      const localFonts: string[] = [];
      if (statement.importClause.name) localFonts.push(`const ${statement.importClause.name.text} = () => ({ className: "", variable: "" });`);
      if (bindings && ts.isNamedImports(bindings)) {
        for (const element of bindings.elements) if (!element.isTypeOnly) localFonts.push(`const ${element.name.text} = () => ({ className: "", variable: "" });`);
      } else if (bindings && ts.isNamespaceImport(bindings)) {
        localFonts.push(`const ${bindings.name.text} = new Proxy({}, { get: () => () => ({ className: "", variable: "" }) });`);
      }
      replacements.push({ start: statement.getStart(source), end: statement.getEnd(), content: localFonts.join("\n") });
    }
    let content = file.content;
    for (const replacement of replacements.sort((a, b) => b.start - a.start)) content = `${content.slice(0, replacement.start)}${replacement.content}${content.slice(replacement.end)}`;
    return content === file.content ? file : { ...file, content };
  });
}

function referencedPackages(files: GeneratedProject["files"]): Set<string> {
  const builtins = new Set(builtinModules.flatMap((name) => [name, name.replace(/^node:/, "")]));
  const packages = new Set<string>();
  const add = (specifier: string) => {
    if (!specifier || specifier.startsWith(".") || specifier.startsWith("/") || specifier.startsWith("#") || specifier.startsWith("@/") || specifier.startsWith("app/") || specifier.startsWith("node:")) return;
    const name = specifier.startsWith("@") ? specifier.split("/").slice(0, 2).join("/") : specifier.split("/")[0]!;
    if (!builtins.has(name)) packages.add(name);
  };
  for (const file of files) {
    if (!/\.[cm]?[jt]sx?$/.test(file.path)) continue;
    const source = ts.createSourceFile(file.path, file.content, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const visit = (node: ts.Node) => {
      if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) add(node.moduleSpecifier.text);
      else if (ts.isCallExpression(node) && node.arguments[0] && ts.isStringLiteral(node.arguments[0]) && ((ts.isIdentifier(node.expression) && node.expression.text === "require") || node.expression.kind === ts.SyntaxKind.ImportKeyword)) add(node.arguments[0].text);
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  return packages;
}

function isParserSyntaxFailure(failure: { stdout: string; stderr: string }): boolean {
  const output = `${failure.stdout}\n${failure.stderr}`;
  return /Failed to compile/i.test(output) &&
    /(?:\bExpected\b|SyntaxError|Unexpected token|Parsing error)/i.test(output) &&
    /(?:\.[cm]?[jt]sx?:\d+:\d+|\(\d+,\s*\d+\)|:\d+:\d+)/i.test(output);
}

function pointedSourcePath(failure: { stdout: string; stderr: string }): string | undefined {
  return classifyBuildFailure(failure).file;
}

function normalizePackage(files: GeneratedProject["files"], existingPackage?: string, sourceFiles: GeneratedProject["files"] = files) {
  const packageFile = files.find((file) => file.path === "package.json");
  const original = packageFile?.content || existingPackage;
  let manifest: Record<string, unknown> = {};
  let changed = false;
  if (original) {
    try {
      const parsed = JSON.parse(original);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("package.json must contain an object");
      manifest = parsed as Record<string, unknown>;
    } catch (cause) {
      throw new Error(`Generated package.json is malformed: ${cause instanceof Error ? cause.message : "invalid JSON"}`);
    }
  } else changed = true;

  const rawName = typeof manifest.name === "string" ? manifest.name : "seltra-generated-app";
  if (!/^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/.test(rawName)) {
    manifest.name = rawName.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "seltra-generated-app";
    changed = true;
  }

  const dependencies = manifest.dependencies && typeof manifest.dependencies === "object" && !Array.isArray(manifest.dependencies)
    ? manifest.dependencies as Record<string, unknown>
    : {};
  for (const [name, version] of Object.entries(dependencies)) {
    if (!/^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/.test(name) || typeof version !== "string" || !/^(?:\^|~|\*|\d|latest)/.test(version)) throw new Error(`Invalid dependency declaration in package.json: ${name}`);
  }
  for (const [name, version] of Object.entries({ next: "^15.5.4", react: "^19.1.1", "react-dom": "^19.1.1" })) {
    // Keep the generated app on the same compatible Next/React baseline as our web app.
    // AI generated ranges can be syntactically valid but peer-incompatible (for example Next 12 + React 19).
    if (dependencies[name] !== version) {
      dependencies[name] = version;
      changed = true;
    }
  }
  const devDependencies = manifest.devDependencies && typeof manifest.devDependencies === "object" && !Array.isArray(manifest.devDependencies)
    ? manifest.devDependencies as Record<string, unknown>
    : {};
  for (const name of referencedPackages(sourceFiles)) {
    if (dependencies[name] === undefined) {
      dependencies[name] = typeof devDependencies[name] === "string" ? devDependencies[name] : "latest";
      changed = true;
    }
    if (devDependencies[name] !== undefined) {
      delete devDependencies[name];
      changed = true;
    }
  }
  if (Object.keys(devDependencies).length) manifest.devDependencies = devDependencies;
  manifest.dependencies = dependencies;

  const scripts = manifest.scripts && typeof manifest.scripts === "object" && !Array.isArray(manifest.scripts)
    ? manifest.scripts as Record<string, unknown>
    : {};
  for (const key of Object.keys(scripts)) if (!["dev", "build", "start"].includes(key)) { delete scripts[key]; changed = true; }
  for (const [name, command] of Object.entries({ dev: "next dev", build: "next build", start: "next start" })) {
    if (scripts[name] !== command) {
      scripts[name] = command;
      changed = true;
    }
  }
  manifest.scripts = scripts;

  const hasTypeScript = files.some((file) => /\.tsx?$/.test(file.path));
  if (hasTypeScript) {
    const devDependencies = manifest.devDependencies && typeof manifest.devDependencies === "object" && !Array.isArray(manifest.devDependencies)
      ? manifest.devDependencies as Record<string, unknown>
      : {};
    for (const [name, version] of Object.entries({ typescript: "^5.9.2", "@types/node": "^24.0.0", "@types/react": "^19.1.13", "@types/react-dom": "^19.1.9" })) {
      if (devDependencies[name] !== version) {
        devDependencies[name] = version;
        changed = true;
      }
    }
    manifest.devDependencies = devDependencies;
  }

  const content = changed || !original ? `${JSON.stringify(manifest, null, 2)}\n` : original;
  if (packageFile) packageFile.content = content;
  else if (!existingPackage || content !== existingPackage) files.push({ path: "package.json", content });
  return content;
}

export class Builder implements Agent {
  readonly id = "builder";
  constructor(private readonly sandbox?: SandboxProvider, private readonly ai?: AIProvider, private readonly researcher?: ResearcherAgent) {}

  async execute(task: AgentTask, context: AgentContext): Promise<AgentResult> {
    const workspaceId = context.storeId;
    if (!this.sandbox || !this.ai || !workspaceId) {
      return { status: "failed", output: { error: "Builder requires configured AI and sandbox providers and a workspace id" } };
    }
    try {
      // Use Cloudflare-hosted inference directly; this does not route through AI Gateway.
      const builderModel = process.env.AI_MODEL_BUILDER ?? "@cf/openai/gpt-oss-120b";
      await this.sandbox.ensureWorkspace(workspaceId);
      const filePaths = await this.sandbox.listFiles(workspaceId);
      const existingPaths = filePaths.filter((path) => !/(?:^|\/)(?:node_modules|\.next|\.git|dist|coverage)\//.test(path) && /\.(tsx?|jsx?|css|json|md)$/.test(path));
      const existingFiles = await Promise.all(existingPaths.map(async (path) => ({ path, content: (await this.sandbox!.readFile(workspaceId, path)).slice(0, 8_000) })));
      const existingPackage = existingFiles.find((file) => file.path === "package.json")?.content;
      const hasApplication = existingFiles.some((file) => /^(?:app|src|pages)\//.test(file.path));
      const editing = hasApplication && /(?:\b(?:edit|modify|update|change|fix|redesign|extend)\b.{0,40}\b(?:existing|current|this|app|application|site|store|website)\b|\b(?:existing|current)\b.{0,30}\b(?:app|application|site|store|website)\b)/i.test(task.objective);
      const explicitlyCustomDocument = /\bcustom\s+(?:next\.js\s+)?document\b|\bpages\/_document\b/i.test(task.objective);
      const manifest = await this.ai.generateStructured<{ router: "app" | "pages"; routes: string[]; files: Array<{ path: string; purpose: string; language: string; imports: string[] }>; dependencies: string[]; requirements: string[] }>({
        task: `${editing ? "Describe only a focused edit to the existing application; preserve unrelated files." : "Plan a complete Next.js commerce application."} Return a concise project manifest only. Choose one router, use at most 4 routes and 8 files, and list each file's purpose, language and local imports. Use no extra dependencies. Keep the file graph closed. Avoid pages/_document unless explicitly requested.\nMerchant request: ${task.objective}`,
        context: JSON.stringify({ existingFiles: editing ? existingFiles : [], previousContext: context.context }), model: builderModel, maxTokens: 4096,
      }, {
        type: "object", required: ["router", "routes", "files", "dependencies", "requirements"], properties: {
          router: { type: "string", enum: ["app", "pages"] }, routes: { type: "array", maxItems: 4, items: { type: "string" } },
          files: { type: "array", maxItems: 8, items: { type: "object", required: ["path", "purpose", "language", "imports"], properties: { path: { type: "string" }, purpose: { type: "string" }, language: { type: "string" }, imports: { type: "array", items: { type: "string" } } } } }, dependencies: { type: "array", maxItems: 0, items: { type: "string" } }, requirements: { type: "array", items: { type: "string" } },
        },
      });
      if (!manifest || !["app", "pages"].includes(manifest.router) || !Array.isArray(manifest.files) || !Array.isArray(manifest.routes)) throw new Error("AI returned an invalid application manifest");
      materializeRequiredManifestFiles(manifest);
      const project = await this.ai.generateStructured<GeneratedProject>({
        task: `${editing ? "Edit the current merchant application, preserve unrelated files, and return focused complete-file replacements only." : "Build the complete purpose-built application described by the manifest."} Return complete file contents for only the manifest files. Keep each file concise. Every local import must target a file in this response or existing supplied workspace. Do not invent components, styles, assets or config without returning them. Verify every import. Use semantic responsive UI and working interactions. Do not create pages/_document unless explicitly requested. Do not claim unconfigured integrations.\nMerchant request: ${task.objective}`,
        context: JSON.stringify({ manifest, previousContext: context.context, existingFiles: editing ? existingFiles : [] }), model: builderModel, maxTokens: 8192,
      }, {
        type: "object", required: ["files", "routes"], properties: {
          files: { type: "array", minItems: 3, maxItems: 8, items: { type: "object", required: ["path", "content"], properties: { path: { type: "string" }, content: { type: "string" } } } },
          routes: { type: "array", items: { type: "string" } },
        },
      });
      if (!Array.isArray(project.files) || project.files.length < (editing ? 1 : 3) || project.files.some((file) => !file.path || typeof file.content !== "string")) {
        throw new Error("AI returned an incomplete source file set");
      }
      project.routes = manifest.routes;
      if (!editing) {
        project.files = project.files.filter((file) => manifest.router === "app"
          ? !/^pages\//.test(file.path.replace(/\\/g, "/"))
          : !/^app\//.test(file.path.replace(/\\/g, "/")));
      }
      project.files = rewriteResolvableRelativeImports(project.files, editing ? filePaths : []).files;
      project.files = project.files.map((file) => stripTypeScriptFromJavaScript(file));
      const generatedSourcePaths = new Set(project.files.map((file) => file.path.replace(/\\/g, "/")));
      const existingByPath = new Map(existingFiles.map((file) => [file.path.replace(/\\/g, "/"), file.content]));
      const retainedExisting = editing ? existingFiles.filter((file) => !generatedSourcePaths.has(file.path.replace(/\\/g, "/"))) : [];
      const fontSafeFiles = disableRemoteGoogleFonts([...retainedExisting, ...project.files]);
      const existingFontEdits = editing ? fontSafeFiles.filter((file) => !generatedSourcePaths.has(file.path.replace(/\\/g, "/")) && existingByPath.get(file.path.replace(/\\/g, "/")) !== file.content) : [];
      project.files = fontSafeFiles.filter((file) => generatedSourcePaths.has(file.path.replace(/\\/g, "/")));
      if (manifest.router === "app") project.files = project.files.filter((file) => !/^app\/_app\.(?:js|jsx|ts|tsx)$/.test(file.path.replace(/\\/g, "/")) && !/^app\/_document\.(?:js|jsx|ts|tsx)$/.test(file.path.replace(/\\/g, "/")));
      if (!editing && !explicitlyCustomDocument) {
        project.files = project.files.filter((file) => !/^pages\/_document\.(?:js|jsx|ts|tsx)$/.test(file.path.replace(/\\/g, "/")));
        for (const path of filePaths.filter((candidate) => /^pages\/_document\.(?:js|jsx|ts|tsx)$/.test(candidate))) {
          await this.sandbox.deleteFile(workspaceId, path);
        }
      }
      const precheck = preflightProject({ workspaceFiles: editing ? existingFiles : [], generatedFiles: project.files, router: manifest.router, routes: project.routes });
      if (precheck.errors.some((issue) => issue.code === "unsafe-path" || issue.code === "duplicate-path")) throw new Error(precheck.errors.map((issue) => issue.message).join("\n"));
      if (!editing) {
        for (const path of filePaths.filter((p) => /^(?:app|pages|src|components|styles)\//.test(p))) await this.sandbox.deleteFile(workspaceId, path);
      }
      const normalizedPackage = normalizePackage(project.files, editing ? existingPackage : undefined, editing ? [...existingFiles, ...project.files] : project.files);
      normalizeNextConfig(project.files);
      const generatedPaths = new Set(project.files.map((file) => file.path.replace(/\\/g, "/")));
      const availablePaths = new Set([...(editing ? existingFiles.map((file) => file.path.replace(/\\/g, "/")) : []), ...generatedPaths]);
      const omittedManifestFiles = manifest.files.map((file) => file.path.replace(/\\/g, "/"))
        .filter((path) => editing || (manifest.router === "app" ? !path.startsWith("pages/") : !path.startsWith("app/")))
        .filter((path) => !availablePaths.has(path));
      for (const file of project.files) await this.sandbox.writeFile(workspaceId, file.path, file.content);
      for (const file of existingFontEdits) await this.sandbox.writeFile(workspaceId, file.path, file.content);
      let needsInstall = !editing || !existingPackage || normalizedPackage !== existingPackage;
      let build: Awaited<ReturnType<SandboxProvider["execute"]>> | undefined;
      let failedCommand: { phase: "install" | "build" | "validate"; exitCode: number; stdout: string; stderr: string } | undefined;
      const initialValidation = await validateLocalImports(this.sandbox, workspaceId, [], { router: manifest.router, routes: project.routes });
      if (initialValidation.errors.length) {
        failedCommand = { phase: "validate", exitCode: 1, stdout: "", stderr: initialValidation.errors.join("\n") };
      }
      if (omittedManifestFiles.length) failedCommand = { phase: "validate", exitCode: 1, stdout: "", stderr: `Manifest files were not generated: ${omittedManifestFiles.join(", ")}` };
      const repairAttempts: Array<{ phase: string; diagnosis: unknown; editedFiles: string[]; exitCode: number }> = [];
      const maxRepairAttempts = 5;
      const fingerprints = new Map<string, number>();
      for (let attempt = 1; attempt <= maxRepairAttempts + 1; attempt++) {
        if (needsInstall && failedCommand?.phase !== "validate") {
          const install = await this.sandbox.execute(workspaceId, ["npm", "install", "--no-audit", "--no-fund"]);
          if (!install.success) failedCommand = { phase: "install", exitCode: install.exitCode, stdout: install.stdout, stderr: install.stderr };
          else { needsInstall = false; failedCommand = undefined; }
        }
        if (!failedCommand) {
          build = await this.sandbox.execute(workspaceId, ["npm", "run", "build"]);
          if (build.success) break;
          failedCommand = { phase: "build", exitCode: build.exitCode, stdout: build.stdout, stderr: build.stderr };
        }
        if (attempt > maxRepairAttempts) break;

        const diagnosis = classifyBuildFailure(failedCommand);
        const repeated = (fingerprints.get(diagnosis.fingerprint) ?? 0) + 1;
        fingerprints.set(diagnosis.fingerprint, repeated);
        if (repeated > 2) {
          return { status: "failed", output: { ...failedCommand, failureKind: diagnosis.kind, fingerprint: diagnosis.fingerprint, attempts: attempt, editedFiles: repairAttempts.flatMap((item) => item.editedFiles), repairAttempts, message: `The same ${diagnosis.kind} failure remained after a targeted repair and a fresh-file repair; stopped to preserve actionable diagnostics` } };
        }
        if (diagnosis.kind === "network") break;
        const paths = await this.sandbox.listFiles(workspaceId);
        const localImportFailure = diagnosis.kind === "missing-module";
        const clientBoundaryFailure = /next-client-boundary|client-only React\/Next (?:hook|feature)|You're importing a component that needs|Event handlers cannot be passed to Client Component props/i.test(diagnosis.message);
        const parserFailure = diagnosis.kind === "syntax" || (failedCommand.phase === "build" && isParserSyntaxFailure(failedCommand));
        const deterministic = failedCommand.phase === "validate" || ["missing-module", "syntax", "type-error", "dependency", "package-manifest", "next-router", "network"].includes(diagnosis.kind);
        const research = !deterministic && this.researcher
          ? await this.researcher.execute(
              { objective: `Research and diagnose this ${failedCommand.phase} failure before editing. Use the exact command output to find authoritative fixes. Return the smallest evidence-backed correction. Attempt ${attempt} of ${maxRepairAttempts}.`, modelType: "summarization", context: JSON.stringify({ build: failedCommand, previousAttempts: repairAttempts }) },
              { storeId: workspaceId, context: JSON.stringify({ workspaceFiles: paths }) },
            )
          : { status: "success" as const, output: deterministic
            ? { skipped: true, reason: `Deterministic ${diagnosis.kind} ${failedCommand.phase} failure; use local workspace evidence.` }
            : { error: "Researcher is not configured" } };
        const prerenderedRoute = failedCommand.stderr.match(/Error occurred prerendering page ["']([^"']+)["']/i)?.[1];
        const routeSourceBase = prerenderedRoute && !prerenderedRoute.startsWith("/api/")
          ? manifest.router === "app"
            ? `${prerenderedRoute === "/" ? "app" : `app/${prerenderedRoute.slice(1).split("/").filter(Boolean).join("/")}`}/page`
            : `pages/${prerenderedRoute === "/" ? "index" : prerenderedRoute.slice(1).split("/").filter(Boolean).join("/")}`
          : undefined;
        const routeSource = routeSourceBase && paths.find((path) => [".tsx", ".ts", ".jsx", ".js"].some((extension) => path === `${routeSourceBase}${extension}`));
        const targetPath = diagnosis.file ?? (!localImportFailure && parserFailure ? pointedSourcePath(failedCommand) : undefined) ?? routeSource;
        const sourcePaths = paths.filter((path) => /\.(tsx?|jsx?|css)$/.test(path) || path === "package.json");
        if (targetPath && paths.includes(targetPath)) sourcePaths.splice(sourcePaths.indexOf(targetPath), 1);
        if (targetPath && paths.includes(targetPath)) sourcePaths.unshift(targetPath);
        sourcePaths.splice(35);
        const sources = await Promise.all(sourcePaths.map(async (path) => ({ path, content: (await this.sandbox!.readFile(workspaceId, path)).slice(0, 8_000) })));
        const preflightTargets = [...new Set([
          ...manifest.files.map((file) => file.path.replace(/\\/g, "/")).filter((path) => !paths.includes(path)),
          ...failedCommand.stderr.split("\n").map((line) => line.match(/(?:at|route at|missing) ([\w./\[\]-]+)(?:\s|$)/i)?.[1]).filter((path): path is string => Boolean(path)),
          ...diagnosis.targets,
        ])];
        const repair = await this.ai.generateStructured<{ files: Array<{ path: string; content: string }> }>({
          task: `The ${diagnosis.kind} failure in ${failedCommand.phase} requires a focused repair. ${repeated === 2 ? "The same failure fingerprint returned after your prior repair. Inspect the latest file content and replace the affected file from scratch using a different strategy; do not repeat the prior edit." : ""} ${localImportFailure ? "Resolve the exact missing import by creating its intended meaningful file or correcting the import; do not add empty JS/TS placeholders." : clientBoundaryFailure ? "This App Router file uses client-only hooks. Add the use client directive as the first statement in that file, preserving its implementation." : parserFailure ? "Fix the exact syntax in the reported file. If TypeScript syntax is in a .js/.jsx file, convert it to valid JavaScript in that same file. Do not rename the file." : failedCommand.phase === "validate" ? "This is deterministic project preflight feedback. Return complete implementations for every required missing route/layout/style and correct the affected project graph. Use the required paths below exactly; a Pages Router root page must be pages/index.*. Do not return unrelated files. Do not use web research." : "Verify the diagnosis against files and the command output."} Required missing paths: ${JSON.stringify(preflightTargets)}. Return complete file replacements only. Preserve package scripts and do not edit lockfiles.\nFailure detail: ${JSON.stringify(diagnosis)}\nCommand output: ${JSON.stringify({ exitCode: failedCommand.exitCode, stdout: failedCommand.stdout.slice(-8_000), stderr: failedCommand.stderr.slice(-8_000) })}\nResearch findings: ${JSON.stringify(research.output)}`,
          context: JSON.stringify({ files: sources, workspacePaths: paths, manifest, merchantObjective: task.objective, requiredMissingPaths: preflightTargets }),
          model: builderModel,
        }, {
        type: "object", required: ["files"], properties: {
            files: { type: "array", items: { type: "object", required: ["path", "content"], properties: { path: { type: "string", pattern: "^[A-Za-z0-9_@./\\[\\]-]+\\.(?:js|jsx|ts|tsx|css|json)$" }, content: { type: "string" } } } },
          },
        });
        if (!Array.isArray(repair.files)) throw new Error("Build repair returned an invalid file list");
        const repairedPaths: string[] = [];
        const possibleMissingTargets = diagnosis.targets.flatMap((target) => [target, ...[".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs", ".css", ".json"].map((extension) => `${target}${extension}`), ...["js", "jsx", "ts", "tsx"].map((extension) => `${target}/index.${extension}`)]);
        const safeRepairFiles = repair.files.filter((file) => {
          const path = file.path.replace(/\\/g, "/");
          return (preflightTargets.length === 0 || preflightTargets.includes(path)) || possibleMissingTargets.includes(path) || diagnosis.file === path;
        });
        const rewrittenRepair = rewriteResolvableRelativeImports(safeRepairFiles, paths);
        for (const file of rewrittenRepair.files) {
          const normalizedPath = file.path.replace(/\\/g, "/");
          if (!normalizedPath || normalizedPath.startsWith("/") || /^[a-z]:/i.test(normalizedPath) || normalizedPath.includes("\0") || normalizedPath.split("/").some((part) => part === "..") || (!/\.(tsx?|jsx?|css)$/.test(normalizedPath) && normalizedPath !== "package.json")) {
            throw new Error(`Build repair returned a disallowed path: ${file.path}`);
          }
          if (!editing && (manifest.router === "app" ? /^pages\//.test(normalizedPath) : /^app\//.test(normalizedPath))) {
            if (paths.includes(normalizedPath)) await this.sandbox.deleteFile(workspaceId, normalizedPath);
            continue;
          }
          if (!editing && !explicitlyCustomDocument && /^pages\/_document\.(?:js|jsx|ts|tsx)$/.test(normalizedPath)) {
            if (paths.includes(normalizedPath)) await this.sandbox.deleteFile(workspaceId, normalizedPath);
            continue;
          }
          if (manifest.router === "app" && /^app\/_app\.(?:js|jsx|ts|tsx)$/.test(normalizedPath)) {
            if (paths.includes(normalizedPath)) await this.sandbox.deleteFile(workspaceId, normalizedPath);
            continue;
          }
          if (normalizedPath === "package.json") {
            const updatedManifest = JSON.parse(file.content) as Record<string, unknown>;
            const currentManifest = JSON.parse(await this.sandbox.readFile(workspaceId, "package.json")) as Record<string, unknown>;
            if (JSON.stringify(updatedManifest.scripts) !== JSON.stringify(currentManifest.scripts)) throw new Error("Build repair may not change package scripts");
          }
          const normalizedFile = stripTypeScriptFromJavaScript({ path: normalizedPath, content: file.content });
          await this.sandbox.writeFile(workspaceId, normalizedPath, normalizedFile.content);
          repairedPaths.push(normalizedPath);
        }
        repairAttempts.push({ phase: failedCommand.phase, diagnosis, editedFiles: repairedPaths, exitCode: failedCommand.exitCode });
        if (repairedPaths.includes("package.json") || failedCommand.phase === "install") needsInstall = true;
        if (repairedPaths.length) {
          const checked = await validateLocalImports(this.sandbox, workspaceId, [], { router: manifest.router, routes: project.routes });
          if (checked.errors.length) {
            failedCommand = { phase: "validate", exitCode: 1, stdout: "", stderr: checked.errors.join("\n") };
          } else {
            failedCommand = undefined;
          }
        }
      }
      if (!build?.success) { const failure = classifyBuildFailure({ ...failedCommand, phase: failedCommand?.phase }); return { status: "failed", output: { phase: failedCommand?.phase ?? "build-after-repair", ...(failedCommand ?? {}), failureKind: failure.kind, fingerprint: failure.fingerprint, attempts: repairAttempts.length + 1, editedFiles: repairAttempts.flatMap((item) => item.editedFiles), files: await this.sandbox.listFiles(workspaceId), repairAttempts, message: failure.message } }; }
      let preview: Awaited<ReturnType<SandboxProvider["startPreview"]>>;
      try { preview = await this.sandbox.startPreview(workspaceId, 4173, ["npm", "run", "dev", "--", "--hostname", "0.0.0.0", "--port", "4173"]); }
      catch (cause) { return { status: "failed", output: { phase: "preview", failureKind: classifyBuildFailure({ phase: "preview", stderr: cause instanceof Error ? cause.message : String(cause) }).kind, message: cause instanceof Error ? cause.message : "Preview startup failed", workspaceId, routes: project.routes, files: await this.sandbox.listFiles(workspaceId) } }; }
      if (!preview.url || !preview.processId) return { status: "failed", output: { phase: "preview", failureKind: "runtime", message: "Preview provider did not return a verified URL and process id", preview } };
      return { status: "success", output: { workspaceId, status: "built", routes: project.routes, files: await this.sandbox.listFiles(workspaceId), build, previewUrl: preview.url, previewProcessId: preview.processId } };
    } catch (cause) {
      return { status: "failed", output: { error: cause instanceof Error ? cause.message : "Build failed" } };
    }
  }
}
