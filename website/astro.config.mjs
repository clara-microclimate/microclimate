// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://microclimate.info',
  trailingSlash: 'always',
  build: { format: 'directory' },
  integrations: [
    sitemap({
      // 中文在根目錄、英文在 /en/，sitemap 會自動標上對應的語言版本
      i18n: { defaultLocale: 'zh', locales: { zh: 'zh-Hant', en: 'en' } },
    }),
  ],
});
