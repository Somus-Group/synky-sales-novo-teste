export type StudioReview = {
  headings: string[];
  imageCount: number;
  logo: boolean;
  missing: string[];
  warnings: string[];
};

export async function reviewStudioHtml(html: string) {
  const headings: string[] = [];
  const ids = new Set<string>();
  const links: string[] = [];
  let currentHeading = '';
  let titleCount = 0;
  let images = 0;
  let emptySections = 0;
  const sections: Array<{ text: string; image: boolean }> = [];
  await new HTMLRewriter()
    .on('[id]', {
      element(element) {
        ids.add(element.getAttribute('id') || '');
      },
    })
    .on('a[href^="#"]', {
      element(element) {
        const href = element.getAttribute('href');
        if (href && href.length > 1) links.push(href.slice(1));
      },
    })
    .on('h1,h2', {
      element(element) {
        currentHeading = '';
        if (element.tagName === 'h1') titleCount++;
        element.onEndTag(() => {
          if (currentHeading.trim())
            headings.push(currentHeading.trim().slice(0, 160));
        });
      },
      text(chunk) {
        currentHeading += chunk.text;
      },
    })
    .on('section', {
      element(element) {
        const section = { text: '', image: false };
        sections.push(section);
        element.onEndTag(() => {
          if (section.text.trim().length < 12 && !section.image)
            emptySections++;
          sections.splice(sections.indexOf(section), 1);
        });
      },
      text(chunk) {
        for (const section of sections) section.text += chunk.text;
      },
    })
    .on('img', {
      element() {
        images++;
        for (const section of sections) section.image = true;
      },
    })
    .transform(new Response(html))
    .text();
  const issues: string[] = [];
  if (!titleCount) issues.push('Inclua um título principal h1 visível.');
  if (!headings.length)
    issues.push(
      'Entregue a proposta com texto e seções completos, não uma estrutura vazia.',
    );
  if (emptySections)
    issues.push(
      `Preencha ou remova ${emptySections} seção(ões) vazia(s). Não use blocos sem conteúdo.`,
    );
  if (links.some((link) => !ids.has(link)))
    issues.push('Corrija os links do menu para seções que realmente existem.');
  return { headings: headings.slice(0, 20), imageCount: images, issues };
}
