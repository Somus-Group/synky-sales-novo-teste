import { getChatGPTUser } from '@/app/chatgpt-auth';
import { referenceUrl, StudioError } from '@/lib/studio';
import { readStudioReference } from '@/lib/studio-reference';
import { limitedBody } from '@/lib/imported-template';

export async function POST(request: Request) {
  try {
    if (!(await getChatGPTUser()))
      return Response.json({ error: 'Entre na sua conta.' }, { status: 401 });
    const data = JSON.parse(
      new TextDecoder().decode(await limitedBody(request, 6000)),
    );
    if (typeof data.url !== 'string' || !data.url.trim())
      throw new StudioError('Informe o link da referência.');
    const reference = await readStudioReference(
      referenceUrl(data.url),
      AbortSignal.any([request.signal, AbortSignal.timeout(30000)]),
    );
    const colors = reference.designEvidence.colors
      .filter((color) => /^#[\da-f]{6}$/i.test(color))
      .slice(0, 8);
    const fonts = reference.designEvidence.fonts.join(' ');
    const serif =
      /georgia|times|playfair|cormorant|baskerville|lora|merriweather|\bserif\b/i.test(
        fonts.replace(/sans-serif/gi, ''),
      );
    return Response.json({
      title: reference.title,
      colors,
      serif,
      fonts: reference.designEvidence.fonts.slice(0, 6),
    });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof StudioError
            ? error.message
            : 'Não foi possível ler o visual desse link. Você pode escolher cores e tipografia manualmente.',
      },
      { status: error instanceof StudioError ? error.status : 422 },
    );
  }
}
