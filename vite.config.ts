import { defineConfig } from 'vite';

// Deployed on GitHub Pages at https://<user>.github.io/road-fury/
export default defineConfig({
  base: '/road-fury/',
  // Bind all interfaces (IPv4 + IPv6) so `localhost` works in every browser.
  server: { host: true },
  preview: { host: true },
});
