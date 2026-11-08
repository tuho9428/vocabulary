// Use the existing TypeScript compiler to render real TSX components in Node's
// test runner, without adding a browser or another test-framework dependency.
import { registerHooks } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { resolve } from "node:path";
import ts from "typescript";

const sourceRoot = fileURLToPath(new URL("../../src/", import.meta.url));
registerHooks({
  resolve(specifier, context, nextResolve) {
    const base = specifier.startsWith("@/")
      ? pathToFileURL(resolve(sourceRoot, specifier.slice(2)))
      : specifier.startsWith(".") && context.parentURL
        ? new URL(specifier, context.parentURL)
        : undefined;
    if (base)
      for (const extension of [".ts", ".tsx"]) {
        const file = new URL(base.href + extension);
        if (existsSync(file)) return nextResolve(file.href, context);
      }
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (!url.endsWith(".tsx")) return nextLoad(url, context);
    return {
      format: "module",
      shortCircuit: true,
      source: ts.transpileModule(readFileSync(new URL(url), "utf8"), {
        fileName: fileURLToPath(url),
        compilerOptions: {
          jsx: ts.JsxEmit.ReactJSX,
          target: ts.ScriptTarget.ES2022,
          module: ts.ModuleKind.ESNext,
        },
      }).outputText,
    };
  },
});
