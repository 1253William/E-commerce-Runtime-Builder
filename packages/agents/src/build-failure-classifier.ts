import { createHash } from "node:crypto";

export type BuildFailureKind = "missing-module" | "syntax" | "type-error" | "next-router" | "dependency" | "package-manifest" | "runtime" | "network" | "unknown";
export interface BuildFailure { kind: BuildFailureKind; fingerprint: string; message: string; file?: string; line?: number; target?: string; targets: string[]; }

export function classifyBuildFailure(input: { stdout?: string; stderr?: string; phase?: string }): BuildFailure {
  const output = `${input.stdout ?? ""}\n${input.stderr ?? ""}`;
  const file = output.match(/(?:^|[\s(])(?:\.\/|\/workspace\/)?((?:[\w@.-]+\/)+[\w@.-]+\.[cm]?[jt]sx?)(?::(\d+)(?::\d+)?)?/im);
  const rawTargets = [
    ...[...output.matchAll(/(?:Can't resolve|Cannot find module)\s+['"`]?([^\s'"`]+)/gi)].map((match) => match[1]!),
    ...[...output.matchAll(/module not found\s*:\s*(?!Can't resolve\b)['"`]?([^\s'"`]+)/gi)].map((match) => match[1]!),
  ]
    .concat([...output.matchAll(/imports ([^\s,]+), but no matching workspace file/gi)].map((match) => match[1]!));
  const rawTarget = rawTargets[0];
  let target = rawTarget;
  if (rawTarget?.startsWith(".") && file) {
    const parts = file[1]!.split("/").slice(0, -1);
    let safe = true;
    for (const part of rawTarget.replace(/\\/g, "/").split("/")) {
      if (!part || part === ".") continue;
      if (part === "..") { if (!parts.length) { safe = false; break; } parts.pop(); }
      else parts.push(part);
    }
    if (safe) target = parts.join("/");
  }
  let kind: BuildFailureKind = "unknown";
  if (/ENETUNREACH|ETIMEDOUT|ECONNRESET|EAI_AGAIN|network|fetch failed/i.test(output)) kind = "network";
  else if (/ERESOLVE|ETARGET|npm ERR!|could not resolve dependency/i.test(output) || input.phase === "install") kind = "dependency";
  else if (/typescript syntax appears in javascript|Unexpected token|SyntaxError|Parsing error|Expected.{0,30}(?:token|expression|\})/i.test(output)) kind = "syntax";
  else if (/Module not found|Can't resolve|Cannot find module|imports? .{1,160}, but no matching workspace file|missing-module/i.test(output)) kind = "missing-module";
  else if (/next-client-boundary|client-only React\/Next (?:hook|feature)|use client|You're importing a component that needs|Event handlers cannot be passed to Client Component props/i.test(output)) kind = "next-router";
  else if (/mixed-router|both app\/ and pages\/|router-mismatch|app router|pages router|_document|metadata/i.test(output)) kind = "next-router";
  else if (/Type error:|TS\d{4}:|type error/i.test(output)) kind = "type-error";
  else if (/package\.json|JSONParseError|EJSONPARSE|unsafe project path|duplicate path|manifest files were not generated/i.test(output)) kind = "package-manifest";
  else if (/runtime error|uncaught|ReferenceError|TypeError/i.test(output)) kind = "runtime";
  const message = output.trim().slice(-1200) || `${input.phase ?? "build"} failed`;
  const normalized = message.toLowerCase().replace(/\s+/g, " ").replace(/\b\d+\b/g, "#");
  const fingerprint = createHash("sha256").update([kind, normalized, file?.[1] ?? "", file?.[2] ?? "", target ?? ""].join("|" )).digest("hex").slice(0, 20);
  const targets = [...new Set(rawTargets.map((value) => {
    if (!value.startsWith("." ) || !file) return value.startsWith("@/") ? value.slice(2) : value;
    const parts = file[1]!.split("/").slice(0, -1);
    let safe = true;
    for (const part of value.replace(/\\/g, "/").split("/")) { if (!part || part === ".") continue; if (part === "..") { if (!parts.length) { safe = false; break; } parts.pop(); } else parts.push(part); }
    return safe ? parts.join("/") : value;
  }))];
  return { kind, fingerprint, message, targets, ...(file ? { file: file[1]!.replace(/\\/g, "/"), line: Number(file[2]) || undefined } : {}), ...(target ? { target } : {}) };
}
