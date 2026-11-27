// llms.txt：給 AI 讀的網站摘要（https://llmstxt.org）
import { BRAND, SITE_URL, EMAIL, SOCIAL } from '../site.js';
import { getPosts, slugOf, postUrl } from '../blog.js';

export async function GET() {
  const list = async (lang) =>
    (await getPosts(lang)).filter((p) => !p.data.draft)
      .map((p) => `- [${p.data.title}](${SITE_URL}${postUrl(lang, slugOf(p))}): ${p.data.description}`)
      .join('\n') || '- (coming soon)';
  const body = `# Microclimate 微氣候

> ${BRAND.en.description}

Microclimate (微氣候) works in Traditional Chinese and English. The site is bilingual: Chinese pages live at the root (/), English pages under /en/.

## Services

- AI Taste Tests (AI 品味測評), for brands: how AI sees your brand versus who you really are.
- AI Advisory (AI 導入顧問), for teams: listening first, then guiding AI adoption step by step.
- Dream, Told Well (說夢課), for individuals: a course on telling your dream so convincingly that others believe in it.

## Main pages

- [Home (English)](${SITE_URL}/en/): mission, contact
- [首頁（中文）](${SITE_URL}/): 理念、聯絡
- [About](${SITE_URL}/en/about/) · [關於](${SITE_URL}/about/)
- [Journal](${SITE_URL}/en/blog/) · [文章](${SITE_URL}/blog/)
- [Color palette](${SITE_URL}/en/palette/) · [配色](${SITE_URL}/palette/)

## Articles (English)

${await list('en')}

## 文章（中文）

${await list('zh')}

## Contact

- Email: ${EMAIL}
- LinkedIn: ${SOCIAL.linkedin}
- YouTube: ${SOCIAL.youtube}
`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
