// 微氣候的配色：網站實際使用的顏色（和 styles/site.css 的 :root 一致）
export const PALETTE = {
  light: [
    { key: 'bg',        hex: '#F6F3EA', zh: ['宣紙', '背景'],        en: ['Rice Paper', 'Background'] },
    { key: 'veil',      hex: '#F1ECDF', zh: ['薄霧', '區塊底色'],    en: ['Veil', 'Surface'] },
    { key: 'line',      hex: '#DDD6C6', zh: ['淡墨線', '分隔線'],    en: ['Hairline', 'Dividers'] },
    { key: 'sub',       hex: '#6E695D', zh: ['石灰', '次要文字'],    en: ['Stone', 'Secondary text'] },
    { key: 'ink',       hex: '#201E1A', zh: ['墨', '主要文字'],      en: ['Ink', 'Primary text'] },
    { key: 'accent',    hex: '#8C6842', zh: ['赭金', '強調色'],      en: ['Ochre', 'Accent'] },
    { key: 'logo-ink',  hex: '#1F2621', zh: ['松煙', 'Logo 墨色'],   en: ['Pine Soot', 'Logo ink'] },
    { key: 'logo-teal', hex: '#3D7A6F', zh: ['山嵐青', 'Logo 青色'], en: ['Mountain Teal', 'Logo teal'] },
  ],
  dark: [
    { key: 'bg',        hex: '#15140F', zh: ['夜墨', '背景'],        en: ['Night Ink', 'Background'] },
    { key: 'veil',      hex: '#1C1A15', zh: ['夜霧', '區塊底色'],    en: ['Night Veil', 'Surface'] },
    { key: 'line',      hex: '#2F2C25', zh: ['暗線', '分隔線'],      en: ['Shadow Line', 'Dividers'] },
    { key: 'sub',       hex: '#9C9585', zh: ['灰燼', '次要文字'],    en: ['Ash', 'Secondary text'] },
    { key: 'ink',       hex: '#ECE6D8', zh: ['月白', '主要文字'],    en: ['Moon White', 'Primary text'] },
    { key: 'accent',    hex: '#C79D6E', zh: ['燈金', '強調色'],      en: ['Lantern Gold', 'Accent'] },
    { key: 'logo-teal', hex: '#62A99B', zh: ['夜嵐青', 'Logo 青色'], en: ['Night Teal', 'Logo teal'] },
  ],
};

export function paletteCss() {
  const block = (list) => list.map((c) => `  --mc-${c.key}: ${c.hex}; /* ${c.en[0]} · ${c.zh[0]} */`).join('\n');
  return `/* Microclimate 微氣候 color palette
 * https://microclimate.info/palette/
 * Free to use — a credit link back to microclimate.info is appreciated.
 */
:root {
${block(PALETTE.light)}
}

@media (prefers-color-scheme: dark) {
  :root {
${block(PALETTE.dark).replace(/^/gm, '  ')}
  }
}
`;
}
