import { registerHooks } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
const SRC = new URL("../src/", import.meta.url);
// '@/x' mirrors the tsconfig/vite alias so UI modules (hearth screens) load under the node test runner.
function aliasTarget(spec) {
  const rel = spec.slice(2);
  for (const ext of ["", ".ts", ".tsx", "/index.ts", "/index.tsx"]) {
    const u = new URL(rel + ext, SRC);
    if (existsSync(u) && !u.pathname.endsWith("/")) return u.href;
  }
  return new URL(rel, SRC).href;
}
registerHooks({
  resolve(specifier, context, next) {
    if (specifier.startsWith("@/")) return next(aliasTarget(specifier), context);
    try {
      return next(specifier, context);
    } catch (e) {
      if (specifier.startsWith(".") && !/\.[a-z]+$/.test(specifier)) {
        // extensionless relative import: .ts first, then a React .tsx component (e.g. ./SkinPicker)
        const base = context.parentURL ? new URL(specifier, context.parentURL) : null;
        if (base && !existsSync(new URL(base.href + ".ts")) && existsSync(new URL(base.href + ".tsx")))
          return next(specifier + ".tsx", context);
        return next(specifier + ".ts", context);
      }
      throw e;
    }
  },
  // Vite bundles stylesheets; under the node test runner a UI module's `import './x.css'` is a no-op.
  load(url, context, next) {
    if (url.endsWith(".css")) return { format: "module", source: "export default {};", shortCircuit: true };
    // Node strips .ts types but cannot load .tsx; transpile JSX components with the repo's typescript so UI tests can import them.
    if (url.startsWith("file:") && url.endsWith(".tsx")) {
      const ts = createRequire(import.meta.url)("typescript");
      const out = ts.transpileModule(readFileSync(new URL(url), "utf8"), { fileName: url, compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX } }).outputText;
      return { format: "module", source: out, shortCircuit: true };
    }
    return next(url, context);
  },
});
