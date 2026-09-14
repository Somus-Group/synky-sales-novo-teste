export type ZeroService = {
  id: string;
  title: string;
  description: string;
  quantity: number;
  unitCents: number | null;
  billing: 'monthly' | 'once';
};
export type ZeroDraft = {
  schemaVersion: 1;
  title: string;
  client: string;
  supplier: string;
  email: string;
  phone: string;
  objective: string;
  briefing: string;
  timeline: string;
  terms: string;
  exclusions: string;
  validity: string;
  months: number;
  discountPercent: number;
  design: 'editorial' | 'contrast' | 'compact';
  accent: string;
  serif: boolean;
  logo: string;
  referenceUrl: string;
  services: ZeroService[];
};
export type ZeroSaved = {
  id: string;
  revision: number;
  updatedAt: number;
  draft: ZeroDraft;
};
export type ZeroSummary = {
  id: string;
  title: string;
  client: string;
  revision: number;
  updatedAt: number;
};

export const zeroCatalog = [
  {
    key: 'finance',
    title: 'BPO financeiro',
    description:
      'Conciliação bancária\nContas a pagar e a receber\nFluxo de caixa\nRelatório financeiro',
    billing: 'monthly',
  },
  {
    key: 'sales',
    title: 'Operação comercial',
    description:
      'Organização do CRM\nAcompanhamento do funil\nRotina de follow-up\nRelatório comercial',
    billing: 'monthly',
  },
  {
    key: 'ads',
    title: 'Gestão de tráfego',
    description:
      'Planejamento de campanhas\nConfiguração de anúncios\nAcompanhamento e otimização\nRelatório de desempenho',
    billing: 'monthly',
  },
  {
    key: 'content',
    title: 'Conteúdo e redes sociais',
    description:
      'Planejamento editorial\nProdução de conteúdo\nRevisão e aprovação\nProgramação de publicações',
    billing: 'monthly',
  },
  {
    key: 'consulting',
    title: 'Consultoria',
    description:
      'Diagnóstico do cenário\nPlano de ação\nReunião de alinhamento\nDocumento de recomendações',
    billing: 'once',
  },
  {
    key: 'website',
    title: 'Site e presença digital',
    description:
      'Estrutura de páginas\nLayout responsivo\nImplementação\nRevisão e entrega',
    billing: 'once',
  },
] as const;

export function emptyZeroDraft(supplier = ''): ZeroDraft {
  return {
    schemaVersion: 1,
    title: 'Proposta comercial',
    client: '',
    supplier,
    email: '',
    phone: '',
    objective: '',
    briefing: '',
    timeline: '',
    terms: '',
    exclusions: '',
    validity: '',
    months: 0,
    discountPercent: 0,
    design: 'editorial',
    accent: '#126a52',
    serif: true,
    logo: '',
    referenceUrl: '',
    services: [],
  };
}

