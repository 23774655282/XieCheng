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
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react-datepicker')) return 'vendor-datepicker';
            if (id.includes('react-hot-toast')) return 'vendor-toast';
            if (id.includes('react-icons')) return 'vendor-icons';
            if (id.includes('react-router') || id.includes('react-dom') || id.includes('/react/')) {
              return 'vendor-react';
            }
            if (id.includes('@tanstack/react-virtual')) {
              return 'vendor-virtual';
            }
            if (id.includes('socket.io')) {
              return 'vendor-socket';
            }
            if (id.includes('qrcode')) {
              return 'vendor-qrcode';
            }
            if (id.includes('pinyin-pro')) {
              return 'vendor-pinyin';
            }
            if (id.includes('date-fns')) {
              return 'vendor-date-fns';
            }
            if (id.includes('@floating-ui')) {
              return 'vendor-floating-ui';
            }
            if (id.includes('axios')) {
              return 'vendor-axios';
            }
          }
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
})
