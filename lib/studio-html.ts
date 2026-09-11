import {
  StudioError,
  studioElementSelector,
  type StudioVisualEdit,
} from '@/lib/studio';

export async function editStudioHtml(html: string, edit: StudioVisualEdit) {
  let index = 0;
  let matched = false;
  const result = await new HTMLRewriter()
    .on(studioElementSelector, {
      element(element) {
        if (index++ !== edit.index) return;
        if (element.tagName !== edit.tag) return;
        matched = true;
        if (edit.text !== undefined) element.setInnerContent(edit.text);
        const declarations = [element.getAttribute('style') || ''];
        if (edit.color) declarations.push(`color:${edit.color} !important`);
        if (edit.background)
          declarations.push(`background-color:${edit.background} !important`);
        if (edit.fontSize)
          declarations.push(`font-size:${edit.fontSize}px !important`);
        if (edit.align)
          declarations.push(`text-align:${edit.align} !important`);
        element.setAttribute('style', declarations.join(';'));
      },
    })
    .transform(new Response(html))
    .text();
  if (!matched)
    throw new StudioError('O trecho mudou. Selecione-o novamente.', 409);
  return sanitizeStudioHtml(result);
}

export async function sanitizeStudioHtml(html: string) {
  if (!html) return '';
  return new HTMLRewriter()
    .on('script, iframe, object, embed, base, meta, link, form', {
      element(element) {
        element.remove();
      },
    })
    .on('*', {
      element(element) {
        const attributes = Array.from(
          element.attributes as unknown as Iterable<[string, string]>,
        );
        for (const [name] of attributes) {
          if (
            name.toLowerCase().startsWith('on') ||
            ['srcdoc', 'srcset', 'ping', 'formaction', 'target'].includes(
              name.toLowerCase(),
            )
          )
            element.removeAttribute(name);
        }
        const href = element.getAttribute('href');
        if (href && !href.startsWith('#')) element.removeAttribute('href');
      },
    })
    .transform(
      new Response(html, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      }),
    )
    .text();
}
