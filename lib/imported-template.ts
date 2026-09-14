import type { ProposalNiche } from './proposal-templates';

export type ImportedTemplate = {
  id: string; name: string; niche: ProposalNiche; template: string;
  content: { brand_name: string; title: string; subtitle: string; budget_pending: true;
    slides: Array<{ type: string; eyebrow: string; title: string; body: string; bullets: string[] }> };
};
const niches = ['Consultoria', 'Arquitetura', 'Marketing', 'Design'];
const types = ['cover', 'context', 'scope', 'process', 'investment', 'closing', 'custom'];

// Rebuild the object from plain strings: never keep markup, URLs or instructions as executable content.
export function normalizeImportedTemplate(value: unknown): ImportedTemplate | null {
  if (!value || typeof value !== 'object') return null;
  const item = value as ImportedTemplate;
  const text = (v: unknown, max: number) => typeof v === 'string' && v.length <= max;
  if (!text(item.id, 80) || !text(item.name, 120) || !item.name.trim() || !niches.includes(item.niche) || !text(item.template, 160)) return null;
  const c = item.content;
  if (!c || !text(c.brand_name, 200) || !text(c.title, 300) || !text(c.subtitle, 2000) || !Array.isArray(c.slides) || c.slides.length < 1 || c.slides.length > 30) return null;
  if (c.slides[0]?.type !== 'cover' || c.slides.some(s => !s || !types.includes(s.type) || !text(s.eyebrow, 200) || !text(s.title, 300) || !text(s.body, 18000) || !Array.isArray(s.bullets) || s.bullets.length > 80 || s.bullets.some(b => !text(b, 3000)))) return null;
  if (JSON.stringify(c).length > 120000) return null;
  return { id: item.id, name: item.name.trim(), niche: item.niche, template: item.template,
    content: { brand_name: c.brand_name, title: c.title, subtitle: c.subtitle, budget_pending: true,
      slides: c.slides.map(s => ({ type: s.type, eyebrow: s.eyebrow, title: s.title, body: s.body, bullets: [...s.bullets] })) } };
}

export async function limitedBody(request: Request, max: number) {
  if (Number(request.headers.get('content-length')) > max) throw new Error('size');
  const reader = request.body?.getReader();
  if (!reader) throw new Error('empty');
  const chunks: Uint8Array[] = []; let length = 0;
  try {
    while (true) {
      const { value, done } = await reader.read(); if (done) break;
      length += value.length;
      if (length > max) { await reader.cancel(); throw new Error('size'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const result = new Uint8Array(length); let offset = 0;
  for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.length; }
  return result;
}
