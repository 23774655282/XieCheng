import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { writeFileSync } from 'fs'
import { join } from 'path'

// 构建后写入 JS bundle 大小，供 ?perf=1 时读取
function bundleSizePlugin() {
  let outDir = join(process.cwd(), 'dist')
  return {
    name: 'bundle-size',
    configResolved(config) {
      const build = config && config.build
      outDir = join(process.cwd(), (build && build.outDir) ? build.outDir : 'dist')
    },
    writeBundle(_, bundle) {
      const sizes = {}
      let total = 0
      for (const [name, chunk] of Object.entries(bundle)) {
        if (chunk.type === 'chunk' && chunk.code) {
          const bytes = Buffer.byteLength(chunk.code, 'utf8')
          sizes[name] = bytes
          total += bytes
        }
      }
      const out = { sizes, total, timestamp: Date.now() }
      try {
        const dir = outDir || join(process.cwd(), 'dist')
        writeFileSync(join(dir, 'bundle-size.json'), JSON.stringify(out, null, 2))
        writeFileSync(join(process.cwd(), 'public', 'bundle-size.json'), JSON.stringify(out, null, 2))
      } catch {}
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), bundleSizePlugin()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-ui': ['react-hot-toast', 'react-datepicker'],
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
})
