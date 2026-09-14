export const studioTemplates = [
  {
    id: 'commercial',
    name: 'Comercial',
    description: 'Clara, direta e focada em decisao.',
    bestFor: 'servicos gerais, projetos pontuais e propostas institucionais',
    structure: 'Objetivo, escopo, metodo, cronograma e investimento',
    accent: '#176bd6',
    surface: '#eef5ff',
    ink: '#10223d',
    layout: 'minimal',
  },
  {
    id: 'performance',
    name: 'Performance',
    description: 'Para crescimento, midia e resultados.',
    bestFor: 'metas comerciais, funil, conversao e analise de resultados',
    structure: 'Meta, diagnostico, canais, plano de acao e indicadores',
    accent: '#0f9d72',
    surface: '#ecfbf4',
    ink: '#102a24',
    layout: 'bold',
  },
  {
    id: 'creative',
    name: 'Criativa',
    description: 'Para marca, design e experiencias.',
    bestFor: 'campanhas criativas, design, conteudo e experiencias de marca',
    structure: 'Ideia central, entregaveis, processo criativo e proximos passos',
    accent: '#7c3fd6',
    surface: '#f5efff',
    ink: '#291447',
    layout: 'editorial',
  },
  {
    id: 'executive',
    name: 'Executiva',
    description: 'Para consultoria e projetos estrategicos.',
    bestFor: 'consultoria, diagnostico, planejamento e projetos para lideranca',
    structure: 'Cenario, recomendacao, frentes, governanca e investimento',
    accent: '#a56716',
    surface: '#fff7e9',
    ink: '#38250c',
    layout: 'dark',
  },
  {
    id: 'growth',
    name: 'Growth',
    description: 'Para crescimento, funil e escala.',
    bestFor: 'aquisicao, crescimento recorrente, testes e escala',
    structure: 'Oportunidade, publico, experimentos, metas e rotina de crescimento',
    accent: '#e05d2d',
    surface: '#fff0e9',
    ink: '#3d1c10',
    layout: 'bold',
  },
  {
    id: 'branding',
    name: 'Branding',
    description: 'Para estrategia e identidade de marca.',
    bestFor: 'posicionamento, identidade visual, rebranding e direcao criativa',
    structure: 'Contexto, essencia, conceito, sistema visual e aplicacoes',
    accent: '#bd4f78',
    surface: '#fff0f5',
    ink: '#3d1325',
    layout: 'editorial',
  },
  {
    id: 'traffic',
    name: 'Trafego pago',
    description: 'Para campanhas, midia e conversao.',
    bestFor: 'Google Ads, Meta Ads, campanhas de conversao e otimizacao',
    structure: 'Meta, audiencias, canais, campanhas, acompanhamento e investimento',
    accent: '#2b9de4',
    surface: '#eaf7ff',
    ink: '#09273d',
    layout: 'dark',
  },
  {
    id: 'launch',
    name: 'Lancamento',
    description: 'Para novas ofertas e ativacoes.',
    bestFor: 'lancamento de produto, evento, nova marca ou nova oferta',
    structure: 'Proposta de valor, publico, campanha, cronograma e ativacao',
    accent: '#b5422e',
    surface: '#fff1ee',
    ink: '#3b170f',
    layout: 'bold',
  },
  {
    id: 'retainer',
    name: 'Parceria mensal',
    description: 'Para contratos recorrentes e rotina.',
    bestFor: 'retainers, operacao continua, marketing mensal e acompanhamento',
    structure: 'Frentes mensais, cadencia, entregaveis, indicadores e investimento',
    accent: '#287c6a',
    surface: '#edf8f5',
    ink: '#102b25',
    layout: 'minimal',
  },
  {
    id: 'website',
    name: 'Site e digital',
    description: 'Para sites, produto e presenca digital.',
    bestFor: 'sites, landing pages, e-commerce, UX e produtos digitais',
    structure: 'Objetivo digital, jornadas, paginas, etapas, tecnologia e entrega',
    accent: '#4d63cf',
    surface: '#f0f2ff',
    ink: '#182052',
    layout: 'editorial',
  },
] as const;

export type StudioTemplateId = 'none' | (typeof studioTemplates)[number]['id'];
export type StudioTemplate = (typeof studioTemplates)[number];

export type StudioTemplateContent = {
  title: string;
  message: string;
  headline: string;
  summary: string;
  objective: string;
  scope: string[];
  method: string[];
  timeline: string[];
  investment: string;
  nextSteps: string[];
  missingInformation: string[];
  referenceStatus: 'used' | 'unavailable' | 'not_requested';
};

