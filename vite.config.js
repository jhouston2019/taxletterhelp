import { defineConfig } from 'vite'

// Dev: Vite serves root HTML (e.g. upload.html) as static files; Supabase CDN tags in those files are unchanged.
// Build: `npm run build` runs vite build then copyfiles *.html dist/ — root HTML (with CDN scripts) is copied to dist intact.
// Do not strip Supabase UMD or the following import map from HTML; copy-html preserves them.
// Import map maps @supabase/supabase-js for any bare specifier in the browser; Auth/UploadForm use globalThis.supabase from UMD.

export default defineConfig({
  server: {
    port: 3000
  },
  build: {
    outDir: 'dist'
  }
})
