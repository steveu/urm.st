// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://urm.st',
  trailingSlash: 'never',
  build: { format: 'file' },
});