export function normalizeZeroDraft(value: unknown): ZeroDraft {
  if (!value || typeof value !== 'object')
    throw new Error('Revise os dados da proposta.');
  const p = value as Record<string, unknown>;
  const text = (key: string, max = 240) => {
    if (typeof p[key] !== 'string' || (p[key] as string).length > max)
      throw new Error('Campo inválido: ' + key);
    return (p[key] as string).trim();
  };
  const number = (key: string, max: number) => {
    const n = p[key];
    if (typeof n !== 'number' || !Number.isFinite(n) || n < 0 || n > max)
      throw new Error('Valor inválido: ' + key);
    return n;
  };
  if (
    p.schemaVersion !== 1 ||
    !['editorial', 'contrast', 'compact'].includes(String(p.design)) ||
    !/^#[\da-f]{6}$/i.test(String(p.accent)) ||
    typeof p.serif !== 'boolean'
  )
    throw new Error('Escolha um visual válido.');
  const logo = text('logo', 300);
  if (logo && !/^\/api\/assets\/[a-zA-Z0-9_-]{8,100}$/.test(logo))
    throw new Error('Escolha uma logo da sua biblioteca.');
  if (!Array.isArray(p.services) || p.services.length > 24)
    throw new Error('Use até 24 serviços.');
  const ids = new Set<string>();
  const services = p.services.map((value) => {
    if (!value || typeof value !== 'object')
      throw new Error('Serviço inválido.');
    const s = value as ZeroService;
    if (
      typeof s.id !== 'string' ||
      !/^[\w-]{1,80}$/.test(s.id) ||
      ids.has(s.id) ||
      typeof s.title !== 'string' ||
      s.title.length > 160 ||
      typeof s.description !== 'string' ||
      s.description.length > 4000 ||
      !Number.isInteger(s.quantity) ||
      s.quantity < 1 ||
      s.quantity > 10000 ||
      !(
        s.unitCents === null ||
        (Number.isInteger(s.unitCents) &&
          s.unitCents >= 0 &&
          s.unitCents <= 100000000)
      ) ||
      !['once', 'monthly'].includes(s.billing)
    )
      throw new Error('Revise título, quantidade e valor de cada serviço.');
    ids.add(s.id);
    return {
      id: s.id,
      title: s.title.trim(),
      description: s.description.trim(),
      quantity: s.quantity,
      unitCents: s.unitCents,
      billing: s.billing,
    };
  });
  const months = number('months', 120);
  if (!Number.isInteger(months))
    throw new Error('Informe a vigência em meses inteiros.');
  return {
    schemaVersion: 1,
    title: text('title', 160),
    client: text('client'),
    supplier: text('supplier'),
    email: text('email'),
    phone: text('phone'),
    objective: text('objective', 8000),
    briefing: text('briefing', 24000),
    timeline: text('timeline', 4000),
    terms: text('terms', 6000),
    exclusions: text('exclusions', 4000),
    validity: text('validity', 160),
    months,
    discountPercent: Math.round(number('discountPercent', 100) * 100) / 100,
    design: p.design as ZeroDraft['design'],
    accent: p.accent as string,
    serif: p.serif,
    logo,
    referenceUrl: text('referenceUrl', 4096),
    services,
  };
}

export function zeroTotals(draft: ZeroDraft) {
  let monthly = 0,
    once = 0;
  for (const s of draft.services) {
    const amount = (s.unitCents ?? 0) * s.quantity;
    if (s.billing === 'monthly') monthly += amount;
    else once += amount;
  }
  const monthlyDiscount = Math.round((monthly * draft.discountPercent) / 100);
  const onceDiscount = Math.round((once * draft.discountPercent) / 100);
  return {
    monthly: monthly - monthlyDiscount,
    once: once - onceDiscount,
    subtotal: monthly + once,
    discount: monthlyDiscount + onceDiscount,
    initial: monthly + once - monthlyDiscount - onceDiscount,
    contract: draft.months
      ? (monthly - monthlyDiscount) * draft.months + once - onceDiscount
      : null,
    pending: draft.services.some((s) => s.unitCents === null),
  };
}
export const zeroMoney = (cents: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
    cents / 100,
  );

export function zeroReadiness(draft: ZeroDraft) {
  const missing = [];
  if (!draft.client.trim()) missing.push('Cliente');
  if (!draft.supplier.trim()) missing.push('Fornecedor');
  if (!draft.title.trim()) missing.push('Título');
  if (!draft.services.length) missing.push('Pelo menos um serviço');
  if (draft.services.some((s) => !s.title.trim()))
    missing.push('Nome dos serviços');
  return missing;
}

