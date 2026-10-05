import { studioContext } from '@/db/studio';
import { renderProposalCopy } from '@/lib/proposal-copy';
import { limitedBody } from '@/lib/imported-template';
import { referenceUrl, StudioError } from '@/lib/studio';

export async function POST(request: Request) {
  try {
    const { db, workspaceId } = await studioContext();
    const data = JSON.parse(new TextDecoder().decode(await limitedBody(request, 100000))) as { title?: unknown; sourceUrl?: unknown; html?: unknown };
    if (typeof data.title !== 'string' || typeof data.sourceUrl !== 'string' || typeof data.html !== 'string' || data.html.length > 64000) throw new StudioError('A cópia não contém todos os dados necessários.');
    const sourceUrl = referenceUrl(data.sourceUrl);
    const html = await renderProposalCopy(data.html, []);
    const slug = crypto.randomUUID();
    const id = crypto.randomUUID();
    await db.prepare('INSERT INTO proposal_copy_pages (id, workspace_id, slug, title, source_url, html, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(id, workspaceId, slug, data.title.trim().slice(0, 120) || 'Proposta editada', sourceUrl, html, Date.now()).run();
    return Response.json({ url: `${new URL(request.url).origin}/c/${slug}` }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Não foi possível salvar esta cópia.' }, { status: error instanceof StudioError ? error.status : 400 });
  }
}
