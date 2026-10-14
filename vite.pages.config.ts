import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
 root:'web',base:process.env.PAGES_BASE_PATH||'./',publicDir:'../public',plugins:[react()],
 define:{'import.meta.env.VITE_STATIC_MODE':JSON.stringify('true')},
 server:{host:'127.0.0.1',port:5174,strictPort:true},
 build:{outDir:'../pages-dist',emptyOutDir:true}
});
