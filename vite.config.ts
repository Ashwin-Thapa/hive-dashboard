import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: "127.0.0.1", // force IPv4
    port: 3000,        // use port 3000 instead of 5173
    open: true         // auto-open browser
  },
  build: {
    minify: "terser", // use Terser instead of esbuild for finer control
    terserOptions: {
      format: {
        comments: false, // remove ALL comments in production build
      },
    },
  }
})
