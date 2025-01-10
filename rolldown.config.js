// @ts-check
import fs from "node:fs"
import { defineConfig } from "rolldown"
import { isBuiltin } from "node:module"
import UnpluginIsolatedDecl from "unplugin-isolated-decl/rolldown"

const pkg = JSON.parse(fs.readFileSync("./package.json", "utf8"))

export default defineConfig({
  input: ["src/cli.ts", "src/index.ts"],
  output: {
    dir: "dist",
    format: "esm",
    banner(chunk) {
      if (chunk.fileName === "cli.js") {
        return `#!/usr/bin/env node`
      }
      return ""
    },
  },
  platform: "node",
  external: Object.keys(pkg.dependencies)
    .map((name) => [name, new RegExp(`^${name}/`)])
    .flat(),
  plugins: [
    UnpluginIsolatedDecl({ transformer: "typescript" }),
    {
      // make sure every node builtin module is prefixed with node:
      name: "add-node-prefix",
      renderChunk(code) {
        return code.replace(/import (.+) from "(.+)"/g, (m, m1, m2) => {
          if (isBuiltin(m2) && !m2.startsWith("node:")) {
            return `import ${m1} from "node:${m2}"`
          }
          return m
        })
      },
      resolveId(id) {
        if (isBuiltin(id) && !id.startsWith("node:")) {
          return {
            id: `node:${id}`,
            external: true,
          }
        }
      },
    },
  ],
})
