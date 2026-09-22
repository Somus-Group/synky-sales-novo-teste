import { getChatGPTUser } from '@/app/chatgpt-auth';
import { referenceUrl, StudioError } from '@/lib/studio';
import { readStudioReference } from '@/lib/studio-reference';
import { limitedBody } from '@/lib/imported-template';

function suggestedDesign(colors: string[], serif: boolean) {
  if (serif) return 'editorial' as const;
  const primary = colors[0];
  if (!primary) return 'compact' as const;
  const channels = primary.slice(1).match(/../g)?.map((value) => parseInt(value, 16));
  const lightness = channels
    ? (channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722) /
      255
    : 1;
  return lightness < 0.55 ? ('contrast' as const) : ('compact' as const);
}

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
    const sections = (reference.designEvidence.sectionOrder || [])
      .filter((section) => typeof section === 'string')
      .map((section) => section.replace(/\s+/g, ' ').trim())
      .filter(Boolean)
      .slice(0, 8);
    return Response.json({
      title: reference.title,
      // This is the public, script-free text collected from the reference.
      // The Zero composer uses it as a local base instead of throwing it away.
      content: reference.text,
      colors,
      serif,
      fonts: reference.designEvidence.fonts.slice(0, 6),
      sections,
      design: suggestedDesign(colors, serif),
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
