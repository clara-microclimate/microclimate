// RSS 訂閱（中文 /rss.xml、英文 /en/rss.xml）
import rss from '@astrojs/rss';
import { BRAND, UI, SITE_URL } from './site.js';
import { getPosts, slugOf, postUrl } from './blog.js';

export async function feed(lang) {
  const posts = (await getPosts(lang)).filter((p) => !p.data.draft);
  return rss({
    title: `${BRAND[lang].name} — ${UI[lang].blog.title}`,
    description: UI[lang].blog.intro,
    site: SITE_URL,
    customData: `<language>${lang === 'en' ? 'en' : 'zh-TW'}</language>`,
    items: posts.map((p) => ({
      title: p.data.title,
      description: p.data.description,
      pubDate: p.data.date,
      link: postUrl(lang, slugOf(p)),
    })),
  });
}
