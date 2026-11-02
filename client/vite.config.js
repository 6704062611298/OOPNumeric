import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// ใน dev mode: proxy /api ไปยัง backend (ไม่ต้องสร้าง .env)
// แก้ที่อยู่ backend ได้ด้วย env VITE_DEV_API_TARGET (default http://localhost:4000)
// ใน production: ใช้ /api ผ่าน Nginx reverse proxy ตาม nginx.conf
const devApiTarget = process.env.VITE_DEV_API_TARGET || 'http://localhost:4000';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: devApiTarget,
        changeOrigin: true,
      },
    },
  },
});
