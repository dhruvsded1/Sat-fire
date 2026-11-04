import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';

// Look for data either in local web/public or root ../public
const localPublic = path.resolve(__dirname, 'public');
const rootPublic = path.resolve(__dirname, '../public');
const publicDir = fs.existsSync(path.join(localPublic, 'data'))
  ? localPublic
  : (fs.existsSync(rootPublic) ? rootPublic : localPublic);

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  publicDir,
  server: {
    port: 3000,
    open: false
  }
});
