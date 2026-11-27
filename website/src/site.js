// 全站共用的設定：網址、社群連結、各語言的介面文字
export const SITE_URL = 'https://microclimate.info';
export const EMAIL = 'support@microclimate.info';
export const SOCIAL = {
  linkedin: 'https://www.linkedin.com/company/microclimate-ai',
  youtube: 'https://www.youtube.com/@MicroclimateAI',
};
export const DEFAULT_OG = '/og/default.png';

export const LANGS = ['zh', 'en'];
export const HTML_LANG = { zh: 'zh-Hant', en: 'en' };
export const OG_LOCALE = { zh: 'zh_TW', en: 'en_US' };

/** 某個語言的網址前綴：中文在根目錄，英文在 /en/ */
export function base(lang) {
  return lang === 'en' ? '/en/' : '/';
}
/** 把「不含語言前綴的路徑」轉成該語言的網址，例如 path('en', 'blog/') → /en/blog/ */
export function path(lang, p = '') {
  return base(lang) + p.replace(/^\//, '');
}

export const BRAND = {
  zh: {
    name: '微氣候 Microclimate',
    title: '微氣候 Microclimate｜AI 落地生活的實驗室',
    description:
      '微氣候 Microclimate 是一個 AI 落地生活的實驗室，透過在真實生活場景中部署 AI 事件進行實驗，設計讓 AI 以友善、多元、包容的方式融入日常的留白空間，測繪人類對未來的想像。',
    tagline: 'AI 落地生活的實驗室',
  },
  en: {
    name: 'Microclimate 微氣候',
    title: 'Microclimate 微氣候 | An AI-to-Life Lab',
    description:
      'Microclimate is an AI-to-life lab. We stage AI encounters in real everyday scenes to design the negative space where AI can settle in — friendly, diverse and inclusive — and map how people imagine the future.',
    tagline: 'An AI-to-life lab',
  },
};

// 介面文字
export const UI = {
  zh: {
    skip: '跳至主要內容',
    menu: '選單',
    prefs: '偏好設定',
    dayNight: '日 / 夜',
    music: '輕柔配樂',
    volume: '音量',
    musicHint: '輕觸畫面，開啟輕柔配樂',
    nav: {
      home: '首頁', philosophy: '理念', about: '關於我們', method: '我們如何工作',
      products: '我們提供的服務', blog: 'Blog', contact: '聯絡我們',
    },
    footer: { about: '關於', blog: 'Blog', palette: '配色', rss: 'RSS' },
    blog: {
      title: 'Blog',
      intro: '來自實驗現場的筆記：我們在真實生活裡部署 AI，看見了什麼。',
      empty: '第一篇文章正在醞釀中，敬請期待。',
      summary: '重點摘要',
      faq: '常見問題',
      published: '發布於',
      updated: '更新於',
      by: '作者',
      back: '← 所有文章',
      readMore: '閱讀全文',
      watch: '觀看影片',
      transcript: '影片重點與逐字稿',
    },
  },
  en: {
    skip: 'Skip to content',
    menu: 'Menu',
    prefs: 'Preferences',
    dayNight: 'Day / Night',
    music: 'Soft music',
    volume: 'Volume',
    musicHint: 'Tap anywhere for soft music',
    nav: {
      home: 'Home', philosophy: 'Philosophy', about: 'About Us', method: 'How We Work',
      products: 'What We Offer', blog: 'Blog', contact: 'Contact',
    },
    footer: { about: 'About', blog: 'Blog', palette: 'Palette', rss: 'RSS' },
    blog: {
      title: 'Blog',
      intro: 'Field notes from our experiments: what we see when AI is placed in real everyday life.',
      empty: 'Our first article is on its way.',
      summary: 'Key takeaways',
      faq: 'FAQ',
      published: 'Published',
      updated: 'Updated',
      by: 'By',
      back: '← All articles',
      readMore: 'Read',
      watch: 'Watch the video',
      transcript: 'Video notes & transcript',
    },
  },
};

export function formatDate(d, lang) {
  return new Intl.DateTimeFormat(lang === 'en' ? 'en-US' : 'zh-TW', {
    year: 'numeric', month: 'long', day: 'numeric',
  }).format(d);
}

/** 全站共用的 Organization 結構化資料 */
export function orgJsonLd(lang) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': SITE_URL + '/#organization',
    name: '微氣候 Microclimate',
    alternateName: ['Microclimate', '微氣候'],
    url: SITE_URL + '/',
    logo: SITE_URL + '/logo_300x300_transparent.png',
    description: BRAND[lang].description,
    email: EMAIL,
    sameAs: [SOCIAL.linkedin, SOCIAL.youtube],
  };
}
export function websiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': SITE_URL + '/#website',
    name: '微氣候 Microclimate',
    alternateName: ['微氣候', 'Microclimate'],
    url: SITE_URL + '/',
    inLanguage: ['zh-Hant', 'en'],
    publisher: { '@id': SITE_URL + '/#organization' },
  };
}
export function breadcrumbJsonLd(items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem', position: i + 1, name: it.name, item: SITE_URL + it.url,
    })),
  };
}
