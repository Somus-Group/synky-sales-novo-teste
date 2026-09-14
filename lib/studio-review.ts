import { selectStudioReferenceStyles } from '@/lib/studio-reference-styles';

export type StudioReview = {
  headings: string[];
  imageCount: number;
  logo: boolean;
  missing: string[];
  warnings: string[];
  design?: import('./studio-design').StudioDesign;
  covered?: string[];
  referenceAssessment?: string;
};

export type StudioReviewOptions = {
  strict?: boolean;
  hasReference?: boolean;
  sectionIds?: string[];
};

export async function reviewStudioHtml(
  html: string,
  options: StudioReviewOptions = {},
) {
  const headings: string[] = [];
  const ids = new Set<string>();
  const links: string[] = [];
  let currentHeading = '';
  let titleCount = 0;
  let images = 0;
  let emptySections = 0;
  let sectionCount = 0;
  let articleCount = 0;
  let listCount = 0;
  let asideCount = 0;
  let detailsCount = 0;
  let tableCount = 0;
  let navCount = 0;
  let classNames = '';
  let styleText = '';
  const sections: Array<{ text: string; image: boolean }> = [];
  await new HTMLRewriter()
    .on('style', {
      text(chunk) {
        if (styleText.length < 24000) styleText += chunk.text;
      },
    })
    .on('nav', {
      element() {
        navCount++;
      },
    })
    .on('article', {
      element() {
        articleCount++;
      },
    })
    .on('aside', {
      element() {
        asideCount++;
      },
    })
    .on('details', {
      element() {
        detailsCount++;
      },
    })
    .on('table', {
      element() {
        tableCount++;
      },
    })
    .on('ul,ol', {
      element() {
        listCount++;
      },
    })
    .on('[class]', {
      element(element) {
        if (classNames.length < 12000)
          classNames += ` ${element.getAttribute('class') || ''}`;
      },
    })
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
        sectionCount++;
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
  const missingSections = options.sectionIds?.filter((id) => !ids.has(id));
  if (missingSections?.length)
    issues.push(
      'Inclua as seções planejadas com seus IDs: ' + missingSections.join(', '),
    );
  if (options.strict) {
    const activeStyles = selectStudioReferenceStyles(
      styleText,
      classNames.split(/\s+/),
    );
    const visualLanguage = activeStyles.styles.toLowerCase();
    const layoutSignals = [
      /display\s*:\s*grid/.test(visualLanguage),
      /display\s*:\s*flex/.test(visualLanguage),
      /grid-template-columns\s*:|columns\s*:/.test(visualLanguage),
      /background(?:-color)?\s*:/.test(visualLanguage),
      /border(?:-top|-bottom|-left)?\s*:/.test(visualLanguage),
      articleCount >= 2 && /(?:padding|gap)\s*:/.test(visualLanguage),
      asideCount > 0,
      detailsCount > 0,
      tableCount > 0,
    ].filter(Boolean).length;
    if (sectionCount < 4 || headings.length < 4)
      issues.push(
        'Estruture a proposta em seções completas, com capa, escopo, método, investimento e próximos passos.',
      );
    if (layoutSignals < 3)
      issues.push(
        'A proposta ficou textual demais. Use pelo menos três composições visuais diferentes, como capa forte, painel de dados, grade de entregáveis, trilha de etapas e bloco de investimento.',
      );
    if (styleText.trim().length < 420)
      issues.push(
        'Inclua CSS interno suficiente para uma direção visual própria, responsiva e diferente de uma proposta em texto corrido.',
      );
    if (
      !/@media|@container|auto-(?:fit|fill)|flex-wrap\s*:\s*wrap/.test(
        visualLanguage,
      )
    )
      issues.push(
        'Inclua regras responsivas que adaptem colunas e navegação ao celular.',
      );
    if (!activeStyles.styles.trim())
      issues.push(
        'As classes da página precisam de estilos CSS válidos e aplicáveis, não apenas nomes de classes.',
      );
    if (options.hasReference && layoutSignals < 4)
      issues.push(
        'Aplique melhor a direção visual do link de referência, preservando ritmo, paleta e organização em vez de gerar uma proposta genérica.',
      );
    if (navCount > 0 && links.length < 3)
      issues.push(
        'O menu precisa apontar para as principais partes da proposta, não apenas para uma seção isolada.',
      );
    if (listCount > 6 && articleCount + asideCount + detailsCount < 2)
      issues.push(
        'Reduza a aparência de lista corrida transformando parte do escopo em blocos, painéis ou etapas editoriais.',
      );
  }
  return { headings: headings.slice(0, 20), imageCount: images, issues };
}
