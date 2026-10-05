import { getD1 } from '@/db';

export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  if (!/^[\da-f-]{36}$/i.test(slug)) return new Response('Proposta não encontrada.', { status: 404 });
  const page = await getD1().prepare('SELECT source_url AS sourceUrl, html FROM proposal_copy_pages WHERE slug = ? LIMIT 1').bind(slug).first<{ sourceUrl: string; html: string }>();
  if (!page) return new Response('Proposta não encontrada.', { status: 404 });
  const html = page.html.replace(/<head([^>]*)>/i, `<head$1><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline' https:; img-src https: data:; font-src https: data:; connect-src 'none'; script-src 'none'; object-src 'none'; form-action 'none'; base-uri https:"><base href="${new URL(page.sourceUrl).origin}/">`);
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'Cache-Control': 'public, max-age=60' } });
}
