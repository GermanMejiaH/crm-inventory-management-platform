import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          "vendor-recharts": ["recharts"],
          "vendor-icons": ["lucide-react"]
        }
      }
    }
  },
  test: {
    environment: 'jsdom',
    globals: true
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    hmr: {      port: 5173,
      clientPort: 5173,
      overlay: false,
    },
  },
})