export const studioTemplateOutputSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'title',
    'message',
    'headline',
    'summary',
    'objective',
    'scope',
    'method',
    'timeline',
    'investment',
    'next_steps',
    'missing_information',
    'reference_status',
  ],
  properties: {
    title: { type: 'string' },
    message: { type: 'string' },
    headline: { type: 'string' },
    summary: { type: 'string' },
    objective: { type: 'string' },
    scope: { type: 'array', items: { type: 'string' } },
    method: { type: 'array', items: { type: 'string' } },
    timeline: { type: 'array', items: { type: 'string' } },
    investment: { type: 'string' },
    next_steps: { type: 'array', items: { type: 'string' } },
    missing_information: { type: 'array', items: { type: 'string' } },
    reference_status: {
      type: 'string',
      enum: ['used', 'unavailable', 'not_requested'],
    },
  },
};

export function studioTemplate(value?: string): StudioTemplate {
  return (
    studioTemplates.find((template) => template.id === value) ||
    studioTemplates[0]
  );
}

export function studioTemplateId(value: unknown): StudioTemplateId {
  if (typeof value !== 'string' || !studioTemplates.some((item) => item.id === value))
    return 'none';
  return value as StudioTemplateId;
}

const cleanText = (value: unknown, limit: number) =>
  typeof value === 'string' ? value.trim().slice(0, limit) : '';
const cleanList = (value: unknown, limit: number, itemLimit: number) =>
  Array.isArray(value)
    ? value
        .filter((item) => typeof item === 'string')
        .map((item) => item.trim().slice(0, itemLimit))
        .filter(Boolean)
        .slice(0, limit)
    : [];

export function parseStudioTemplateContent(value: string): StudioTemplateContent {
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error('A IA retornou um conteudo incompleto. Tente novamente.');
  }
  const content = {
    title: cleanText(parsed.title, 120),
    message: cleanText(parsed.message, 8000),
    headline: cleanText(parsed.headline, 260),
    summary: cleanText(parsed.summary, 800),
    objective: cleanText(parsed.objective, 1200),
    scope: cleanList(parsed.scope, 7, 280),
    method: cleanList(parsed.method, 6, 280),
    timeline: cleanList(parsed.timeline, 6, 280),
    investment: cleanText(parsed.investment, 500),
    nextSteps: cleanList(parsed.next_steps, 5, 280),
    missingInformation: cleanList(parsed.missing_information, 12, 200),
    referenceStatus: parsed.reference_status,
  } as StudioTemplateContent;
  if (
    !content.title ||
    !content.message ||
    !content.headline ||
    !content.summary ||
    !content.objective ||
    !content.scope.length ||
    !content.method.length ||
    !content.timeline.length ||
    !content.investment ||
    !content.nextSteps.length ||
    !['used', 'unavailable', 'not_requested'].includes(content.referenceStatus)
  )
    throw new Error('A IA retornou uma proposta incompleta. Tente novamente.');
  return content;
}

const escapeHtml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const list = (items: string[]) =>
  items.map((item) => `<li>${escapeHtml(item)}</li>`).join('');

