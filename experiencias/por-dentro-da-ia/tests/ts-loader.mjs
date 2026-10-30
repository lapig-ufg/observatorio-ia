import { existsSync } from "node:fs";
import { dirname, resolve as resolvePath } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

/**
 * Node's type stripping understands .ts files, but not extensionless imports.
 * This tiny loader lets the test runner resolve the same imports Vite handles.
 */
export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith(".") && !/\.[a-z]+$/i.test(specifier)) {
    const parent = context.parentURL ? dirname(fileURLToPath(context.parentURL)) : process.cwd();
    for (const extension of [".ts", ".tsx", ".js", ".mjs"]) {
      const file = resolvePath(parent, `${specifier}${extension}`);
      if (existsSync(file)) return nextResolve(pathToFileURL(file).href, context);
    }
  }
  return nextResolve(specifier, context);
}
