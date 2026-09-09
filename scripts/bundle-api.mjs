import { mkdir } from 'node:fs/promises'
import { build } from 'esbuild'

await mkdir('dist-api', { recursive: true })

await build({
  entryPoints: ['server/index.ts'],
  outfile: 'dist-api/app.mjs',
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  logLevel: 'info',
  sourcemap: false,
  legalComments: 'none',
  banner: {
    js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);",
  },
})
