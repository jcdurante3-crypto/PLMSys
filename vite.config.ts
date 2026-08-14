import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, type Plugin } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = path.resolve(__dirname, './src');

function aliasLoggerPlugin(): Plugin {
  return {
    name: 'vite-plugin-alias-logger',
    buildStart() {
      console.log(`[vite-build] Alias resolution mapped: '@' -> '${srcDir}'`);
    },
    async resolveId(source, importer, options) {
      if (source.startsWith('@/')) {
        const resolved = await this.resolve(source, importer, { skipSelf: true, ...options });
        if (resolved) {
          console.log(`[vite-resolve:SUCCESS] '${source}' (imported by ${importer || 'entry'}) -> '${resolved.id}'`);
        } else {
          console.error(`[vite-resolve:FAIL] FAILED TO RESOLVE: '${source}' (imported by ${importer || 'entry'})`);
        }
      }
      return null;
    },
  };
}

export default defineConfig(() => {
  return {
    base: './',
    plugins: [react(), tailwindcss(), aliasLoggerPlugin()],
    resolve: {
      alias: {
        '@': srcDir,
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify - file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
