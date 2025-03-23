import path from "path"
// Import tailwindcss dynamically to avoid ESM/CommonJS conflict
// @ts-ignore
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron'
import renderer from 'vite-plugin-electron-renderer'

// https://vite.dev/config/
export default defineConfig(async () => {
  // Import tailwindcss dynamically as ESM
  const tailwindcss = await import('@tailwindcss/vite').then(m => m.default);

  return {
    plugins: [
      react(), 
      tailwindcss(),
      electron([
        {
          entry: 'electron/main.ts',
          vite: {
            build: {
              outDir: 'dist-electron',
              rollupOptions: {
                external: ['electron-store']
              }
            },
            resolve: {
              // Force '.js' files to be treated as CommonJS in the electron directory
              conditions: ['node']
            }
          },
        },
        {
          entry: 'electron/preload.ts',
          onstart(options) {
            options.reload()
          },
          vite: {
            build: {
              outDir: 'dist-electron',
              rollupOptions: {
                external: ['electron']
              }
            },
            resolve: {
              // Force '.js' files to be treated as CommonJS in the electron directory
              conditions: ['node']
            }
          },
        },
      ]),
      renderer(),
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    }, 
    server: {
      host: '127.0.0.1'
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      emptyOutDir: true,
    }
  }
})
