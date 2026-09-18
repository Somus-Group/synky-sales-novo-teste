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
    alt: 'Materiais coloridos para apresentação de campanha',
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
    alt: 'Materiais metálicos em azul e prata',
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

/** A quiet canvas while the user is still describing the commercial request. */
export function renderZeroEmptyState(supplier = ''): string {
  const name = escape(supplier || 'Sua empresa');
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{box-sizing:border-box}html,body{min-height:100%;margin:0}body{display:grid;place-items:center;background:#f4f7fb;color:#172033;font:16px/1.5 Arial,sans-serif}.empty{width:min(760px,84%);padding:44px 0}.mark{display:grid;place-items:center;width:54px;height:54px;border-radius:18px;background:#176bed;color:#fff;font-size:24px;box-shadow:0 16px 36px #176bed33}.eyebrow{margin:28px 0 12px;color:#176bed;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase}.empty h1{max-width:560px;margin:0;font:700 clamp(34px,5vw,56px)/1.04 Arial,sans-serif;letter-spacing:0}.empty p{max-width:520px;margin:18px 0 0;color:#60708a;font-size:18px}.steps{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:44px}.steps div{min-width:0;padding:16px;border:1px solid #dbe4f0;border-radius:12px;background:#fff;color:#52627a;font-size:13px}.steps b{display:block;margin-bottom:6px;color:#172033;font-size:14px}@media(max-width:560px){.empty{padding:32px 0}.steps{grid-template-columns:1fr}.empty p{font-size:16px}}</style></head><body><main class="empty"><div class="mark">+</div><div class="eyebrow">${name}</div><h1>Uma proposta com a cara do projeto.</h1><p>Descreva o que foi combinado. A prévia aparece pronta para apresentar, sem texto inventado e sem uso de IA.</p><div class="steps"><div><b>Cliente</b>Para quem é a proposta.</div><div><b>Escopo</b>O que será entregue.</div><div><b>Valores</b>O que foi combinado.</div></div></main></body></html>`;
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
  media?: {
    logo?: string;
    cover?: string;
    gallery?: Array<{ url: string; caption: string }>;
  },
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
  const onAccent = luminance > 0.179 ? '#101513' : '#ffffff';
  const ink = luminance > 0.18 ? '#243c35' : d.accent;
  const dataImage = (v: string) =>
    /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/.test(v);
  const trustedMedia = (v: string | undefined) =>
    v && (/^studio-asset:[a-zA-Z0-9_-]+$/.test(v) || dataImage(v)) ? v : '';
  const imageUrl = (path: string) =>
    dataImage(embeddedImages[path] || '')
      ? embeddedImages[path]
      : assetOrigin + path;
  const logo =
    trustedMedia(media?.logo) ||
    (dataImage(embeddedLogo) ? embeddedLogo : d.logo ? imageUrl(d.logo) : '');
  const cover = trustedMedia(media?.cover) || imageUrl(zeroCover(d));
  const coverAlt =
    zeroCovers.find((c) => c.url === zeroCover(d))?.alt ||
    'Imagem selecionada para a proposta';
  const client = escape(d.client || 'Cliente');
  const subject = escape(d.title === 'Proposta comercial' ? '' : d.title);
  const num = (i: number) => String(i + 1).padStart(2, '0');
  const label = (value: string) =>
    '<span class="section-label">' + value + '</span>';
  const sectionHead = (eyebrow: string, title: string) =>
    '<div class="section-heading">' +
    label(eyebrow) +
    '<h2>' +
    title +
    '</h2></div>';
  const descriptionItems = (value: string) =>
    value
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
  const price = (s: ZeroService) =>
    s.unitCents === null ? 'A definir' : zeroMoney(s.unitCents * s.quantity);
  const hasMonthly = d.services.some((s) => s.billing === 'monthly');
  const hasOnce = d.services.some((s) => s.billing === 'once');
  const monthlyPending = d.services.some(
    (s) => s.billing === 'monthly' && s.unitCents === null,
  );
  const oncePending = d.services.some(
    (s) => s.billing === 'once' && s.unitCents === null,
  );
  const anyPriced = d.services.some((s) => s.unitCents !== null);
  const showContract = hasMonthly && d.months > 0;
  const steps = descriptionItems(d.timeline);
  const facts = [
    { name: 'Preparada por', value: d.supplier },
    ...(d.services.length
      ? [
          {
            name: 'Frentes de trabalho',
            value: String(d.services.length).padStart(2, '0'),
          },
        ]
      : []),
    ...(d.months ? [{ name: 'Vigência', value: d.months + ' meses' }] : []),
    ...(d.validity ? [{ name: 'Validade', value: d.validity }] : []),
  ].filter((f) => f.value);
  const nav = [
    ...(d.objective ? [['objetivo', 'Visão geral']] : []),
    ...(d.services.length ? [['escopo', 'Entregas']] : []),
    ...(steps.length ? [['cronograma', 'Prazos']] : []),
    ...(d.services.length ? [['investimento', 'Investimento']] : []),
  ]
    .map(([id, text]) => '<a href="#' + id + '">' + text + '</a>')
    .join('');
  const hero =
    '<section class="hero"><img class="hero-media" src="' +
    escape(cover) +
    '" alt="' +
    escape(coverAlt) +
    '" width="1536" height="1024" fetchpriority="high"><div class="wrap hero-content"><span class="eyebrow">Proposta comercial' +
    (d.supplier ? ' / ' + escape(d.supplier) : '') +
    '</span><h1' +
    (client.length > 42 ? ' class="long-title"' : '') +
    '>' +
    client +
    '</h1>' +
    (subject ? '<p class="hero-subject">' + subject + '</p>' : '') +
    (d.services.length
      ? '<a class="hero-link" href="#escopo">Explorar proposta <span aria-hidden="true">&#8599;</span></a>'
      : '') +
    '</div><div class="hero-bottom wrap"><span>' +
    (d.validity ? 'Válida por ' + escape(d.validity) : escape(d.supplier)) +
    '</span>' +
    (d.services.length
      ? '<a href="#investimento">Ver investimento <span aria-hidden="true">&#8595;</span></a>'
      : '') +
    '</div></section>';
  const context = d.objective
    ? '<section id="objetivo" class="section context"><div class="wrap context-grid">' +
      sectionHead('01 / O projeto', 'O que vamos construir.') +
      '<div class="objective-copy' +
      (d.objective.length > 340 ? ' long-copy' : '') +
      '">' +
      lines(d.objective) +
      '</div></div></section>'
    : '';
  const serviceRows = d.services
    .map((s, i) => {
      const items = descriptionItems(s.description);
      const bullets = (values: string[]) =>
        '<ul class="deliverables">' +
        values.map((item) => '<li>' + escape(item) + '</li>').join('') +
        '</ul>';
      const description = items.length
        ? bullets(items.slice(0, 5)) +
          (items.length > 5
            ? '<details class="scope-more"><summary>Mais ' +
              (items.length - 5) +
              ' entregas</summary>' +
              bullets(items.slice(5)) +
              '</details>'
            : '')
        : '';
      const amount =
        '<div class="service-price"><strong>' +
        price(s) +
        '</strong><span>' +
        (s.billing === 'monthly' ? 'por mês' : 'pagamento único') +
        (s.quantity > 1 ? ' / ' + s.quantity + ' unidades' : '') +
        '</span></div>';
      const title =
        '<div class="scope-name"><span class="service-number">' +
        num(i) +
        '</span><span class="service-type">' +
        (s.billing === 'monthly' ? 'Recorrente' : 'Projeto pontual') +
        '</span><h3>' +
        escape(s.title) +
        '</h3></div>';
      if (d.design === 'compact')
        return (
          '<li class="scope-row">' +
          title +
          '<div class="scope-description">' +
          description +
          '</div>' +
          amount +
          '</li>'
        );
      return (
        '<article class="' +
        (d.design === 'contrast' ? 'scope-tile' : 'scope-chapter') +
        '">' +
        title +
        '<div class="chapter-content">' +
        description +
        amount +
        '</div></article>'
      );
    })
    .join('');
  const scope = d.services.length
    ? '<section id="escopo" class="section scope"><div class="wrap">' +
      sectionHead('02 / Escopo', 'Cada entrega, em detalhe.') +
      (d.design === 'compact'
        ? '<ol class="scope-ledger">' + serviceRows + '</ol>'
        : '<div class="' +
          (d.design === 'contrast' ? 'scope-grid' : 'scope-chapters') +
          '">' +
          serviceRows +
          '</div>') +
      '</div></section>'
    : '';
  const process = steps.length
    ? '<section id="cronograma" class="section schedule"><div class="wrap">' +
      sectionHead('03 / Execução', 'Do início à entrega.') +
      '<ol class="process' +
      (steps.length === 1 ? ' single' : '') +
      '">' +
      steps
        .map((step, i) => {
          const separator = step.indexOf(':');
          return (
            '<li><span class="step-number">' +
            num(i) +
            '</span><div>' +
            (separator > 0 && separator < 120
              ? '<h3>' +
                escape(step.slice(0, separator)) +
                '</h3><p>' +
                escape(step.slice(separator + 1).trim()) +
                '</p>'
              : '<p>' + escape(step) + '</p>') +
            '</div></li>'
          );
        })
        .join('') +
      '</ol></div></section>'
    : '';
  const pictures = media?.gallery
    ? media.gallery
        .filter((p) => trustedMedia(p.url))
        .map((p) => ({ url: p.url, caption: p.caption }))
    : d.gallery.map((p) => ({ ...p, url: imageUrl(p.url) }));
  const gallery = pictures.length
    ? '<section id="referencias" class="section references"><div class="wrap">' +
      sectionHead('Direção visual', 'Referências do projeto.') +
      '<div class="portfolio">' +
      pictures
        .map(
          (p) =>
            '<figure><img src="' +
            escape(p.url) +
            '" alt="' +
            escape(p.caption || 'Imagem selecionada para a proposta') +
            '" width="800" height="600" loading="lazy">' +
            (p.caption
              ? '<figcaption>' + escape(p.caption) + '</figcaption>'
              : '') +
            '</figure>',
        )
        .join('') +
      '</div></div></section>'
    : '';
  const totalBlock = (
    name: string,
    amount: number,
    pending: boolean,
    known: boolean,
    note: string,
  ) =>
    '<div class="total"><span>' +
    name +
    (pending && known ? ' parcial' : '') +
    '</span><strong>' +
    (known ? zeroMoney(amount) : 'A definir') +
    '</strong><small>' +
    note +
    '</small></div>';
  const investment = d.services.length
    ? '<section id="investimento" class="section investment"><div class="wrap"><div class="investment-heading">' +
      sectionHead('04 / Investimento', 'Transparente.<br>Do começo ao fim.') +
      (d.validity
        ? '<p>Condições válidas por<br><strong>' +
          escape(d.validity) +
          '</strong></p>'
        : '') +
      '</div><div class="totals">' +
      (hasMonthly
        ? totalBlock(
            'Mensalidade',
            totals.monthly,
            monthlyPending,
            d.services.some(
              (s) => s.billing === 'monthly' && s.unitCents !== null,
            ),
            'por mês' + (d.months ? ' / ' + d.months + ' meses' : ''),
          )
        : '') +
      (hasOnce
        ? totalBlock(
            'Pagamento único',
            totals.once,
            oncePending,
            d.services.some(
              (s) => s.billing === 'once' && s.unitCents !== null,
            ),
            'sem recorrência',
          )
        : '') +
      (showContract
        ? totalBlock(
            'Total em ' + d.months + ' meses',
            totals.contract!,
            totals.pending,
            anyPriced,
            'mensalidades + pagamentos únicos',
          )
        : '') +
      '</div>' +
      (totals.pending
        ? '<p class="investment-note">Valores pendentes de definição. Os totais parciais consideram somente os itens precificados.</p>'
        : '') +
      (totals.discount
        ? '<p class="investment-note">Desconto de ' +
          d.discountPercent +
          '% aplicado. Economia: ' +
          zeroMoney(totals.discount) +
          ' sobre a soma de uma mensalidade e pagamentos únicos.</p>'
        : '') +
      '<details class="price-detail"><summary>Detalhamento do investimento <span aria-hidden="true">+</span></summary><div class="table-wrap"><table><thead><tr><th>Serviço</th><th>Qtd.</th><th>Recorrência</th><th>Valor</th></tr></thead><tbody>' +
      d.services
        .map(
          (s) =>
            '<tr><td>' +
            escape(s.title) +
            '</td><td>' +
            s.quantity +
            '</td><td>' +
            (s.billing === 'monthly' ? 'Mensal' : 'Único') +
            '</td><td>' +
            price(s) +
            '</td></tr>',
        )
        .join('') +
      '</tbody></table></div></details></div></section>'
    : '';
  const conditions =
    d.terms || d.exclusions
      ? '<section id="condicoes" class="section agreements"><div class="wrap">' +
        sectionHead('O combinado', 'Condições e limites.') +
        '<div class="conditions">' +
        (d.terms
          ? '<div><h3>Condições comerciais</h3>' + lines(d.terms) + '</div>'
          : '') +
        (d.exclusions
          ? '<div><h3>Fora do escopo</h3>' + lines(d.exclusions) + '</div>'
          : '') +
        '</div></div></section>'
      : '';
  const email = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(d.email)
    ? 'mailto:' +
      encodeURIComponent(d.email) +
      '?subject=' +
      encodeURIComponent('Proposta: ' + d.title)
    : '';
  const phone = d.phone.replace(/[^\d]/g, '');
  const whatsapp =
    phone.length >= 10 && phone.length <= 15
      ? 'https://wa.me/' +
        (phone.length <= 11 ? '55' + phone : phone) +
        '?text=' +
        encodeURIComponent(
          'Olá, gostaria de conversar sobre a proposta ' + d.title + '.',
        )
      : '';
  const contact =
    email || whatsapp
      ? '<div class="contact">' +
        (whatsapp
          ? '<a href="' +
            escape(whatsapp) +
            '" target="_blank" rel="noopener noreferrer">Conversar pelo WhatsApp <span aria-hidden="true">&#8599;</span></a>'
          : '') +
        (email
          ? '<a class="secondary" href="' +
            escape(email) +
            '" target="_blank" rel="noopener noreferrer">Enviar e-mail <span aria-hidden="true">&#8599;</span></a>'
          : '') +
        '</div>'
      : '';
  const closing =
    '<footer id="contato" class="closing"><div class="wrap">' +
    (contact
      ? '<div class="closing-row"><div>' +
        label('Vamos conversar') +
        '<h2>Vamos seguir<br>com o projeto?</h2></div>' +
        contact +
        '</div>'
      : '') +
    '<div class="signature"><strong>' +
    escape(d.supplier) +
    '</strong><span>' +
    (d.client ? 'Preparada para ' + client : 'Proposta comercial') +
    '</span><a href="#inicio">Voltar ao início &#8593;</a></div></div></footer>';
  const content =
    d.design === 'compact'
      ? context + scope + investment + process + gallery + conditions
      : context + scope + gallery + process + investment + conditions;
  return (
    "<!doctype html><html lang=\"pt-BR\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><meta http-equiv=\"Content-Security-Policy\" content=\"default-src 'none'; script-src 'none'; style-src 'unsafe-inline'; img-src 'self' data:; font-src 'none'; connect-src 'none'; frame-src 'none'; base-uri 'none'; form-action 'none'\"><meta name=\"synky-proposal\" content=\"web-v3\"><title>" +
    subject +
    (d.client ? ' | ' + client : '') +
    '</title><style>' +
    zeroProposalStyles +
    '</style></head><body class="' +
    d.design +
    '" style="--accent:' +
    d.accent +
    ';--ink:' +
    ink +
    ';--on-accent:' +
    onAccent +
    ';--display:' +
    (d.serif ? 'Georgia,serif' : 'Arial,sans-serif') +
    ';--weight:' +
    (d.serif ? '400' : '700') +
    '"><header id="inicio" class="brandbar"><div class="wrap brandbar-inner"><div class="brand">' +
    (logo
      ? '<img src="' +
        escape(logo) +
        '" alt="' +
        escape(d.supplier || 'Fornecedor') +
        '">'
      : escape(d.supplier || 'Proposta comercial')) +
    '</div><nav aria-label="Seções da proposta">' +
    nav +
    '</nav></div></header><main>' +
    hero +
    '<div class="project-strip"><dl class="wrap project-facts">' +
    facts
      .map(
        (f) =>
          '<div><dt>' + f.name + '</dt><dd>' + escape(f.value) + '</dd></div>',
      )
      .join('') +
    '</dl></div>' +
    content +
    '</main>' +
    closing +
    '</body></html>'
  );
}
