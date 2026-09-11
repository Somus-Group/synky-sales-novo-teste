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
