import { studioContext } from '@/db/studio';
import { renderProposalCopy } from '@/lib/proposal-copy';
import { limitedBody } from '@/lib/imported-template';
import { StudioError } from '@/lib/studio';

export async function POST(request: Request) {
  try {
    await studioContext();
    const data = JSON.parse(new TextDecoder().decode(await limitedBody(request, 100000))) as { html?: unknown; replacements?: unknown };
    if (typeof data.html !== 'string' || data.html.length > 64000 || !Array.isArray(data.replacements)) throw new StudioError('A página ou as alterações excedem o limite.');
    const html = await renderProposalCopy(data.html, data.replacements as Array<{ path: number[]; text: string }>);
    return Response.json({ html });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Não foi possível atualizar a prévia.' }, { status: error instanceof StudioError ? error.status : 400 });
  }
}
