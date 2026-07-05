import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  
  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api/clinic': {
          target: 'http://localhost:5000',
          changeOrigin: true,
        },
        '/ims/api': {
          target: 'http://localhost:5000',
          changeOrigin: true,
        },
      }
    },
    define: {
      // Force env variables into build
      'import.meta.env.VITE_CLINIC_API_URL': JSON.stringify(env.VITE_CLINIC_API_URL),
      'import.meta.env.VITE_IMS_API_URL': JSON.stringify(env.VITE_IMS_API_URL),
    }
  }
})