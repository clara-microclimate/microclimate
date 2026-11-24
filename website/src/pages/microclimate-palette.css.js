import { paletteCss } from '../palette.js';
export function GET() {
  return new Response(paletteCss(), { headers: { 'Content-Type': 'text/css; charset=utf-8' } });
}
