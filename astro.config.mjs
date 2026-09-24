import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  output: 'server',
  server: {
    host: '0.0.0.0', // Permet au reverse proxy d'accéder au serveur
    port: 3000,
  },
  adapter: node({
    mode: 'standalone',
  }),
  integrations: [tailwind()],
});
