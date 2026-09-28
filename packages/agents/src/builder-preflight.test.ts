import assert from "node:assert/strict";
import test from "node:test";
import { classifyBuildFailure } from "./build-failure-classifier.js";
import { preflightProject, normalizeProjectPath, rewriteResolvableRelativeImports, stripTypeScriptFromJavaScript, validateLocalImports } from "./validate-local-imports.js";

const base = [{ path: "package.json", content: JSON.stringify({ scripts: { build: "next build" } }) }, { path: "pages/index.js", content: "export default function Home() { return null }" }];

test("preflight resolves extensionless and index imports across the complete workspace", () => {
  const result = preflightProject({ workspaceFiles: [base[0]!, { path: "pages/index.js", content: 'import Card from "../components"; export default Card' }, { path: "components/index.tsx", content: "export default function Card() { return null }" }] });
  assert.equal(result.errors.some((issue) => issue.code === "missing-module"), false);
});
test("preflight detects missing static and dynamic imports", () => {
  const result = preflightProject({ workspaceFiles: [base[0]!, { path: "pages/index.js", content: 'import "./absent.css"; const load = () => import("./missing")' }] });
  assert.equal(result.errors.filter((issue) => issue.code === "missing-module").length, 2);
});
test("preflight reports duplicate generated paths and mixed routers", () => {
  const result = preflightProject({ workspaceFiles: [], generatedFiles: [...base, { path: "app/page.tsx", content: "export default function Page() { return null }" }, { path: "pages/index.js", content: "different" }] });
  assert.ok(result.errors.some((issue) => issue.code === "duplicate-path"));
  assert.ok(result.errors.some((issue) => issue.code === "mixed-router"));
});
test("preflight requires files for every declared route", () => {
  const result = preflightProject({ workspaceFiles: base, router: "pages", routes: ["/", "/products", "/products/[id]"] });
  assert.equal(result.errors.filter((issue) => issue.code === "missing-route").length, 2);
});
test("unique existing modules repair an incorrectly relative import path", () => {
  const result = rewriteResolvableRelativeImports([{ path: "app/cart/page.tsx", content: 'import Cart from "../components/Cart"; export default Cart' }], ["components/Cart.tsx"]);
  assert.match(result.files[0]!.content, /\.\.\/\.\.\/components\/Cart\.tsx/);
  assert.equal(result.rewrites.length, 1);
});

test("rewrite fixes imports from nested routes to root components", () => {
  const result = rewriteResolvableRelativeImports([{ path: "pages/products/index.js", content: "import ProductCard from '../components/ProductCard'; export default ProductCard" }, { path: "components/ProductCard.js", content: "export default function ProductCard() { return null }" }]);
  assert.match(result.files[0]!.content, /\.\.\/\.\.\/components\/ProductCard\.js/);
  assert.equal(result.rewrites.length, 1);
});

test("rewrite resolves app-root import aliases without requiring a tsconfig path alias", () => {
  const result = rewriteResolvableRelativeImports([{ path: "app/page.tsx", content: 'import ProductCard from "app/components/ProductCard";' }, { path: "app/components/ProductCard.tsx", content: "export default function ProductCard() { return null }" }]);
  assert.match(result.files[0]!.content, /from "\.\/components\/ProductCard"/);
  assert.equal(result.rewrites.length, 1);
  const escapedRoot = rewriteResolvableRelativeImports([{ path: "app/page.tsx", content: 'import ProductCard from "../../components/ProductCard";' }, { path: "components/ProductCard.tsx", content: "export default function ProductCard() { return null }" }]);
  assert.match(escapedRoot.files[0]!.content, /from "\.\.\/components\/ProductCard"/);
});

test("rewrite resolves @/ app-root stylesheet aliases", () => {
  const result = rewriteResolvableRelativeImports([{ path: "app/layout.tsx", content: 'import "@/app/globals.css";' }], ["app/globals.css"]);
  assert.match(result.files[0]!.content, /from "\.\/globals\.css"|import "\.\/globals\.css"/);
  assert.equal(result.rewrites.length, 1);
});

