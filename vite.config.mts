import { isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url'
import { solidPane, buildConfig } from 'solidos-toolkit/vite'
import { defineConfig } from 'vitest/config'

export default defineConfig({
    build: buildConfig({
        entry: "src/index.ts",

        // TODO remove these overrides once the following PR from solidos-toolkit has been merged:
        // https://github.com/SolidOS/toolkit/pull/6
        overrides: {
            rolldownOptions: {
                output: [
                    {
                        format: 'es',
                        preserveModules: true,
                        preserveModulesRoot: 'src',
                        entryFileNames: '[name].esm.js',
                    },
                    {
                        format: 'cjs',
                        preserveModules: true,
                        preserveModulesRoot: 'src',
                        entryFileNames: '[name].cjs.js',
                    },
                ],
                external(id: string) {
                    return (
                        !id.startsWith('~icons/') &&
                        !id.startsWith('@/') &&
                        !id.startsWith('.') &&
                        !isAbsolute(id)
                    );
                },
            },
        }
    }),
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
    plugins: solidPane({
        litDecoratorPaths: ['src/components'],
        sandbox: {
            subject: "https://testingsolidos.solidcommunity.net/profile/card#me",
            entry: "./src/dev.ts",
        }
    }),
    test: {
        environment: 'jsdom',
        setupFiles: ['test/setup.ts'],
        coverage: {
            include: ['src/**/*.[jt]s'],
        },
    },
});
