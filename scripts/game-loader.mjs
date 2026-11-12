import { registerHooks } from "node:module";
import { existsSync } from "node:fs";
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
      if (specifier.startsWith(".") && !/\.[a-z]+$/.test(specifier))
        return next(specifier + ".ts", context);
      throw e;
    }
  },
});
