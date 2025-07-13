import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import fs from 'fs';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "0.0.0.0",
    port: 8888,
    // Only use HTTPS in development mode when certificates exist
    ...(mode === 'development' && fs.existsSync('./certs/key.pem') && fs.existsSync('./certs/cert.pem') ? {
      https: {
        key: fs.readFileSync('./certs/key.pem'),
        cert: fs.readFileSync('./certs/cert.pem'),
      },
    } : {}),
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Production build optimizations
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: mode === 'production',
        drop_debugger: mode === 'production',
      },
    },
    rollupOptions: {
      output: {
        manualChunks: {
          // Split vendor chunks for better caching
          vendor: ['react', 'react-dom', 'react-router-dom'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-select', '@radix-ui/react-toast'],
          supabase: ['@supabase/supabase-js'],
        },
      },
    },
    // Generate source maps for debugging in production
    sourcemap: mode === 'production' ? 'hidden' : true,
  },
  // Environment variable validation
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
  },
}));
