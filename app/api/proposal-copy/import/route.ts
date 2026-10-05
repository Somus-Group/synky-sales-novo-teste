import { studioContext } from '@/db/studio';
import { readStudioReference } from '@/lib/studio-reference';
import { referenceUrl, StudioError } from '@/lib/studio';
import { proposalCopyTexts } from '@/lib/proposal-copy';
import { limitedBody } from '@/lib/imported-template';

export async function POST(request: Request) {
  try {
    await studioContext();
    const data = JSON.parse(new TextDecoder().decode(await limitedBody(request, 6000))) as { url?: unknown };
    if (typeof data.url !== 'string') throw new StudioError('Cole o link público da proposta.');
    const reference = await readStudioReference(referenceUrl(data.url), request.signal);
    if (reference.method !== 'html' || !reference.editableHtml) throw new StudioError('Este link monta a proposta com JavaScript e não permite preservar o visual com segurança. Use um link público HTML.', 422);
    const texts = await proposalCopyTexts(reference.editableHtml);
    if (!texts.length) throw new StudioError('Não encontrei textos editáveis nessa página.', 422);
    return Response.json({ title: reference.title || 'Proposta importada', url: reference.url, html: reference.editableHtml, texts });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Não foi possível importar o link.' }, { status: error instanceof StudioError ? error.status : 422 });
  }
}
