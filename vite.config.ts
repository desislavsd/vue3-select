import { resolve } from 'path'
// import { defineConfig } from 'vite'
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import AutoImport from 'unplugin-auto-import/vite'

// https://vitejs.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      '@/': `${resolve(__dirname, 'src/lib')}/`,
    },
  },
  build: {
    lib: {
      entry: resolve(__dirname, 'src/lib/index.ts'),
      name: 'Vue3Select',
      // fileName: 'vue3-select'
    },
    rollupOptions: {
      external: ['vue'],
      output: {
        globals: {
          vue: 'Vue',
        },
      },
    },
  },
  define: {
    'import.meta.vitest': false,
  },
  test: {
    includeSource: ['src/**/*.{ts,tsx}'],
  },
  plugins: [
    vue(),
    vueJsx({}),

    // https://github.com/antfu/unplugin-auto-import
    AutoImport({
      imports: ['vue'],
      dts: 'auto-imports.d.ts',
    }),
  ],
})
