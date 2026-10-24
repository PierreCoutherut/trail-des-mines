import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  site: 'https://traildesmines.fr',
  output: 'server',
  security: {
    allowedDomains: [
      { hostname: 'traildesmines.fr', protocol: 'https' },
      { hostname: 'www.traildesmines.fr', protocol: 'https' },
      { hostname: 'localhost', protocol: 'http' },
      { hostname: '127.0.0.1', protocol: 'http' },
    ],
  },
  server: {
    host: '0.0.0.0', // Permet au reverse proxy d'accéder au serveur
    port: 3000,
  },
  adapter: node({
    mode: 'standalone',
  }),
  integrations: [tailwind()],
});
