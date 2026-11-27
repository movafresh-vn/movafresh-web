import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isZmp = mode === 'zmp' || process.env.VITE_ZALO_MINIAPP === 'true'
  return {
    plugins: [vue()],
    base: isZmp ? './' : '/',
    ...(isZmp
      ? {
          define: {
            'import.meta.env.VITE_ZALO_MINIAPP': JSON.stringify('true')
          }
        }
      : {}),
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src')
      }
    },
    build: isZmp
      ? {
          outDir: 'www',
          cssCodeSplit: false,
          target: ['es2020', 'safari14'],
          rollupOptions: {
            input: {
              main: resolve(__dirname, 'index.html')
            },
            output: {
              entryFileNames: 'assets/[name]-[hash].module.js',
              chunkFileNames: 'assets/[name]-[hash].module.js',
              assetFileNames: 'assets/[name]-[hash][extname]'
            }
          }
        }
      : {
          rollupOptions: {
            // Hai app trong cùng repo: web khách (index.html) và app vận hành (ops.html)
            input: {
              main: resolve(__dirname, 'index.html'),
              ops: resolve(__dirname, 'ops.html')
            }
          }
        },
    test: {
      environment: 'node',
      include: ['src/shared/**/*.test.js']
    }
  }
})
