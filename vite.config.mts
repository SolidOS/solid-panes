import { fileURLToPath } from 'node:url'
import type { PluginOption } from 'vite'
import { solidPane, buildConfig } from 'solidos-toolkit/vite'
import { defineConfig } from 'vitest/config'

// `vite build --watch` re-runs every plugin's generateBundle on each change.
// solidos-toolkit's solidPane() bundles unplugin-dts (adds ~4-5s per rebuild)
// and buildConfig() emits both ESM and CJS outputs (two rebuild cycles per
// change — noisy for downstream watchers like mashlib/webpack). During watch
// we strip both so the inner loop is fast and downstream sees a single wave
// of file writes. Full builds (npm run build) are unaffected.
const isWatch = process.argv.includes('--watch')

const build = buildConfig({ entry: 'src/index.ts' })
if (isWatch && build && Array.isArray(build.rolldownOptions?.output)) {
    build.rolldownOptions.output = build.rolldownOptions.output.filter(
        (o: { format?: string }) => o.format === 'es',
    )
}

type ConcretePlugin = Extract<PluginOption, { name: string }>

// solidPane() returns a nested plugin array that includes an ASYNC plugin
// factory (@rolldown/plugin-babel is a Promise). The previous flatten helper
// dropped Promise entries, which silently removed the babel plugin — leaving
// TC39 decorator / `accessor` syntax in the built output (Header.esm.js etc.)
// and breaking downstream consumers (mashlib's babel-loader). Await Promises
// before flattening so every plugin makes it into the final list.
const flattenPlugins = async (input: unknown): Promise<ConcretePlugin[]> => {
    if (!input) return []
    const resolved = await input
    if (!resolved) return []
    if (Array.isArray(resolved)) {
        const nested = await Promise.all(resolved.map(flattenPlugins))
        return nested.flat()
    }
    return [resolved as ConcretePlugin]
}

const plugins = (await flattenPlugins(
    solidPane({
        litDecoratorPaths: ['src/components'],
        sandbox: {
            subject: 'https://testingsolidos.solidcommunity.net/profile/card#me',
            entry: './src/dev.ts',
        },
    }),
)).filter((p) => !(isWatch && /dts/i.test(p.name)))

export default defineConfig({
    build,
    resolve: {
        tsconfigPaths: true,

        // FIXME drop aliases once the dependencies support ESM exports (only necessary for dev sandbox)
        alias: {
            '$rdf': 'rdflib',
            'solid-logic': fileURLToPath(new URL('./node_modules/solid-logic/dist/solid-logic.esm.js', import.meta.url)),
            SolidLogic: fileURLToPath(new URL('./node_modules/solid-logic/dist/solid-logic.esm.js', import.meta.url)),
            UI: fileURLToPath(new URL('./node_modules/solid-ui/dist/index.esm.js', import.meta.url)),
        },
    },
    plugins,
    test: {
        environment: 'jsdom',
        setupFiles: ['test/setup.ts'],
        coverage: {
            include: ['src/**/*.[jt]s'],
        },
    },
});
