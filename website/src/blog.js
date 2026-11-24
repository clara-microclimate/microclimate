// 讀取文章的共用函式
import { getCollection } from 'astro:content';

// 本機預覽草稿：SHOW_DRAFTS=1 npm run dev
const showDrafts = import.meta.env.DEV || process.env.SHOW_DRAFTS === '1';

/** 檔名就是網址，例如 zh/market-ai.md → /blog/market-ai/ */
export function slugOf(entry) {
  return entry.id.replace(/^(zh|en)\//, '');
}
export function langOf(entry) {
  return entry.id.startsWith('en/') ? 'en' : 'zh';
}
export function postUrl(lang, slug) {
  return (lang === 'en' ? '/en/blog/' : '/blog/') + slug + '/';
}

let warned = false;
/** 某語言的所有文章，新到舊 */
export async function getPosts(lang) {
  const all = await getCollection('blog', (e) => showDrafts || !e.data.draft);
  if (!warned) {
    warned = true;
    // 每篇中文文章都應該有英文版（反之亦然）；缺的話在 build 時提醒，但不擋上線
    const keys = { zh: new Set(), en: new Set() };
    all.forEach((e) => keys[langOf(e)].add(slugOf(e)));
    for (const [l, o] of [['zh', 'en'], ['en', 'zh']]) {
      for (const s of keys[l]) {
        if (!keys[o].has(s)) console.warn(`[blog] 「${l}/${s}.md」還沒有${o === 'en' ? '英文' : '中文'}版（${o}/${s}.md）`);
      }
    }
  }
  return all
    .filter((e) => langOf(e) === lang)
    .sort((a, b) => b.data.date - a.data.date);
}

/** 找另一個語言的同一篇文章（同檔名），沒有就回傳 null */
export async function counterpart(entry) {
  const other = langOf(entry) === 'zh' ? 'en' : 'zh';
  const list = await getPosts(other);
  const hit = list.find((e) => slugOf(e) === slugOf(entry));
  return hit ? postUrl(other, slugOf(hit)) : null;
}