// Explicit labels only: unknown text stays intact in the briefing. This is a
// deterministic import, not a claim that a model understood the document.
export function readZeroBrief(text: string) {
  const fields: Partial<
    Pick<
      ZeroDraft,
      | 'client'
      | 'title'
      | 'objective'
      | 'timeline'
      | 'terms'
      | 'exclusions'
      | 'validity'
    >
  > = {};
  const warnings: string[] = [];
  const limits = {
    client: 240,
    title: 160,
    objective: 8000,
    timeline: 4000,
    terms: 6000,
    exclusions: 4000,
    validity: 160,
  };
  const labels: Record<string, keyof typeof fields> = {
    cliente: 'client',
    empresa: 'client',
    projeto: 'title',
    titulo: 'title',
    objetivo: 'objective',
    prazo: 'timeline',
    cronograma: 'timeline',
    condicoes: 'terms',
    exclusoes: 'exclusions',
    'nao incluso': 'exclusions',
    validade: 'validity',
  };
  for (const line of text.split(/\r?\n/)) {
    const colon = line.indexOf(':');
    if (colon < 0) continue;
    const key = line
      .slice(0, colon)
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
    const target = labels[key];
    if (target && !fields[target]) {
      const value = line.slice(colon + 1).trim();
      if (value.length > limits[target])
        warnings.push(
          `O campo ${line.slice(0, colon).trim()} excede o limite e permanece apenas no briefing original.`,
        );
      else fields[target] = value;
    }
  }
  const normalized = text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  const patterns = [
    /bpo|financeir|conciliacao/,
    /crm|comercial|follow.up/,
    /trafego|anuncios|google ads|meta ads/,
    /conteudo|posts|redes sociais/,
    /consultoria|diagnostico/,
    /website|landing page|\bsite\b/,
  ];
  return {
    fields,
    warnings,
    suggestions: zeroCatalog
      .filter((_item, i) => patterns[i].test(normalized))
      .map((item) => item.key),
  };
}

const escape = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
const lines = (value: string) =>
  value
    .split(/\r?\n/)
    .filter((line) => line.trim())
    .map((line) => `<p>${escape(line)}</p>`)
    .join('');