export function renderStudioTemplateLegacy(
  templateId: StudioTemplateId,
  content: StudioTemplateContent,
  supplier?: { business_name?: string | null },
  logoId?: string | null,
) {
  const template = studioTemplate(templateId);
  const supplierName = escapeHtml(supplier?.business_name || 'Synky Sales');
  const logo = logoId
    ? `<img src="studio-asset:${escapeHtml(logoId)}" alt="${supplierName}">`
    : `<strong>${supplierName}</strong>`;
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(content.title)}</title><style>:root{--accent:${template.accent};--surface:${template.surface};--ink:${template.ink};--line:color-mix(in srgb,var(--ink) 14%,transparent)}*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:#fff;color:var(--ink);font-family:Arial,Helvetica,sans-serif;font-size:17px;line-height:1.55}header{max-width:1180px;margin:auto;padding:24px 32px;display:flex;justify-content:space-between;align-items:center;gap:24px;border-bottom:1px solid var(--line)}header img{display:block;width:auto;max-width:190px;max-height:56px;object-fit:contain}header strong{font-size:18px}nav{display:flex;gap:20px;flex-wrap:wrap}nav a{color:inherit;text-decoration:none;font-size:14px}.hero{background:var(--surface);padding:84px 32px}.hero>div,.content{max-width:1180px;margin:auto}.eyebrow{display:inline-flex;align-items:center;gap:8px;color:var(--accent);font-size:13px;font-weight:700;text-transform:uppercase}.eyebrow:before{content:'';width:8px;height:8px;border-radius:50%;background:var(--accent)}h1{max-width:850px;margin:22px 0;font-size:clamp(42px,7vw,82px);line-height:1.01;letter-spacing:0}h2{font-size:clamp(28px,3vw,42px);line-height:1.12;margin:0 0 18px}.hero p{max-width:680px;margin:0;font-size:21px}.content{padding:76px 32px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:56px}.label{color:var(--accent);font-weight:700;font-size:13px;text-transform:uppercase}.lead{font-size:22px;margin:0}.stack{display:grid;gap:12px;margin:26px 0 0;padding:0;list-style:none}.stack li{padding:16px 0;border-bottom:1px solid var(--line)}.band{background:var(--ink);color:#fff;padding:76px 32px}.band>div{max-width:1180px;margin:auto}.band .label{color:#fff}.steps{counter-reset:step;display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-top:28px;padding:0;list-style:none}.steps li{border-top:1px solid #ffffff66;padding-top:16px}.steps li:before{counter-increment:step;content:'0' counter(step);display:block;color:#ffffff99;font-size:13px;margin-bottom:14px}.investment{padding:30px;border:1px solid var(--line);background:var(--surface)}.investment p{font-size:22px;margin:0}.next{padding:76px 32px;background:var(--surface)}.next>div{max-width:1180px;margin:auto}.footer{max-width:1180px;margin:auto;padding:28px 32px;color:#647084;font-size:14px}.dark{background:var(--ink);color:#fff}.dark header,.dark .content,.dark .footer{background:var(--ink);color:#fff}.dark .hero,.dark .next{background:var(--surface)}.dark .band{background:#000}.dark .footer{color:#ffffffa8}.editorial h1,.editorial h2{font-family:Georgia,'Times New Roman',serif}.editorial .hero{border-bottom:1px solid var(--line)}.bold h1{max-width:980px;font-size:clamp(52px,8vw,96px)}.bold .hero{padding-top:112px;padding-bottom:112px}.minimal .hero{padding-top:64px;padding-bottom:64px}@media(max-width:700px){header,.hero,.content,.band,.next{padding-left:20px;padding-right:20px}header{align-items:flex-start;flex-direction:column}.hero{padding-top:56px;padding-bottom:56px}.grid,.steps{grid-template-columns:1fr;gap:30px}nav{gap:14px}.content,.band,.next{padding-top:56px;padding-bottom:56px}}</style></head><body class="${template.layout}"><header><div>${logo}</div><nav><a href="#escopo">Escopo</a><a href="#metodo">Metodo</a><a href="#investimento">Investimento</a></nav></header><main><section class="hero"><div><span class="eyebrow">Proposta comercial privada</span><h1>${escapeHtml(content.headline)}</h1><p>${escapeHtml(content.summary)}</p></div></section><section class="content grid" id="escopo"><div><span class="label">Objetivo</span><h2>Uma parceria com foco no que importa.</h2><p class="lead">${escapeHtml(content.objective)}</p></div><div><span class="label">Escopo</span><ul class="stack">${list(content.scope)}</ul></div></section><section class="band" id="metodo"><div><span class="label">Como vamos conduzir</span><h2>Um processo claro, com ritmo e visibilidade.</h2><ol class="steps">${list(content.method)}</ol></div></section><section class="content grid"><div><span class="label">Cronograma</span><ul class="stack">${list(content.timeline)}</ul></div><aside class="investment" id="investimento"><span class="label">Investimento</span><p>${escapeHtml(content.investment)}</p></aside></section><section class="next"><div class="grid"><div><span class="label">Proximos passos</span><h2>Quando fizer sentido, seguimos daqui.</h2></div><div><ul class="stack">${list(content.nextSteps)}</ul></div></div></section></main><footer class="footer">${supplierName} · Proposta privada</footer></body></html>`;
}

const scopeCards = (items: string[]) =>
  items
    .map(
      (item, index) =>
        `<article class="scope-card"><span>0${index + 1}</span><p>${escapeHtml(item)}</p></article>`,
    )
    .join('');

const numberedList = (items: string[], className: string) =>
  items
    .map(
      (item, index) =>
        `<li class="${className}"><span>${String(index + 1).padStart(2, '0')}</span><p>${escapeHtml(item)}</p></li>`,
    )
    .join('');

