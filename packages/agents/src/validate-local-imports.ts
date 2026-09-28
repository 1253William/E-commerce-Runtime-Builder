import ts from "typescript";

export interface ProjectIssue { code: string; file?: string; target?: string; message: string; severity: "error" | "warning"; fixable: boolean; }
export interface ProjectPreflightResult { valid: boolean; errors: ProjectIssue[]; warnings: ProjectIssue[]; created: string[]; normalized: string[]; }
export interface ProjectFile { path: string; content: string; }

export function stripTypeScriptFromJavaScript(file: ProjectFile): ProjectFile {
  if (!/\.jsx?$/.test(file.path)) return file;
  const source = ts.createSourceFile(file.path.replace(/\.jsx?$/, ".tsx"), file.content, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let hasTypeSyntax = false;
  const inspect = (node: ts.Node) => {
    if (ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node) || ts.isTypeAssertionExpression(node) || ts.isAsExpression(node) || ts.isSatisfiesExpression(node)) hasTypeSyntax = true;
    if (ts.isTypeNode(node) || (ts.isCallExpression(node) && Boolean(node.typeArguments?.length)) || (ts.isNewExpression(node) && Boolean(node.typeArguments?.length))) hasTypeSyntax = true;
    if ("type" in node && (node as ts.ParameterDeclaration | ts.VariableDeclaration | ts.FunctionLikeDeclaration).type) hasTypeSyntax = true;
    ts.forEachChild(node, inspect);
  };
  inspect(source);
  const parseErrors = (source as ts.SourceFile & { parseDiagnostics: readonly ts.Diagnostic[] }).parseDiagnostics;
  if (!hasTypeSyntax || parseErrors.length) return file;
  const converted = ts.transpileModule(file.content, { fileName: file.path.replace(/\.jsx?$/, ".tsx"), reportDiagnostics: true, compilerOptions: { jsx: ts.JsxEmit.Preserve, target: ts.ScriptTarget.ES2022 } });
  if (converted.diagnostics?.some((diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error)) return file;
  const output = ts.createSourceFile(file.path, converted.outputText, ts.ScriptTarget.Latest, true, file.path.endsWith(".jsx") ? ts.ScriptKind.JSX : ts.ScriptKind.JS);
  return (output as ts.SourceFile & { parseDiagnostics: readonly ts.Diagnostic[] }).parseDiagnostics.length ? file : { ...file, content: converted.outputText };
}

const extensions = [".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs", ".css", ".json"];
export function normalizeProjectPath(value: string): string {
  const path = value.replace(/\\/g, "/");
  if (!path || path.includes("\0") || path.startsWith("/") || /^[a-z]:/i.test(path) || path.split("/").some((part) => part === ".." || part === ".")) throw new Error(`Unsafe project path: ${value}`);
  return path.replace(/\/+/g, "/");
}
function resolveImport(from: string, specifier: string): string {
  const parts = from.split("/").slice(0, -1);
  for (const part of specifier.replace(/\\/g, "/").split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") { if (!parts.length) return ""; parts.pop(); } else parts.push(part);
  }
  return parts.join("/");
}
function hasPath(base: string, files: Set<string>): boolean {
  if (files.has(base)) return true;
  if (/\.[^/]+$/.test(base)) return extensions.some((ext) => files.has(base + ext));
  return [...extensions, ".module.css"].some((ext) => files.has(base + ext)) || extensions.slice(0, 6).some((ext) => files.has(`${base}/index${ext}`));
}
function sourceKind(path: string): ts.ScriptKind {
  return /\.tsx?$/.test(path) ? (path.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS) : path.endsWith(".jsx") ? ts.ScriptKind.JSX : ts.ScriptKind.JS;
}

export function rewriteResolvableRelativeImports(files: ProjectFile[], knownPaths: string[] = []): { files: ProjectFile[]; rewrites: string[] } {
  const available = new Set([...knownPaths.map((path) => path.replace(/\\/g, "/")), ...files.map((file) => file.path.replace(/\\/g, "/"))]);
  const rewrites: string[] = [];
  const updated = files.map((file) => {
    if (!/\.(?:js|jsx|ts|tsx|mjs|cjs)$/.test(file.path)) return file;
    const source = ts.createSourceFile(file.path, file.content, ts.ScriptTarget.Latest, true, sourceKind(file.path));
    const replacements: Array<{ start: number; end: number; value: string }> = [];
    const visit = (node: ts.Node) => {
      let literal: ts.StringLiteral | undefined;
      if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) literal = node.moduleSpecifier;
      else if (ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword || (ts.isIdentifier(node.expression) && node.expression.text === "require")) && node.arguments[0] && ts.isStringLiteral(node.arguments[0])) literal = node.arguments[0];
      if (literal?.text.startsWith(".") || literal?.text.startsWith("app/") || literal?.text.startsWith("@/")) {
        const rootAlias = literal.text.startsWith("app/") || literal.text.startsWith("@/");
        let resolved = rootAlias ? (literal.text.startsWith("@/") ? literal.text.slice(2) : literal.text) : resolveImport(file.path, literal.text);
        const escapedRoot = !resolved && !rootAlias;
        if (escapedRoot) resolved = literal.text.replace(/\\/g, "/").split("/").filter((part) => part && part !== "." && part !== "..").join("/");
        if (!resolved || (!rootAlias && !escapedRoot && hasPath(resolved, available))) { ts.forEachChild(node, visit); return; }
        const basename = resolved.split("/").at(-1) ?? "";
        const exactFile = /\.[^/]+$/.test(basename);
        const candidates = [...available].filter((candidate) => {
          if (rootAlias || escapedRoot) return candidate === resolved || candidate.startsWith(`${resolved}.`) || candidate.startsWith(`${resolved}/`) || candidate.endsWith(`/${resolved}`) || extensions.slice(0, 6).some((extension) => candidate === `${resolved}/index${extension}`);
          if (exactFile) return candidate.split("/").at(-1) === basename;
          const name = candidate.split("/").at(-1) ?? "";
          return extensions.some((extension) => name === `${basename}${extension}`) || extensions.slice(0, 6).some((extension) => candidate === `${resolved}/index${extension}`);
        });
        if (candidates.length === 1) {
          const path = candidates[0]!;
          const importPath = rootAlias || escapedRoot ? path.replace(/\.(?:js|jsx|ts|tsx|mjs|cjs)$/i, "") : path;
          const from = file.path.replace(/\\/g, "/").split("/").slice(0, -1);
          const to = importPath.split("/");
          while (from.length && to.length && from[0] === to[0]) { from.shift(); to.shift(); }
          const relative = [...from.map(() => ".."), ...to].join("/");
          const corrected = `${relative.startsWith(".") ? "" : "./"}${relative}`;
          const start = literal.getStart(source) + 1;
          replacements.push({ start, end: literal.getEnd() - 1, value: corrected });
          rewrites.push(`${file.path}: ${literal.text} -> ${corrected} (${path})`);
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
    let content = file.content;
    for (const replacement of replacements.sort((a, b) => b.start - a.start)) content = `${content.slice(0, replacement.start)}${replacement.value}${content.slice(replacement.end)}`;
    return content === file.content ? file : { ...file, content };
  });
  return { files: updated, rewrites };
}

export function preflightProject(input: { workspaceFiles: ProjectFile[]; generatedFiles?: ProjectFile[]; router?: "app" | "pages"; routes?: string[] }): ProjectPreflightResult {
  const errors: ProjectIssue[] = [], warnings: ProjectIssue[] = [], normalized: string[] = [];
  const all = new Map<string, string>();
  const workspaceSeen = new Map<string, string>();
  for (const item of input.workspaceFiles) {
    try {
      const path = normalizeProjectPath(item.path); normalized.push(path);
      if (workspaceSeen.has(path) && workspaceSeen.get(path) !== item.content) errors.push({ code: "duplicate-path", file: path, message: `Workspace contains colliding paths after normalization: ${path}`, severity: "error", fixable: false });
      else { workspaceSeen.set(path, item.content); all.set(path, item.content); }
    }
    catch (cause) { errors.push({ code: "unsafe-path", file: item.path, message: cause instanceof Error ? cause.message : "Unsafe path", severity: "error", fixable: false }); }
  }
  const duplicates = new Map<string, string>();
  for (const item of input.generatedFiles ?? []) {
    let path: string;
    try { path = normalizeProjectPath(item.path); }
    catch (cause) { errors.push({ code: "unsafe-path", file: item.path, message: cause instanceof Error ? cause.message : "Unsafe path", severity: "error", fixable: false }); continue; }
    const prior = duplicates.get(path);
    if (prior !== undefined && prior !== item.content) errors.push({ code: "duplicate-path", file: path, message: `Generated path ${path} was returned more than once with different contents`, severity: "error", fixable: false });
    else if (prior === undefined) duplicates.set(path, item.content);
    all.set(path, item.content); normalized.push(path);
  }
  const paths = new Set(all.keys());
  const routerFiles = [...paths].filter((p) => /^(app|pages)\//.test(p));
  const routers = new Set(routerFiles.map((p) => p.startsWith("app/") ? "app" : "pages"));
  if (routers.size > 1) errors.push({ code: "mixed-router", message: "Application contains both app/ and pages/ route trees", severity: "error", fixable: true });
  if (input.router && routers.size && !routers.has(input.router)) errors.push({ code: "router-mismatch", message: `Generated files do not match declared ${input.router} router`, severity: "error", fixable: true });
  if (!paths.has("package.json")) errors.push({ code: "missing-package", target: "package.json", message: "Application is missing package.json", severity: "error", fixable: true });
  const selectedRouter = input.router ?? (routers.has("app") ? "app" : "pages");
  if (selectedRouter === "app" && !["app/page.js", "app/page.jsx", "app/page.ts", "app/page.tsx"].some((p) => paths.has(p))) errors.push({ code: "missing-entry", message: "App Router application is missing an app/page entry route", severity: "error", fixable: true });
  if (selectedRouter === "app" && !["app/layout.js", "app/layout.jsx", "app/layout.ts", "app/layout.tsx"].some((p) => paths.has(p))) errors.push({ code: "missing-layout", target: "app/layout", message: "App Router application requires a root app/layout file", severity: "error", fixable: true });
  if (selectedRouter === "pages" && !["pages/index.js", "pages/index.jsx", "pages/index.ts", "pages/index.tsx"].some((p) => paths.has(p))) errors.push({ code: "missing-entry", message: "Pages Router application is missing a pages/index entry route", severity: "error", fixable: true });
  const styleOwner = selectedRouter === "app" ? [...paths].filter((path) => /^app\/layout\.(?:js|jsx|ts|tsx)$/.test(path)) : [...paths].filter((path) => /^pages\/_app\.(?:js|jsx|ts|tsx)$/.test(path));
  const hasGlobalStyle = styleOwner.some((path) => {
    const source = ts.createSourceFile(path, all.get(path) ?? "", ts.ScriptTarget.Latest, true, sourceKind(path));
    return source.statements.some((statement) => ts.isImportDeclaration(statement) && ts.isStringLiteral(statement.moduleSpecifier) && /\.css(?:$|\?)/.test(statement.moduleSpecifier.text) && !/\.module\.css(?:$|\?)/.test(statement.moduleSpecifier.text));
  });
  if (styleOwner.length && !hasGlobalStyle) errors.push({ code: "missing-global-style", file: styleOwner[0], message: `${selectedRouter === "app" ? "app/layout" : "pages/_app"} must import a global stylesheet`, severity: "error", fixable: true });
  for (const route of input.routes ?? []) {
    if (!route.startsWith("/") || route.startsWith("/api/")) continue;
    const relative = route === "/" ? "index" : route.replace(/^\//, "").split("/").map((segment) => segment.startsWith(":") ? `[${segment.slice(1)}]` : segment).join("/");
    const routeBase = selectedRouter === "app" ? (route === "/" ? "app/page" : `app/${relative}/page`) : `pages/${relative}`;
    const routeExists = extensions.slice(0, 6).some((ext) => paths.has(`${routeBase}${ext}`)) || extensions.slice(0, 6).some((ext) => paths.has(`${routeBase}/index${ext}`));
    if (!routeExists) errors.push({ code: "missing-route", target: routeBase, message: `Declared route ${route} has no ${selectedRouter === "app" ? "App Router page" : "Pages Router file"} at ${routeBase}`, severity: "error", fixable: true });
  }
  const packageContent = all.get("package.json");
  if (packageContent) { try { const manifest = JSON.parse(packageContent) as { scripts?: Record<string, unknown> }; if (!manifest || typeof manifest !== "object" || !manifest.scripts || manifest.scripts.build !== "next build") throw new Error("invalid scripts"); } catch { errors.push({ code: "invalid-package", file: "package.json", message: "package.json is invalid or missing the required next build script", severity: "error", fixable: true }); } }
  for (const [path, content] of all) {
    if (!/\.(?:js|jsx|ts|tsx|mjs|cjs)$/.test(path)) continue;
    const source = ts.createSourceFile(path, content, ts.ScriptTarget.Latest, true, sourceKind(path));
    if (/\.jsx?$/.test(path)) {
      let hasTypes = false;
      const inspectTypes = (node: ts.Node) => {
        if (ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node) || ts.isTypeAssertionExpression(node) || ts.isAsExpression(node) || ts.isSatisfiesExpression(node) || ts.isTypeNode(node)) hasTypes = true;
        if ("type" in node && (node as ts.ParameterDeclaration | ts.VariableDeclaration | ts.FunctionLikeDeclaration).type) hasTypes = true;
        if ((ts.isCallExpression(node) || ts.isNewExpression(node)) && node.typeArguments?.length) hasTypes = true;
        ts.forEachChild(node, inspectTypes);
      };
      inspectTypes(source);
      if (hasTypes) errors.push({ code: "typescript-in-js", file: path, message: `TypeScript syntax appears in JavaScript file ${path}`, severity: "error", fixable: true });
    }
    const imports: string[] = [];
    const cssImports: Array<{ target: string; classes: Set<string> }> = [];
    const usedByObject = new Map<string, Set<string>>();
    const visit = (node: ts.Node) => {
      if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) imports.push(node.moduleSpecifier.text);
      if (ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword || (ts.isIdentifier(node.expression) && node.expression.text === "require")) && node.arguments[0] && ts.isStringLiteral(node.arguments[0])) imports.push(node.arguments[0].text);
      if (ts.isPropertyAccessExpression(node) && ts.isIdentifier(node.expression)) {
        const names = usedByObject.get(node.expression.text) ?? new Set<string>(); names.add(node.name.text); usedByObject.set(node.expression.text, names);
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
    for (const specifier of imports.filter((value) => value.startsWith(".") || value.startsWith("app/") || value.startsWith("@/"))) {
      const target = specifier.startsWith("app/") ? specifier : specifier.startsWith("@/") ? specifier.slice(2) : resolveImport(path, specifier);
      if (!target || !hasPath(target, paths)) errors.push({ code: "missing-module", file: path, target, message: `${path} imports ${specifier}, but no matching workspace file exists`, severity: "error", fixable: true });
      if (/\.module\.css$/.test(target) && paths.has(target)) {
        const specifier = imports.find((value) => (value.startsWith(".") ? resolveImport(path, value) : value) === target);
        if (specifier) {
          const declaration = [...source.statements].find((statement): statement is ts.ImportDeclaration => ts.isImportDeclaration(statement) && ts.isStringLiteral(statement.moduleSpecifier) && statement.moduleSpecifier.text === specifier);
          const clause = declaration?.importClause;
          const local = clause?.name?.text ?? "styles";
          const cssClasses = new Set([...(all.get(target) ?? "").matchAll(/\.([\w-]+)(?=[\s:{,.#[])/g)].map((match) => match[1]!));
          cssImports.push({ target, classes: new Set([...(usedByObject.get(local) ?? [])].filter((name) => !cssClasses.has(name))) });
        }
      }
    }
    const clientHooks = new Set(["useState", "useEffect", "useReducer", "useRef", "useContext", "useRouter", "usePathname", "useSearchParams", "useFormState", "useActionState"]);
    let usesClientFeature = false;
    const inspectClientHooks = (node: ts.Node) => {
      if (ts.isCallExpression(node)) {
        const name = ts.isIdentifier(node.expression) ? node.expression.text : ts.isPropertyAccessExpression(node.expression) ? node.expression.name.text : "";
        if (clientHooks.has(name)) usesClientFeature = true;
      }
      if (ts.isJsxAttribute(node) && ts.isIdentifier(node.name) && /^on[A-Z]/.test(node.name.text) && node.initializer) usesClientFeature = true;
      ts.forEachChild(node, inspectClientHooks);
    };
    inspectClientHooks(source);
    const firstStatement = source.statements[0];
    const hasClientDirective = Boolean(firstStatement && ts.isExpressionStatement(firstStatement) && ts.isStringLiteral(firstStatement.expression) && firstStatement.expression.text === "use client");
    if (selectedRouter === "app" && path.startsWith("app/") && /\.(?:js|jsx|ts|tsx)$/.test(path) && usesClientFeature && !hasClientDirective) {
      errors.push({ code: "next-client-boundary", file: path, message: `${path} uses a client-only React/Next feature but is missing the "use client" directive`, severity: "error", fixable: true });
    }
    for (const css of cssImports) for (const name of css.classes) warnings.push({ code: "css-class-mismatch", file: path, target: css.target, message: `${path} references styles.${name}, which is not declared in ${css.target}`, severity: "warning", fixable: true });
  }
  return { valid: errors.length === 0, errors, warnings, created: [], normalized };
}

export async function validateLocalImports(sandbox: { listFiles(id: string): Promise<string[]>; readFile(id: string, path: string): Promise<string>; writeFile?(id: string, path: string, content: string): Promise<void> }, workspaceId: string, _writtenFiles: string[] = [], options: { router?: "app" | "pages"; routes?: string[] } = {}) {
  const paths = await sandbox.listFiles(workspaceId);
  const sourcePaths = paths.filter((path) => !/(?:^|\/)(?:node_modules|\.next|\.git|dist|coverage)\//.test(path) && /\.(?:js|jsx|ts|tsx|mjs|cjs|css|json)$/.test(path));
  const files = await Promise.all(sourcePaths.map(async (path) => ({ path, content: await sandbox.readFile(workspaceId, path) })));
  const rewrites = rewriteResolvableRelativeImports(files, paths);
  if (rewrites.rewrites.length && sandbox.writeFile) {
    for (const file of rewrites.files) if (files.find((prior) => prior.path === file.path)?.content !== file.content) await sandbox.writeFile(workspaceId, file.path, file.content);
    for (let index = 0; index < files.length; index++) files[index] = rewrites.files[index]!;
  }
  let result = preflightProject({ workspaceFiles: files, ...options });
  const created: string[] = [];
  if (sandbox.writeFile) {
    let fixedClientBoundaries = false;
    for (const issue of result.errors.filter((entry) => entry.code === "next-client-boundary" && entry.file)) {
      const file = files.find((entry) => entry.path === issue.file);
      if (!file) continue;
      file.content = `"use client";\n${file.content}`;
      await sandbox.writeFile(workspaceId, file.path, file.content);
      fixedClientBoundaries = true;
    }
    if (fixedClientBoundaries) result = preflightProject({ workspaceFiles: files, ...options });
    for (const issue of result.errors.filter((entry) => entry.code === "missing-module" && entry.target?.endsWith(".module.css"))) {
      const importer = files.find((file) => file.path === issue.file);
      if (!importer || paths.includes(issue.target!)) continue;
      const source = ts.createSourceFile(importer.path, importer.content, ts.ScriptTarget.Latest, true, sourceKind(importer.path));
      const declaration = source.statements.find((statement): statement is ts.ImportDeclaration => ts.isImportDeclaration(statement) && ts.isStringLiteral(statement.moduleSpecifier) && resolveImport(importer.path, statement.moduleSpecifier.text) === issue.target);
      const binding = declaration?.importClause?.name?.text;
      if (!binding) continue;
      const names = new Set<string>();
      const findClasses = (node: ts.Node) => {
        if (ts.isPropertyAccessExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === binding) names.add(node.name.text);
        ts.forEachChild(node, findClasses);
      };
      findClasses(source);
      if (!names.size) continue;
      const rules = [...names].map((name) => `.${name.replace(/[^\w-]/g, "")} {}`).join("\n");
      await sandbox.writeFile(workspaceId, issue.target!, `${rules}\n`);
      paths.push(issue.target!);
      files.push({ path: issue.target!, content: `${rules}\n` });
      created.push(issue.target!);
    }
    if (created.length) result = preflightProject({ workspaceFiles: files, ...options });
  }
  result.created.push(...created);
  return { created: result.created, errors: result.errors.map((issue) => issue.message), warnings: result.warnings.map((issue) => issue.message), issues: result };
}