export function renderZeroProposal(
  draft: ZeroDraft,
  assetOrigin = '',
  embeddedLogo = '',
) {
  const d = normalizeZeroDraft(draft);
  const totals = zeroTotals(d);
  const accent = d.accent;
  const rgb = accent
    .slice(1)
    .match(/../g)!
    .map((v) => parseInt(v, 16));
  const onAccent =
    rgb[0] * 0.299 + rgb[1] * 0.587 + rgb[2] * 0.114 > 155
      ? '#18231f'
      : '#ffffff';
  const logo =
    embeddedLogo &&
    /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/.test(embeddedLogo)
      ? embeddedLogo
      : d.logo
        ? assetOrigin + d.logo
        : '';
  const serviceRows = d.services
    .map(
      (s, index) =>
        `<article class="service"><div class="number">${String(index + 1).padStart(2, '0')}</div><div><h3>${escape(s.title || 'Serviço sem título')}</h3>${lines(s.description)}</div><div class="service-meta">${s.quantity} ${s.quantity === 1 ? 'unidade' : 'unidades'}<br>${s.billing === 'monthly' ? 'Mensal' : 'Pagamento único'}</div></article>`,
    )
    .join('');
  const priceRows = d.services
    .map(
      (s) =>
        `<tr><td>${escape(s.title || 'Serviço')}</td><td>${s.quantity}</td><td>${s.billing === 'monthly' ? 'Mensal' : 'Único'}</td><td>${s.unitCents === null ? 'A definir' : zeroMoney(s.unitCents * s.quantity)}</td></tr>`,
    )
    .join('');
  const scope = `<section id="escopo"><div class="section-label">01 / Entregas</div><h2>Escopo da proposta</h2>${serviceRows || '<p class="draft-note">Nenhum serviço selecionado.</p>'}</section>`;
  const investment = `<section id="investimento"><div class="section-label">02 / Investimento</div><h2>Uma composição transparente.</h2><div class="table-wrap"><table><thead><tr><th>Serviço</th><th>Qtd.</th><th>Recorrência</th><th>Valor</th></tr></thead><tbody>${priceRows}</tbody></table></div>${totals.pending ? '<p>Valores pendentes de definição. Os totais abaixo consideram somente os itens precificados.</p>' : ''}${totals.discount ? `<p>Desconto de ${d.discountPercent}%: ${zeroMoney(totals.discount)} sobre os valores mensais e únicos desta composição.</p>` : ''}<div class="totals">${d.services.some((s) => s.billing === 'monthly') ? `<div><span>Mensalidade${totals.pending ? ' parcial' : ''}</span><strong>${zeroMoney(totals.monthly)}</strong></div>` : ''}${d.services.some((s) => s.billing === 'once') ? `<div><span>Pagamento único${totals.pending ? ' parcial' : ''}</span><strong>${zeroMoney(totals.once)}</strong></div>` : ''}${d.months && totals.contract !== null ? `<div><span>Total em ${d.months} meses${totals.pending ? ' (parcial)' : ''}</span><strong>${zeroMoney(totals.contract)}</strong></div>` : ''}</div></section>`;
  const conditions =
    d.timeline || d.terms || d.exclusions || d.validity || d.months
      ? `<section id="condicoes"><div class="section-label">03 / Alinhamento</div><h2>Condições e próximos passos</h2><div class="conditions">${d.timeline ? `<div><h3>Cronograma</h3>${lines(d.timeline)}</div>` : ''}${d.terms ? `<div><h3>Condições comerciais</h3>${lines(d.terms)}</div>` : ''}${d.exclusions ? `<div><h3>Fora do escopo</h3>${lines(d.exclusions)}</div>` : ''}${d.validity || d.months ? `<div><h3>Vigência e validade</h3>${d.months ? `<p>Vigência: ${d.months} meses.</p>` : ''}${d.validity ? `<p>Validade da proposta: ${escape(d.validity)}.</p>` : ''}</div>` : ''}</div></section>`
      : '';
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'none'; style-src 'unsafe-inline'; img-src 'self' data:; font-src 'none'; connect-src 'none'; frame-src 'none'; base-uri 'none'; form-action 'none'"><title>${escape(d.title)}</title><style>
p,h3,.summary,.brandbar,.closing{overflow-wrap:anywhere}.service>*,.conditions>*{min-width:0}
*{box-sizing:border-box;letter-spacing:0}html{scroll-behavior:smooth}body{margin:0;color:#202623;background:#fff;font:16px/1.65 Arial,sans-serif}h1,h2,h3,p{margin:0}h1,h2{font-family:${d.serif ? 'Georgia,serif' : 'Arial,sans-serif'};font-weight:${d.serif ? '400' : '700'};line-height:1.14;overflow-wrap:anywhere}h1{font-size:52px;max-width:900px}h2{font-size:34px;margin:10px 0 28px}h3{font-size:19px;line-height:1.4;margin-bottom:10px}p+p{margin-top:8px}img{max-width:100%}.brandbar{display:flex;align-items:center;justify-content:space-between;gap:24px;padding:28px 6%;border-bottom:1px solid #dfe5e1}.brandbar img{width:155px;max-height:68px;object-fit:contain;object-position:left}.brandbar strong{font-size:21px;overflow-wrap:anywhere}.brandbar small{font-size:12px;text-transform:uppercase}.hero{padding:64px 6% 48px;border-bottom:6px solid ${accent}}.hero .eyebrow,.section-label{font-size:12px;text-transform:uppercase;letter-spacing:0;color:${accent};font-weight:700}.hero h1{margin:18px 0 26px}.hero .client{font-size:20px}.intro{max-width:820px;margin-top:34px;border-top:1px solid #dfe5e1;padding-top:24px}.intro p{white-space:pre-wrap}.summary{display:flex;gap:36px;flex-wrap:wrap;margin-top:34px;font-size:14px}.summary strong{display:block;font-size:21px}.body-grid>section{padding:48px 6%;border-bottom:1px solid #dfe5e1}.service{display:grid;grid-template-columns:42px 1fr 140px;gap:20px;padding:24px 0;border-top:1px solid #dfe5e1;break-inside:avoid}.number{color:${accent};font-size:24px}.service-meta{font-size:13px;color:#5b665f;text-align:right}.table-wrap{overflow-x:auto}table{width:100%;border-collapse:collapse;font-size:14px}th{text-align:left;color:#5b665f;font-size:12px;text-transform:uppercase}td,th{padding:14px 8px;border-bottom:1px solid #dfe5e1;overflow-wrap:anywhere}td:last-child,th:last-child{text-align:right}.totals{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:20px;margin-top:28px}.totals>div{padding:22px 0;border-top:3px solid ${accent}}.totals span{display:block;font-size:13px}.totals strong{font-size:25px;overflow-wrap:anywhere}.conditions{display:grid;grid-template-columns:1fr 1fr;gap:30px}.conditions p{white-space:pre-wrap}.closing{padding:40px 6%;background:#f1f5f2;display:flex;justify-content:space-between;gap:24px;flex-wrap:wrap}.closing strong{font-size:22px}.contact{font-size:14px;overflow-wrap:anywhere}.draft-note{color:#6d746f}.contrast .hero{background:${accent};color:${onAccent};border-color:#d0eb65}.contrast .hero .eyebrow{color:inherit}.contrast .intro{border-color:currentColor}.contrast .summary{padding-top:20px}.contrast .body-grid #investimento{background:#f3f6f4}.contrast .service{grid-template-columns:55px 1fr 140px}.compact .hero{padding:36px 6%}.compact h1{font-size:38px}.compact h2{font-size:27px}.compact .body-grid>section{padding:30px 6%}.compact .service{padding:16px 0}.compact .intro{margin-top:20px;padding-top:18px}.compact .summary{margin-top:20px}.editorial .hero{border-left:18px solid ${accent}}.editorial .service h3{font-family:Georgia,serif;font-size:23px}@media(max-width:600px){h1{font-size:34px}h2{font-size:28px}.compact h1{font-size:32px}.brandbar{padding:22px 6%;align-items:flex-start}.brandbar small{display:none}.hero{padding:34px 6%}.body-grid>section{padding:32px 6%}.service,.contrast .service{grid-template-columns:28px minmax(0,1fr);gap:12px}.service-meta{grid-column:2;text-align:left}.conditions{grid-template-columns:1fr}.totals{grid-template-columns:1fr}.editorial .hero{border-left-width:8px}.closing{display:block}.contact{margin-top:12px}td,th{padding:10px 4px;font-size:12px}.summary{gap:20px}}@media print{@page{size:A4;margin:14mm}body{font-size:11pt}.brandbar,.hero,.body-grid>section,.closing{padding:20px 0}.hero{border-left:0!important}h1{font-size:32pt}h2{font-size:24pt}h3{font-size:15pt}.hero,.contrast .hero{background:#fff;color:#202623}.hero .eyebrow{color:${accent}}.totals,.conditions{break-inside:avoid}h2,h3{break-after:avoid}.table-wrap{overflow:visible}thead{display:table-header-group}tr{break-inside:avoid}.closing{background:#fff}*{print-color-adjust:exact;-webkit-print-color-adjust:exact}}
</style></head><body class="${d.design}"><header class="brandbar"><div>${logo ? `<img src="${escape(logo)}" alt="${escape(d.supplier || 'Fornecedor')}">` : `<strong>${escape(d.supplier || 'Fornecedor a definir')}</strong>`}</div><small>Proposta comercial</small></header><main><section class="hero"><div class="eyebrow">${escape(d.supplier || 'Proposta personalizada')}</div><h1>${escape(d.title || 'Proposta comercial')}</h1><p class="client">Para ${escape(d.client || 'cliente a definir')}</p>${d.objective ? `<div class="intro">${lines(d.objective)}</div>` : ''}<div class="summary">${d.services.length ? `<div><span>Frentes de trabalho</span><strong>${d.services.length}</strong></div>` : ''}${d.months ? `<div><span>Vigência</span><strong>${d.months} meses</strong></div>` : ''}${d.validity ? `<div><span>Validade</span><strong>${escape(d.validity)}</strong></div>` : ''}</div></section><div class="body-grid">${d.design === 'compact' ? investment + scope : scope + investment}${conditions}</div></main><footer class="closing"><div><strong>${escape(d.supplier)}</strong><p>${escape(d.client ? 'Proposta preparada para ' + d.client + '.' : '')}</p></div><div class="contact">${d.email ? `<p>${escape(d.email)}</p>` : ''}${d.phone ? `<p>${escape(d.phone)}</p>` : ''}</div></footer></body></html>`;
}