test("preflight reports missing @/ imports with a clean root-relative target", () => {
  const result = preflightProject({ router: "app", workspaceFiles: [], generatedFiles: [
    { path: "package.json", content: JSON.stringify({ scripts: { build: "next build" } }) },
    { path: "app/layout.tsx", content: 'import "./globals.css"; import Footer from "@/components/Footer"; export default function Layout({ children }) { return <html><body><Footer />{children}</body></html> }' },
    { path: "app/page.tsx", content: "export default function Page() { return null }" },
    { path: "app/globals.css", content: "body {}" },
  ] });
  assert.ok(result.errors.some((issue) => issue.code === "missing-module" && issue.target === "components/Footer"));
});

test("preflight catches missing App Router client boundaries", () => {
  const result = preflightProject({ router: "app", workspaceFiles: [], generatedFiles: [
    { path: "package.json", content: JSON.stringify({ scripts: { build: "next build" } }) },
    { path: "app/layout.tsx", content: 'import "./globals.css"; export default function Layout({ children }) { return <html><body>{children}</body></html> }' },
    { path: "app/page.tsx", content: 'import { useState } from "react"; export default function Page() { const [x] = useState(0); return <p>{x}</p> }' },
    { path: "app/contact/page.tsx", content: 'export default function Contact() { return <form onSubmit={(event) => event.preventDefault()} /> }' },
    { path: "app/globals.css", content: "body {}" },
  ] });
  assert.ok(result.errors.some((issue) => issue.code === "next-client-boundary" && issue.file === "app/page.tsx"));
  assert.ok(result.errors.some((issue) => issue.code === "next-client-boundary" && issue.file === "app/contact/page.tsx"));
});

test("local import validation deterministically fixes missing App Router client directives", async () => {
  const files = new Map([
    ["package.json", JSON.stringify({ scripts: { build: "next build" } })],
    ["app/layout.tsx", 'import "./globals.css"; export default function Layout({ children }) { return <html><body>{children}</body></html> }'],
    ["app/page.tsx", 'import { useState } from "react"; export default function Page() { const [x] = useState(0); return <p>{x}</p> }'],
    ["app/contact/page.tsx", 'export default function Contact() { return <form onSubmit={(event) => event.preventDefault()} /> }'],
    ["app/globals.css", "body {}"],
  ]);
  const sandbox = {
    async listFiles() { return [...files.keys()]; },
    async readFile(_id: string, path: string) { return files.get(path) ?? ""; },
    async writeFile(_id: string, path: string, content: string) { files.set(path, content); },
  };
  const result = await validateLocalImports(sandbox, "workspace", [], { router: "app", routes: ["/"] });
  assert.deepEqual(result.errors, []);
  assert.match(files.get("app/page.tsx")!, /^"use client";/);
  assert.match(files.get("app/contact/page.tsx")!, /^"use client";/);
});
test("paths normalize windows separators and reject traversal or absolute paths", () => {
  assert.equal(normalizeProjectPath("app\\page.tsx"), "app/page.tsx");
  assert.throws(() => normalizeProjectPath("../secret.ts"));
  assert.throws(() => normalizeProjectPath("C:\\tmp\\secret.ts"));
});
test("failure classification separates source, package, and infrastructure errors", () => {
  assert.equal(classifyBuildFailure({ stderr: "Module not found: Can't resolve './x'" }).kind, "missing-module");
  assert.equal(classifyBuildFailure({ stderr: "SyntaxError: Unexpected token" }).kind, "syntax");
  assert.equal(classifyBuildFailure({ stderr: "npm ERR! ERESOLVE unable to resolve dependency tree", phase: "install" }).kind, "dependency");
  assert.equal(classifyBuildFailure({ stderr: "connect ETIMEDOUT" }).kind, "network");
  assert.equal(classifyBuildFailure({ stderr: "something odd" }).kind, "unknown");
  const boundary = classifyBuildFailure({ stderr: "▲ Next.js 15.5.26\n./app/cart/page.tsx\nYou're importing a component that needs useState" });
  assert.equal(boundary.kind, "next-router");
  assert.equal(boundary.file, "app/cart/page.tsx");
  assert.equal(classifyBuildFailure({ stderr: "Error occurred prerendering page \"/contact\"\nEvent handlers cannot be passed to Client Component props" }).kind, "next-router");
  assert.equal(classifyBuildFailure({ stderr: "app/cart/page.tsx imports app/components/CartItem, but no matching workspace file exists" }).target, "app/components/CartItem");
  assert.equal(classifyBuildFailure({ stderr: "app/cart/page.tsx imports ../../lib/cart, but no matching workspace file exists" }).target, "lib/cart");
  const multiple = classifyBuildFailure({ stderr: "Module not found: Can't resolve '@/components/Header'\nModule not found: Can't resolve './Footer'\n./app/layout.tsx" });
  assert.deepEqual(multiple.targets, ["components/Header", "app/Footer"]);
});
test("safe TypeScript annotations in JavaScript are mechanically stripped while syntax errors remain", () => {
  const converted = stripTypeScriptFromJavaScript({ path: "pages/_app.js", content: "export default function App({ Component, pageProps }: AppProps) { return <Component {...pageProps} /> }" });
  assert.doesNotMatch(converted.content, /:\s*AppProps/);
  const invalid = stripTypeScriptFromJavaScript({ path: "pages/_app.js", content: "export default function App() => { return null }" });
  assert.match(invalid.content, /function App\(\) =>/);
  const generic = stripTypeScriptFromJavaScript({ path: "components/Contact.js", content: "export default function Contact() { return useState<ContactForm>({ name: '' }) }" });
  assert.doesNotMatch(generic.content, /useState<ContactForm>/);
});

