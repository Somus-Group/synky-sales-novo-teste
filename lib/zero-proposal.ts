import { zeroProposalStyles } from './zero-proposal-styles';

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
  cover: string;
  gallery: Array<{ url: string; caption: string }>;
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

export const zeroCovers = [
  {
    url: '/team/organization-office.png',
    name: 'Negócios',
    alt: 'Ambiente corporativo com vista para a cidade',
  },
  {
    url: '/proposal/campaign-cover.png',
    name: 'Campanha',
    alt: 'Composição de papel e vidro coloridos',
  },
  {
    url: '/proposal/architecture-cover.png',
    name: 'Arquitetura',
    alt: 'Arquitetura residencial e paisagem',
  },
  {
    url: '/proposal/editorial-cover.png',
    name: 'Interiores',
    alt: 'Interior com luz natural e materiais',
  },
] as const;

export function zeroCover(draft: ZeroDraft): string {
  if (draft.cover && draft.cover !== 'auto') return draft.cover;
  const scope = draft.services
    .map((s) => s.title)
    .join(' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  if (/arquitet|interior/.test(scope)) return zeroCovers[2].url;
  if (/trafego|conteudo|marketing|design|site|digital/.test(scope))
    return zeroCovers[1].url;
  return zeroCovers[0].url;
}

export function zeroImagePaths(draft: ZeroDraft): string[] {
  return Array.from(
    new Set(
      [
        draft.logo,
        zeroCover(draft),
        ...draft.gallery.map((item) => item.url),
      ].filter(Boolean),
    ),
  );
}

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
    cover: 'auto',
    gallery: [],
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
  const cover = p.cover === undefined ? 'auto' : p.cover;
  const ownedImage = (url: unknown): url is string =>
    typeof url === 'string' &&
    /^\/api\/assets\/[a-zA-Z0-9_-]{8,100}$/.test(url);
  if (
    cover !== 'auto' &&
    !zeroCovers.some((item) => item.url === cover) &&
    !ownedImage(cover)
  )
    throw new Error('Escolha uma capa válida.');
  const gallery = p.gallery === undefined ? [] : p.gallery;
  if (!Array.isArray(gallery) || gallery.length > 6)
    throw new Error('Escolha até seis imagens.');
  const images = gallery.map((item) => {
    if (
      !item ||
      !ownedImage(item.url) ||
      typeof item.caption !== 'string' ||
      item.caption.length > 240
    )
      throw new Error('Imagem ou legenda inválida.');
    return { url: item.url, caption: item.caption.trim() };
  });
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
    cover: cover as string,
    gallery: images,
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
  embeddedImages: Record<string, string> = {},
) {
  const d = normalizeZeroDraft(draft);
  const totals = zeroTotals(d);
  const rgb = d.accent
    .slice(1)
    .match(/../g)!
    .map((v) => parseInt(v, 16) / 255)
    .map((v) =>
      v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4),
    );
  const luminance = rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
  const onAccent = luminance > 0.179 ? '#000000' : '#ffffff';
  const ink = luminance > 0.18 ? '#294d3b' : d.accent;
  const dataImage = (value: string) =>
    /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/.test(value);
  const imageUrl = (path: string) =>
    dataImage(embeddedImages[path] || '')
      ? embeddedImages[path]
      : assetOrigin + path;
  const logo = dataImage(embeddedLogo)
    ? embeddedLogo
    : d.logo
      ? imageUrl(d.logo)
      : '';
  const cover = zeroCover(d);
  const coverAlt =
    zeroCovers.find((item) => item.url === cover)?.alt ||
    'Imagem de capa selecionada';
  const middle = [
    '02',
    ...(d.timeline ? ['03'] : []),
    ...(d.gallery.length ? ['04'] : []),
  ];
  const order = [
    '01',
    ...(d.design === 'compact' ? ['05', ...middle] : [...middle, '05']),
    ...(d.terms || d.exclusions ? ['06'] : []),
    '07',
  ];
  const label = (number: string, title: string) =>
    `<span class="section-label">${String(order.indexOf(number) + 1).padStart(2, '0')} / ${title}</span>`;
  const heading = (
    number: string,
    category: string,
    title: string,
    aside = '',
  ) =>
    `<div class="section-heading"><div>${label(number, category)}<h2>${title}</h2></div>${aside ? `<span>${aside}</span>` : ''}</div>`;
  const facts = `<dl class="facts"><div><dt>Preparada para</dt><dd>${escape(d.client || 'Cliente a definir')}</dd></div>${d.services.length ? `<div><dt>Frentes de trabalho</dt><dd>${String(d.services.length).padStart(2, '0')}</dd></div>` : ''}${d.months ? `<div><dt>Vigência</dt><dd>${d.months} meses</dd></div>` : ''}${d.validity ? `<div><dt>Validade da proposta</dt><dd>${escape(d.validity)}</dd></div>` : ''}</dl>`;
  const context = `<section class="section"><div class="wrap overview"><div>${label('01', 'O projeto')}<h2>${escape(d.title || 'Proposta comercial')}</h2>${d.objective ? `<div class="prose">${lines(d.objective)}</div>` : '<p class="draft-note">Objetivo a definir.</p>'}</div>${facts}</div></section>`;
  const serviceRows = d.services
    .map(
      (s, index) =>
        `<article class="service"><div class="service-top"><span class="service-icon" aria-hidden="true">${String(index + 1).padStart(2, '0')}</span><small>${s.billing === 'monthly' ? 'RECORRENTE' : 'PROJETO'}</small></div><h3>${escape(s.title || 'Serviço a definir')}</h3><ul class="deliverables">${s.description
          .split(/\r?\n/)
          .filter((line) => line.trim())
          .map(
            (line) =>
              `<li><span aria-hidden="true">&#10003;</span><span>${escape(line)}</span></li>`,
          )
          .join(
            '',
          )}</ul><div class="service-bottom"><span>${s.quantity} ${s.quantity === 1 ? 'unidade' : 'unidades'}</span><span>${s.billing === 'monthly' ? 'Cobrança mensal' : 'Pagamento único'}</span></div></article>`,
    )
    .join('');
  const scope = `<section id="escopo" class="section scope"><div class="wrap">${heading('02', 'Escopo de trabalho', 'O que está incluído.', d.services.length ? `${d.services.length} frentes de trabalho` : '')}<div class="services">${serviceRows || '<p class="draft-note">Nenhum serviço selecionado.</p>'}</div></div></section>`;
  const steps = d.timeline.split(/\r?\n/).filter((line) => line.trim());
  const process = steps.length
    ? `<section id="cronograma" class="section"><div class="wrap">${heading('03', 'Cronograma', 'Etapas do projeto.')}<ol class="process${steps.length === 1 ? ' single' : ''}">${steps.map((step, index) => `<li><div class="step-number" aria-hidden="true">${String(index + 1).padStart(2, '0')}</div><p>${escape(step)}</p></li>`).join('')}</ol></div></section>`
    : '';
  const gallery = d.gallery.length
    ? `<section class="section"><div class="wrap">${heading('04', 'Seleção visual', 'Referências do projeto.')}<div class="portfolio">${d.gallery.map((item) => `<figure><img src="${escape(imageUrl(item.url))}" alt="${escape(item.caption || 'Imagem selecionada para a proposta')}" width="800" height="600" loading="lazy">${item.caption ? `<figcaption>${escape(item.caption)}</figcaption>` : ''}</figure>`).join('')}</div></div></section>`
    : '';
  const monthlyPending = d.services.some(
    (s) => s.billing === 'monthly' && s.unitCents === null,
  );
  const oncePending = d.services.some(
    (s) => s.billing === 'once' && s.unitCents === null,
  );
  const priceRows = d.services
    .map(
      (s) =>
        `<tr><td>${escape(s.title || 'Serviço')}</td><td>${s.quantity}</td><td>${s.billing === 'monthly' ? 'Mensal' : 'Único'}</td><td>${s.unitCents === null ? 'A definir' : zeroMoney(s.unitCents * s.quantity)}</td></tr>`,
    )
    .join('');
  const totalBlock = (name: string, amount: number, note: string) =>
    `<div class="total"><span>${name}</span><strong>${zeroMoney(amount)}</strong>${note ? `<small>${note}</small>` : ''}</div>`;
  const investment = `<section id="investimento" class="section investment"><div class="wrap">${heading('05', 'Investimento', 'Valores e condições.')}<div class="totals">${d.services.some((s) => s.billing === 'monthly') ? totalBlock('Mensalidade' + (monthlyPending ? ' parcial' : ''), totals.monthly, 'por mês') : ''}${d.services.some((s) => s.billing === 'once') ? totalBlock('Pagamento único' + (oncePending ? ' parcial' : ''), totals.once, 'sem recorrência') : ''}${d.months && totals.contract !== null ? totalBlock(`Total em ${d.months} meses${totals.pending ? ' (parcial)' : ''}`, totals.contract, 'mensalidades + pagamentos únicos') : ''}</div>${totals.pending ? '<p class="investment-note">Valores pendentes de definição. Os totais consideram somente os itens precificados.</p>' : ''}${totals.discount ? `<p class="investment-note">Desconto de ${d.discountPercent}% aplicado aos valores mensais e únicos. Desconto nesta composição: ${zeroMoney(totals.discount)}.</p>` : ''}<details class="price-detail" open><summary>Composição do investimento</summary><div class="table-wrap"><table><thead><tr><th>Serviço</th><th>Qtd.</th><th>Recorrência</th><th>Valor</th></tr></thead><tbody>${priceRows}</tbody></table></div></details></div></section>`;
  const conditions =
    d.terms || d.exclusions
      ? `<section id="condicoes" class="section"><div class="wrap">${heading('06', 'Alinhamento', 'Combinados com clareza.')}<div class="conditions">${d.terms ? `<div><h3>Condições comerciais</h3>${lines(d.terms)}</div>` : ''}${d.exclusions ? `<div><h3>Fora do escopo</h3>${lines(d.exclusions)}</div>` : ''}</div></div></section>`
      : '';
  const email = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(d.email)
    ? `mailto:${encodeURIComponent(d.email)}?subject=${encodeURIComponent('Proposta: ' + d.title)}`
    : '';
  const phone = d.phone.replace(/[^\d]/g, '');
  const whatsapp =
    phone.length >= 10 && phone.length <= 15
      ? `https://wa.me/${phone.length <= 11 ? '55' + phone : phone}?text=${encodeURIComponent('Olá, gostaria de conversar sobre a proposta ' + d.title + '.')}`
      : '';
  const contact =
    email || whatsapp
      ? `<div class="contact">${email ? `<a href="${escape(email)}" target="_blank" rel="noopener noreferrer">Conversar sobre a proposta <span aria-hidden="true">&#8599;</span></a>` : ''}${whatsapp ? `<a class="secondary" href="${escape(whatsapp)}" target="_blank" rel="noopener noreferrer">WhatsApp <span aria-hidden="true">&#8599;</span></a>` : ''}</div>`
      : '';
  const closing = `<footer class="closing"><div class="wrap"><div class="closing-row"><div>${label('07', 'Próxima conversa')}<h2>Vamos alinhar os próximos passos?</h2>${d.client ? `<p>Proposta preparada para ${escape(d.client)}.</p>` : ''}${contact}</div></div><div class="signature"><strong>${escape(d.supplier)}</strong><span>${escape([d.email, d.phone].filter(Boolean).join(' / '))}</span></div></div></footer>`;
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'none'; style-src 'unsafe-inline'; img-src 'self' data:; font-src 'none'; connect-src 'none'; frame-src 'none'; base-uri 'none'; form-action 'none'"><title>${escape(d.title)}</title><style>${zeroProposalStyles}</style></head><body class="${d.design}" style="--accent:${d.accent};--ink:${ink};--on-accent:${onAccent};--display:${d.serif ? 'Georgia,serif' : 'Arial,sans-serif'};--weight:${d.serif ? 400 : 700}"><header class="brandbar wrap"><div class="brand">${logo ? `<img src="${escape(logo)}" alt="${escape(d.supplier || 'Fornecedor')}">` : escape(d.supplier || 'Sua empresa')}</div><nav aria-label="Seções da proposta"><a href="#escopo">Escopo</a>${steps.length ? '<a href="#cronograma">Etapas</a>' : ''}<a href="#investimento">Investimento</a></nav></header><main><section class="hero"><img class="hero-media" src="${escape(imageUrl(cover))}" alt="${escape(coverAlt)}" width="1536" height="1024" fetchpriority="high"><div class="wrap hero-copy"><div class="eyebrow">Proposta comercial / ${escape(d.supplier || 'Sua empresa')}</div><h1${d.title.length > 85 ? ' class="long-title"' : ''}>${escape(d.title || 'Proposta comercial')}</h1><p class="client">Preparada para ${escape(d.client || 'cliente a definir')}</p><div class="hero-foot"><span>${d.validity ? `Validade: ${escape(d.validity)}` : 'Escopo, investimento e próximos passos'}</span><a href="#escopo">Ver proposta <span aria-hidden="true">&#8595;</span></a></div></div></section>${context}${d.design === 'compact' ? investment + scope + process + gallery : scope + process + gallery + investment}${conditions}</main>${closing}</body></html>`;
}