export function renderStudioTemplate(
  templateId: StudioTemplateId,
  content: StudioTemplateContent,
  supplier?: { business_name?: string | null },
  logoId?: string | null,
) {
  const template = studioTemplate(templateId);
  const supplierName = escapeHtml(supplier?.business_name || 'Synky Sales');
  const logo = logoId
    ? `<img src="studio-asset:${escapeHtml(logoId)}" alt="${supplierName}">`
    : `<strong>${supplierName}</strong>`;
  const signalItems = [
    [content.scope.length, 'frentes de entrega'],
    [content.method.length, 'etapas de trabalho'],
    [content.timeline.length, 'marcos planejados'],
  ]
    .map(
      ([value, label]) =>
        `<div><strong>${value}</strong><span>${label}</span></div>`,
    )
    .join('');

  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(content.title)}</title>
  <style>
    :root{--accent:${template.accent};--surface:${template.surface};--ink:${template.ink};--paper:#fbfcfe;--line:color-mix(in srgb,var(--ink) 14%,transparent);--soft:color-mix(in srgb,var(--accent) 9%,white)}
    *{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:var(--paper);color:var(--ink);font-family:Inter,Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6}a{color:inherit}header{max-width:1280px;margin:auto;padding:24px 40px;display:flex;align-items:center;justify-content:space-between;gap:28px}header img{display:block;width:auto;max-width:190px;max-height:58px;object-fit:contain}header strong{font-size:18px}nav{display:flex;gap:18px;flex-wrap:wrap}nav a{font-size:13px;font-weight:700;text-decoration:none;opacity:.68}nav a:hover{opacity:1}.hero{background:var(--ink);color:#fff;padding:28px 40px 40px}.hero-shell,.container{max-width:1200px;margin:auto}.hero-shell{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(310px,.8fr);gap:54px;align-items:end;padding:70px 0 46px}.eyebrow,.section-label{display:flex;align-items:center;gap:9px;color:var(--accent);font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase}.eyebrow{color:#fff}.eyebrow:before{content:'';width:7px;height:7px;background:var(--accent);border-radius:50%}h1,h2,p{margin:0}h1{max-width:800px;margin:20px 0 22px;font-size:clamp(44px,6vw,84px);line-height:.99;letter-spacing:0}.hero-copy>p{max-width:650px;color:#e9edf4;font-size:20px}.hero-panel{padding:28px;background:var(--surface);color:var(--ink);border-radius:8px}.hero-panel>span{display:block;font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase}.hero-panel>strong{display:block;margin:42px 0 30px;font-size:clamp(24px,3vw,42px);line-height:1.05}.signals{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;padding-top:20px;border-top:1px solid var(--line)}.signals strong,.signals span{display:block}.signals strong{font-size:23px;line-height:1}.signals span{margin-top:6px;font-size:11px;line-height:1.35}.section{padding:96px 40px}.split{display:grid;grid-template-columns:.85fr 1.15fr;gap:80px;align-items:start}h2{font-size:clamp(30px,3.2vw,48px);line-height:1.05;margin:18px 0}.lead{font-size:21px;line-height:1.55}.scope-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1px;background:var(--line);border:1px solid var(--line)}.scope-card{min-height:180px;padding:23px;background:var(--paper)}.scope-card span{color:var(--accent);font-size:12px;font-weight:800;letter-spacing:.08em}.scope-card p{margin-top:34px;font-size:17px;font-weight:650;line-height:1.4}.method{background:var(--surface);padding:92px 40px}.method .container{display:grid;grid-template-columns:.85fr 1.15fr;gap:80px;align-items:start}.method h2{max-width:470px}.method-list,.timeline{margin:0;padding:0;list-style:none}.method-list{display:grid;gap:0}.method-step{display:grid;grid-template-columns:52px 1fr;gap:18px;padding:20px 0;border-top:1px solid var(--line)}.method-step span{display:grid;place-items:center;width:36px;height:36px;border:1px solid var(--accent);color:var(--accent);font-size:11px;font-weight:800}.method-step p{font-size:17px;font-weight:650}.timeline-section{background:#fff}.timeline{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px;margin-top:42px}.timeline-item{padding:22px 0;border-top:2px solid var(--accent)}.timeline-item span{display:block;color:var(--accent);font-size:12px;font-weight:800}.timeline-item p{margin-top:16px;font-size:17px;font-weight:650;line-height:1.4}.investment-section{padding:40px;background:var(--ink);color:#fff}.investment-grid{max-width:1200px;margin:auto;display:grid;grid-template-columns:.9fr 1.1fr;gap:60px;align-items:end;padding:52px 0}.investment-grid .section-label{color:var(--accent)}.investment-grid h2{max-width:500px}.investment-card{padding:30px;border:1px solid #ffffff4d;background:#ffffff0d}.investment-card span{display:block;color:#ffffffb8;font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase}.investment-card p{margin-top:16px;font-size:clamp(24px,3vw,39px);font-weight:700;line-height:1.12}.next{padding:96px 40px;background:var(--paper)}.next-grid{max-width:1200px;margin:auto;display:grid;grid-template-columns:.85fr 1.15fr;gap:80px}.next-list{display:grid;gap:0;margin:0;padding:0;list-style:none;border-top:1px solid var(--line)}.next-list li{display:grid;grid-template-columns:34px 1fr;gap:14px;padding:16px 0;border-bottom:1px solid var(--line)}.next-list span{color:var(--accent);font-size:12px;font-weight:800}.next-list p{font-size:16px;font-weight:650}.footer{max-width:1200px;margin:auto;padding:28px 40px;border-top:1px solid var(--line);color:color-mix(in srgb,var(--ink) 58%,transparent);font-size:13px}.editorial h1,.editorial h2{font-family:Georgia,'Times New Roman',serif}.editorial .hero{background:var(--surface);color:var(--ink)}.editorial .hero-copy>p{color:color-mix(in srgb,var(--ink) 72%,transparent)}.editorial .hero-panel{background:var(--ink);color:#fff}.editorial .eyebrow{color:var(--ink)}.bold h1{max-width:900px;font-size:clamp(54px,7vw,98px)}.minimal .hero-shell{padding-top:42px}.dark{--paper:#11151d;--line:#ffffff2c;background:#11151d;color:#f3f5f8}.dark header{background:#11151d}.dark .hero{background:#07090d}.dark .hero-panel{background:var(--surface)}.dark .scope-card,.dark .timeline-section{background:#171c25}.dark .method{background:#202732}.dark .next{background:#11151d}.dark .footer{color:#ffffffa8}.dark .hero-copy>p{color:#d7dce5}@media(max-width:760px){header,.hero,.section,.method,.investment-section,.next{padding-left:22px;padding-right:22px}header{align-items:flex-start;flex-direction:column;padding-top:20px;padding-bottom:20px}.hero-shell,.split,.method .container,.investment-grid,.next-grid{grid-template-columns:1fr;gap:38px;padding-top:42px}.scope-grid,.timeline{grid-template-columns:1fr}.section,.method,.next{padding-top:62px;padding-bottom:62px}.hero-panel>strong{margin:28px 0}.hero-copy>p,.lead{font-size:18px}.timeline{margin-top:28px}.signals{gap:8px}.investment-grid{padding:26px 0}.investment-card{padding:24px}nav{gap:14px}}
  </style>
</head>
<body class="proposal ${template.layout}">
  <header><div>${logo}</div><nav><a href="#escopo">Escopo</a><a href="#metodo">Método</a><a href="#investimento">Investimento</a><a href="#proximos-passos">Próximos passos</a></nav></header>
  <main>
    <section class="hero"><div class="hero-shell"><div class="hero-copy"><span class="eyebrow">Proposta comercial privada</span><h1>${escapeHtml(content.headline)}</h1><p>${escapeHtml(content.summary)}</p></div><aside class="hero-panel"><span>Direção da proposta</span><strong>${escapeHtml(content.title)}</strong><div class="signals">${signalItems}</div></aside></div></section>
    <section class="section" id="escopo"><div class="container split"><div><span class="section-label">Objetivo</span><h2>Uma proposta pensada para gerar avanço.</h2><p class="lead">${escapeHtml(content.objective)}</p></div><div><span class="section-label">Escopo da parceria</span><div class="scope-grid">${scopeCards(content.scope)}</div></div></div></section>
    <section class="method" id="metodo"><div class="container"><div><span class="section-label">Método</span><h2>Ritmo claro, decisões bem conduzidas.</h2></div><ol class="method-list">${numberedList(content.method, 'method-step')}</ol></div></section>
    <section class="section timeline-section"><div class="container"><span class="section-label">Cronograma</span><h2>Como a entrega evolui.</h2><ol class="timeline">${numberedList(content.timeline, 'timeline-item')}</ol></div></section>
    <section class="investment-section" id="investimento"><div class="investment-grid"><div><span class="section-label">Investimento</span><h2>Uma estrutura pronta para sair do plano e ganhar forma.</h2></div><aside class="investment-card"><span>Condições comerciais</span><p>${escapeHtml(content.investment)}</p></aside></div></section>
    <section class="next" id="proximos-passos"><div class="next-grid"><div><span class="section-label">Próximos passos</span><h2>Quando fizer sentido, seguimos daqui.</h2></div><ol class="next-list">${numberedList(content.nextSteps, 'next-item')}</ol></div></section>
  </main>
  <footer class="footer">${supplierName} · Proposta privada</footer>
</body>
</html>`;
}
