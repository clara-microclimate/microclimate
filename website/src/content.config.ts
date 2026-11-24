import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// 文章放在 src/content/blog/zh/ 和 src/content/blog/en/
// 中英文用「同一個檔名」配對，例如 zh/market-ai.md ↔ en/market-ai.md
const blog = defineCollection({
  loader: glob({ pattern: '{zh,en}/**/[^_]*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string().max(170),        // 搜尋結果和分享時顯示的摘要
    date: z.coerce.date(),                   // 發布日期
    updated: z.coerce.date().optional(),     // 最後更新日期
    summary: z.array(z.string()).optional(), // 文章開頭的「重點摘要」
    faq: z.array(z.object({ q: z.string(), a: z.string() })).optional(),
    cover: z.string().optional(),            // 封面圖，放在 public/ 底下，例如 /img/blog/xxx.jpg（建議 1200×630）
    coverAlt: z.string().optional(),
    youtube: z.string().optional(),          // YouTube 影片 ID，例如 dQw4w9WgXcQ
    tags: z.array(z.string()).optional(),
    draft: z.boolean().default(false),       // true = 不會上線
  }),
});

export const collections = { blog };
