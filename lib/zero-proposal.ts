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
  {
    url: '/proposal/chrome-cover.png',
    name: 'Tecnologia',
    alt: 'Composição metálica em azul e prata',
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
  if (/interior|decoracao|ambientes/.test(scope)) return zeroCovers[3].url;
  if (/arquitet|construcao|engenharia/.test(scope)) return zeroCovers[2].url;
  if (/software|aplicativ|sistema|automacao|tecnolog|saas|integrac/.test(scope))
    return zeroCovers[4].url;
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
  const client = escape(d.client || 'Seu próximo projeto');
  const subject = escape(d.title || 'Proposta comercial');
  const servicePrice = (service: ZeroService) =>
    service.unitCents === null
      ? 'A definir'
      : zeroMoney(service.unitCents * service.quantity);
  const subtitle = (value: string) =>
    `<span class="section-label">${value}</span>`;
  const heading = (title: string, aside = '') =>
    `<div class="section-heading"><h2>${title}</h2>${aside ? `<span>${aside}</span>` : ''}</div>`;
  const facts = `<dl class="project-facts"><div><dt>Proposta de</dt><dd>${escape(d.supplier || 'Sua empresa')}</dd></div>${d.services.length ? `<div><dt>Escopo</dt><dd>${d.services.length} ${d.services.length === 1 ? 'serviço' : 'serviços'}</dd></div>` : ''}${d.months ? `<div><dt>Vigência</dt><dd>${d.months} meses</dd></div>` : ''}${d.validity ? `<div><dt>Validade</dt><dd>${escape(d.validity)}</dd></div>` : ''}</dl>`;
  const context = d.objective
    ? `<section id="objetivo" class="section context"><div class="wrap">${subtitle('O objetivo')}<div class="objective-copy${d.objective.length > 340 ? ' long-copy' : ''}">${lines(d.objective)}</div></div></section>`
    : '';
  const serviceRows = d.services
    .map((service, index) => {
      const items = service.description
        .split(/\r?\n/)
        .map((item) => item.trim())
        .filter(Boolean);
      const description = items.length
        ? `<ul class="deliverables">${items.map((item) => `<li>${escape(item)}</li>`).join('')}</ul>`
        : '';
      const number = String(index + 1).padStart(2, '0');
      const billing = service.billing === 'monthly' ? 'Mensal' : 'Pontual';
      const amount = `<div class="service-price"><strong>${servicePrice(service)}</strong><span>${service.billing === 'monthly' ? 'por mês' : 'pagamento único'}${service.quantity > 1 ? ` / ${service.quantity} unidades` : ''}</span></div>`;
      if (d.design === 'compact')
        return `<li class="scope-row"><div class="scope-name"><span class="service-number">${number}</span><h3>${escape(service.title)}</h3></div><div class="scope-description">${description}</div>${amount}</li>`;
      if (d.design === 'contrast')
        return `<article class="scope-tile"><div class="tile-top"><span class="service-number">${number}</span><span class="service-type">${billing}</span></div><h3>${escape(service.title)}</h3>${description}${amount}</article>`;
      return `<article class="scope-chapter"><div class="chapter-title"><span class="service-number">${number}</span><div><span class="service-type">${billing}</span><h3>${escape(service.title)}</h3></div></div><div class="chapter-content">${description}${amount}</div></article>`;
    })
    .join('');
  const scope = d.services.length
    ? `<section id="escopo" class="section scope"><div class="wrap">${subtitle('Escopo proposto')}${heading(d.design === 'contrast' ? 'O projeto, em partes.' : 'Serviços e entregas', String(d.services.length).padStart(2, '0') + ' / ' + (d.services.length === 1 ? 'serviço' : 'serviços'))}${d.design === 'compact' ? `<ol class="scope-ledger">${serviceRows}</ol>` : `<div class="${d.design === 'contrast' ? 'scope-grid' : 'scope-chapters'}">${serviceRows}</div>`}</div></section>`
    : '';
  const steps = d.timeline.split(/\r?\n/).filter((line) => line.trim());
  const process = steps.length
    ? `<section id="cronograma" class="section schedule"><div class="wrap">${subtitle('Plano de execução')}${heading('Etapas e prazos')}<ol class="process${steps.length === 1 ? ' single' : ''}">${steps
        .map((step, index) => {
          const separator = step.indexOf(':');
          const content =
            separator > 0 && separator < 120
              ? `<h3>${escape(step.slice(0, separator))}</h3><p>${escape(step.slice(separator + 1).trim())}</p>`
              : `<p>${escape(step)}</p>`;
          return `<li><span class="step-number" aria-hidden="true">${String(index + 1).padStart(2, '0')}</span><div>${content}</div></li>`;
        })
        .join('')}</ol></div></section>`
    : '';
  const gallery = d.gallery.length
    ? `<section id="referencias" class="section references"><div class="wrap">${subtitle('Seleção visual')}${heading('Referências do projeto')}<div class="portfolio">${d.gallery.map((item) => `<figure><img src="${escape(imageUrl(item.url))}" alt="${escape(item.caption || 'Imagem selecionada para a proposta')}" width="800" height="600" loading="lazy">${item.caption ? `<figcaption>${escape(item.caption)}</figcaption>` : ''}</figure>`).join('')}</div></div></section>`
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
  const investment = d.services.length
    ? `<section id="investimento" class="section investment"><div class="wrap">${subtitle('Condições da proposta')}${heading('Investimento', d.validity ? 'Validade: ' + escape(d.validity) : '')}<div class="totals">${d.services.some((s) => s.billing === 'monthly') ? totalBlock('Mensalidade' + (monthlyPending ? ' parcial' : ''), totals.monthly, 'por mês') : ''}${d.services.some((s) => s.billing === 'once') ? totalBlock('Pagamento único' + (oncePending ? ' parcial' : ''), totals.once, 'sem recorrência') : ''}${d.months && totals.contract !== null ? totalBlock(`Total em ${d.months} meses${totals.pending ? ' (parcial)' : ''}`, totals.contract, 'mensalidades + pagamentos únicos') : ''}</div>${totals.pending ? '<p class="investment-note">Valores pendentes de definição. Os totais consideram somente os itens precificados.</p>' : ''}${totals.discount ? `<p class="investment-note">Desconto de ${d.discountPercent}% aplicado aos valores mensais e únicos. Desconto nesta composição: ${zeroMoney(totals.discount)}.</p>` : ''}<details class="price-detail" open><summary>Composição do investimento</summary><div class="table-wrap"><table><thead><tr><th>Serviço</th><th>Qtd.</th><th>Recorrência</th><th>Valor</th></tr></thead><tbody>${priceRows}</tbody></table></div></details></div></section>`
    : '';
  const conditions =
    d.terms || d.exclusions
      ? `<section id="condicoes" class="section agreements"><div class="wrap">${subtitle('Alinhamento')}${heading('Condições e limites')}<div class="conditions">${d.terms ? `<div><h3>Condições comerciais</h3>${lines(d.terms)}</div>` : ''}${d.exclusions ? `<div><h3>Fora do escopo</h3>${lines(d.exclusions)}</div>` : ''}</div></div></section>`
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
  const closing = `<footer class="closing"><div class="wrap">${contact ? `<div class="closing-row"><div>${subtitle('Contato')}<h2>${escape(d.supplier)}</h2></div>${contact}</div>` : ''}<div class="signature"><strong>${escape(d.supplier)}</strong><span>${d.client ? 'Preparada para ' + client : 'Proposta comercial'}</span><span>${escape([d.email, d.phone].filter(Boolean).join(' / '))}</span></div></div></footer>`;
  const nav = `${d.objective ? '<a href="#objetivo">Objetivo</a>' : ''}${d.services.length ? '<a href="#escopo">Escopo</a><a href="#investimento">Investimento</a>' : ''}`;
  const hero = `<section class="hero"><img class="hero-media" src="${escape(imageUrl(cover))}" alt="${escape(coverAlt)}" width="1536" height="1024" fetchpriority="high"><div class="wrap hero-copy"><span class="eyebrow">Proposta comercial</span><h1${(d.client || '').length > 40 ? ' class="long-title"' : ''}>${client}</h1><p class="hero-subject">${subject}</p>${d.services.length ? '<a class="hero-link" href="#escopo">Conhecer o escopo <span aria-hidden="true">&#8599;</span></a>' : ''}</div></section>`;
  const content =
    d.design === 'compact'
      ? investment + context + scope + process + gallery
      : d.design === 'contrast'
        ? scope + context + gallery + process + investment
        : context + scope + gallery + process + investment;
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'none'; style-src 'unsafe-inline'; img-src 'self' data:; font-src 'none'; connect-src 'none'; frame-src 'none'; base-uri 'none'; form-action 'none'"><title>${escape(d.title)}${d.client ? ' | ' + client : ''}</title><style>${zeroProposalStyles}</style></head><body class="${d.design}" style="--accent:${d.accent};--ink:${ink};--on-accent:${onAccent};--display:${d.serif ? 'Georgia,serif' : 'Arial,sans-serif'};--weight:${d.serif ? 400 : 700}"><header class="brandbar wrap"><div class="brand">${logo ? `<img src="${escape(logo)}" alt="${escape(d.supplier || 'Fornecedor')}">` : escape(d.supplier || 'Sua empresa')}</div><nav aria-label="Seções da proposta">${nav}</nav></header><main>${hero}<div class="project-strip"><div class="wrap">${facts}</div></div>${content}${conditions}</main>${closing}</body></html>`;
}