test("preflight warns when CSS module class references do not exist", () => {
  const result = preflightProject({ workspaceFiles: [base[0]!, { path: "pages/index.js", content: 'import styles from "./Home.module.css"; export default () => <h1 className={styles.hero}/>' }, { path: "pages/Home.module.css", content: ".title { color: red }" }] });
  assert.ok(result.warnings.some((issue) => issue.code === "css-class-mismatch" && issue.message.includes("hero")));
});

test("preflight catches TS syntax in JavaScript by AST and supports explicit extensions", () => {
  const result = preflightProject({ workspaceFiles: [base[0]!, { path: "pages/index.js", content: 'import Card from "../components/Card.tsx"; const x: string = "ok"; export default Card' }, { path: "components/Card.tsx", content: "export default function Card() { return null }" }] });
  assert.ok(result.errors.some((issue) => issue.code === "typescript-in-js"));
  assert.equal(result.errors.some((issue) => issue.code === "missing-module"), false);
});

test("preflight enforces App Router root layout and allows complete Pages Router app", () => {
  const app = preflightProject({ workspaceFiles: [{ path: "package.json", content: '{"scripts":{"build":"next build"}}' }, { path: "app/page.tsx", content: "export default function Page() { return null }" }], router: "app" });
  assert.ok(app.errors.some((issue) => issue.code === "missing-layout"));
  const pages = preflightProject({ workspaceFiles: [base[0]!, base[1]!, { path: "pages/_app.js", content: 'import "../styles/globals.css"; export default function App({ Component, pageProps }) { return <Component {...pageProps}/> }' }, { path: "styles/globals.css", content: "body { margin: 0 }" }], router: "pages", routes: ["/"] });
  assert.equal(pages.valid, true);
});

test("workspace path collisions after Windows normalization are rejected", () => {
  const result = preflightProject({ workspaceFiles: [{ path: "pages\\index.js", content: "a" }, { path: "pages/index.js", content: "b" }] });
  assert.ok(result.errors.some((issue) => issue.code === "duplicate-path"));
});
