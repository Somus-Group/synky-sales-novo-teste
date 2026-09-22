import {
  emptyZeroDraft,
  normalizeZeroDraft,
  type ZeroDraft,
  type ZeroService,
} from './zero-proposal';

const fold = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
const amountPattern = String.raw`(?:R\$\s*(?:\d{1,3}(?:\.\d{3})+|\d+)(?:,\d{1,2})?(?:\s*mil\b)?|\d+(?:,\d{1,2})?\s*mil\b|(?:\d{1,3}(?:\.\d{3})+|\d+)(?:,\d{1,2})?\s*reais\b)(?!\d|[.,]\d)`;
const amounts = (text: string) => [
  ...text.matchAll(new RegExp(amountPattern, 'gi')),
];
const monthly =
  /(?:por\s+m[eê]s|ao\s+m[eê]s|mensal(?:mente)?|mensais|\/\s*m[eê]s)/i;
const once = /(?:[uú]nico|[uú]nica|pontual|uma\s+vez|pagamento\s+[uú]nico)/i;
const knownService =
  /\b(?:bpo|gest[aã]o\s+(?:de\s+)?tr[aá]fego|tr[aá]fego\s+pago|redes\s+sociais|social\s+media|consultoria|site|landing\s+page|identidade\s+visual|fotografia|arquitetura|opera[cç][aã]o\s+comercial|comercial|conte[uú]do|design|marketing)\b/i;

const naturalServices = [
  ['tr[aá]fego(?:\s+pago)?', 'Gestão de tráfego pago', 'monthly'],
  ['opera[cç][aã]o\s+comercial|comercial', 'Operação comercial', 'monthly'],
  ['bpo\s+financeiro|bpo', 'BPO financeiro', 'monthly'],
  ['redes\s+sociais|social\s+media', 'Conteúdo e redes sociais', 'monthly'],
  ['landing\s+page', 'Landing page', 'once'],
  ['site|presen[cç]a\s+digital', 'Site e presença digital', 'once'],
  ['consultoria', 'Consultoria', 'once'],
] as const;

const titleCase = (value: string) =>
  value
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .map((word) => word[0].toLocaleUpperCase('pt-BR') + word.slice(1))
    .join(' ');

export type ZeroComposition = {
  draft: ZeroDraft;
  warnings: string[];
  unresolved: string[];
};

/** Rebuild commercial data from the complete brief, keeping the sender and visual choices. */
export function composeZeroBrief(
  text: string,
  base: ZeroDraft,
  preserveDesign = false,
): ZeroComposition {
  if (!text.trim()) throw new Error('Escreva o pedido da proposta.');
  if (text.length > 60000)
    throw new Error('Use um pedido de até 60.000 caracteres.');
  const draft: ZeroDraft = {
    ...emptyZeroDraft(base.supplier),
    email: base.email,
    phone: base.phone,
    logo: base.logo,
    cover: base.cover,
    gallery: base.gallery,
    design: base.design,
    accent: base.accent,
    serif: base.serif,
    referenceUrl: base.referenceUrl,
    referenceContent: base.referenceContent,
    referenceSections: base.referenceSections,
    briefing: text,
  };
  const warnings: string[] = [];
  const unresolved: string[] = [];
  let explicitDesign = preserveDesign;
  const put = (
    key:
      | 'client'
      | 'title'
      | 'objective'
      | 'timeline'
      | 'terms'
      | 'exclusions'
      | 'validity'
      | 'supplier',
    value: string,
    max: number,
    append = false,
  ) => {
    const clean = value
      .trim()
      .replace(/[.!;]+$/, '')
      .trim();
    const next = append && draft[key] ? draft[key] + '\n' + clean : clean;
    if (!clean) return;
    if (
      next.length > max ||
      (!append &&
        draft[key] &&
        !['title', 'supplier'].includes(key) &&
        draft[key] !== clean)
    ) {
      unresolved.push(value);
      warnings.push(
        'Há um campo repetido ou longo demais. Confira os trechos pendentes.',
      );
    } else draft[key] = next;
  };
  const addService = (raw: string, explicit = false) => {
    const found = amounts(raw);
    if (!found.length && !explicit) {
      const matches = naturalServices.filter(([pattern]) =>
        new RegExp('\\b(?:' + pattern + ')\\b', 'i').test(raw),
      );
      if (matches.length) {
        for (const [, title, billing] of matches) {
          if (draft.services.some((service) => fold(service.title) === fold(title)))
            continue;
          draft.services.push({
            id: crypto.randomUUID(),
            title,
            description: '',
            quantity: 1,
            unitCents: null,
            billing,
          });
        }
        return;
      }
    }
    const commercialTitle = (found.length ? raw.slice(0, found[0].index) : raw)
      .replace(/^(?:[-*•]\s*|\d+[.)]\s*)/, '')
      .replace(
        /^(?:(?:servi[cç]o|escopo|entregas?)\s*:\s*|(?:quero|preciso\s+de|oferecer|ofere[cç]a|incluir|inclua)\s+)/i,
        '',
      )
      .replace(
        /\s*(?:por|a partir de|custa|custando|no valor de|valor de|valor|de|:|[-–])\s*$/i,
        '',
      )
      .trim();
    const scopeStart = commercialTitle.match(
      /\s+(?:com|inclui|incluindo|contemplando)\s+(.+)$/i,
    );
    const title = scopeStart
      ? commercialTitle.slice(0, scopeStart.index).trim()
      : commercialTitle;
    if (
      !title ||
      title.length > 160 ||
      /^(?:total|investimento|or[cç]amento|verba|m[ií]dia|pagamento|entrada|saldo|desconto|valor|contrato)\b/i.test(
        title,
      )
    ) {
      unresolved.push(raw);
      return;
    }
    if (!explicit && !found.length && !knownService.test(title)) {
      unresolved.push(raw);
      return;
    }
    if (draft.services.length >= 24 || raw.length > 4000) {
      unresolved.push(raw);
      warnings.push(
        'O limite é de 24 serviços, com até 4.000 caracteres por descrição.',
      );
      return;
    }
    let unitCents: number | null = null;
    const ambiguous =
      found.length > 1 ||
      (monthly.test(raw) && once.test(raw)) ||
      /-\s*R\$|\b(?:verba|or[cç]amento|entrada|saldo|desconto)\b/i.test(raw) ||
      /\b(?:a partir de|entre|at[eé]|por unidade|cada|unit[aá]rio|parcelas?|vezes)\b|\d+\s*x\b/i.test(
        raw,
      );
    if (found.length === 1 && !ambiguous) {
      const value = found[0][0];
      const number = Number(
        value.replace(/R\$|reais|mil|\s|\./gi, '').replace(',', '.'),
      );
      const cents = Math.round(number * (/mil/i.test(value) ? 100000 : 100));
      if (Number.isSafeInteger(cents) && cents <= 100000000) unitCents = cents;
    }
    if (found.length && unitCents === null)
      warnings.push(
        `Valor de "${title}" pendente: há ambiguidade ou um valor fora do limite.`,
      );
    if (!monthly.test(raw) && !once.test(raw))
      warnings.push(
        `"${title}" ficou como pontual; a frequência não estava explícita.`,
      );
    const old = base.services.find(
      (service) => fold(service.title) === fold(title),
    );
    let description = scopeStart?.[1] || '';
    if (found.length === 1 && unitCents !== null) {
      const suffix = raw
        .slice(found[0].index! + found[0][0].length)
        .replace(/^[\s,;.-]+/, '')
        .replace(
          /^(?:por\s+m[eê]s|ao\s+m[eê]s|mensal(?:mente)?|mensais|\/\s*m[eê]s|pagamento\s+[uú]nico|[uú]nico|[uú]nica|pontual|uma\s+vez)\b/i,
          '',
        )
        .replace(/^[\s,;.-]+/, '')
        .replace(/^(?:e\s+)?(?:inclui|incluindo|com|contemplando)\s+/i, '')
        .trim();
      description = [description, suffix].filter(Boolean).join('\n');
    } else if (found.length) {
      // Keep ambiguous commercial wording visible rather than silently dropping it.
      description = raw.trim();
    }
    const service: ZeroService = {
      id:
        old && !draft.services.some((s) => s.id === old.id)
          ? old.id
          : crypto.randomUUID(),
      title: title[0].toLocaleUpperCase('pt-BR') + title.slice(1),
      description,
      quantity: 1,
      unitCents,
      billing: monthly.test(raw) ? 'monthly' : 'once',
    };
    draft.services.push(service);
  };

  // A single conversational sentence is enough. Infer the sender, recipient and
  // familiar services before splitting it into commercial clauses.
  const supplier = text.match(
    /\bp(?:ro|or)posta\w*\s+d(?:a|o)\s+([\p{L}\d][\p{L}\d &'’-]{1,80}?)(?=\s*(?:,|\.|;|\b(?:para|pra|que|ela|com|sobre)\b|$))/iu,
  );
  if (supplier && !draft.supplier)
    put('supplier', titleCase(supplier[1]), 240);
  const recipients = [
    ...text.matchAll(
      /\b(?:para|pra)\s+(?:(?:a|o|as|os)\s+)?([\p{L}][\p{L}\d &'’-]{2,80}?)(?=\s*(?:,|\.|;|\b(?:que|com|onde|e|fa[cç]a|crie|inclui|por|no valor)\b|$))/giu,
    ),
  ];
  const recipient = recipients
    .reverse()
    .find(
      (match) =>
        !/^(?:ajudar|criar|fazer|vender|aumentar|melhorar|os|as)\b/i.test(
          match[1].trim(),
        ),
    );
  if (
    recipient &&
    !/\bp(?:ro|or)posta\w*(?:\s+comercial)?\s+(?:para|pra)\b/i.test(text) &&
    recipient[1].trim()
  )
    put('client', titleCase(recipient[1]), 240);
  // Split prose at sentence boundaries, not at decimal commas or dots inside URLs.
  const clauses = text.split(
    /[.!?]\s+|[\n;]+|,\s*(?=(?:contrato|validade|objetivo|sem incluir|n[aã]o inclui)\b)/i,
  );
  for (const original of clauses) {
    let part = original.trim().replace(/[.!;]+$/, '');
    if (!part) continue;
    if (
      /^[-*•]\s+/.test(part) &&
      draft.services.length &&
      !amounts(part).length &&
      !/^(?:não|nao|sem|fora|exclu|prazo|validade|condi|pagamento|objetivo|cliente|contrato)/i.test(
        part.replace(/^[-*•]\s+/, ''),
      )
    ) {
      const last = draft.services[draft.services.length - 1];
      const item = part.replace(/^[-*•]\s+/, '');
      if (last.description.length + item.length + 1 <= 4000)
        last.description = [last.description, item].filter(Boolean).join('\n');
      else unresolved.push(part);
      continue;
    }
    part = part.replace(/^[-*•]\s+/, '');
    const client =
      part.match(
        /^(?:eu\s+)?(?:(?:crie|fa[cç]a|quero|preciso de)\s+(?:uma\s+)?)?proposta(?:\s+comercial)?\s+(?:para|pra)\s+(?:a\s+|o\s+)?(.+?)(?=[:,]|\s+(?:com|incluindo|oferecendo)\s|$)/i,
      ) || part.match(/^(?:cliente|empresa)\s*(?::|[eé]\s)\s*(.+?)(?=[:,]|$)/i);
    if (client) {
      put('client', client[1], 240);
      part = part
        .slice(client[0].length)
        .replace(/^(?:[:,]\s*|\s+(?:com|incluindo|oferecendo)\s+)/i, '')
        .trim();
      if (!part) continue;
    }
    const labeled = part.match(
      /^(t[ií]tulo|projeto|objetivo|prazo|cronograma|condi[cç][oõ]es|pagamento|exclus[oõ]es|n[aã]o incluso|validade|fornecedor)\s*:\s*(.+)$/i,
    );
    if (labeled) {
      const fields = {
        titulo: ['title', 160],
        projeto: ['title', 160],
        objetivo: ['objective', 8000],
        prazo: ['timeline', 4000],
        cronograma: ['timeline', 4000],
        condicoes: ['terms', 6000],
        pagamento: ['terms', 6000],
        exclusoes: ['exclusions', 4000],
        'nao incluso': ['exclusions', 4000],
        validade: ['validity', 160],
        fornecedor: ['supplier', 240],
      } as const;
      const [key, max] = fields[fold(labeled[1]) as keyof typeof fields];
      put(
        key,
        labeled[2],
        max,
        ['objective', 'timeline', 'terms', 'exclusions'].includes(key),
      );
      continue;
    }
    if (
      /^(?:n[aã]o\s+(?:inclu|quero|ofere)|sem\s|exclu|fora do escopo)/i.test(
        part,
      )
    ) {
      put('exclusions', part, 4000, true);
      continue;
    }
    if (
      /^(?:objetivo\b|para\s+(?:aumentar|melhorar|reduzir)|(?:quero|queremos)\s+(?:aumentar|melhorar|reduzir))/i.test(
        part,
      )
    ) {
      put(
        'objective',
        part.replace(/^objetivo\s*(?:[eé]\s|de\s)?/i, ''),
        8000,
        true,
      );
      continue;
    }
    const duration = part.match(
      /^(?:contrato|vig[eê]ncia|dura[cç][aã]o)(?:\s+de|\s+por|\s*:)?\s*(\d+)\s*meses?$/i,
    );
    if (duration) {
      const months = Number(duration[1]);
      if (months <= 120 && (!draft.months || draft.months === months))
        draft.months = months;
      else unresolved.push(part);
      continue;
    }
    if (/^(?:validade|v[aá]lida|proposta v[aá]lida)\b/i.test(part)) {
      put(
        'validity',
        part.replace(
          /^(?:validade|v[aá]lida|proposta v[aá]lida)\s*(?:de|por|at[eé])?\s*/i,
          '',
        ),
        160,
      );
      continue;
    }
    if (
      /^(?:pagamento|entrada|saldo|parcelamento|condi[cç][oõ]es)\b/i.test(part)
    ) {
      put('terms', part, 6000, true);
      continue;
    }
    if (
      /^(?:prazo|entrega|cronograma|in[ií]cio|etapa\s+\d)\b/i.test(part) &&
      !amounts(part).length
    ) {
      put('timeline', part, 4000, true);
      continue;
    }
    if (/^inclui\b/i.test(part) && draft.services.length) {
      const last = draft.services[draft.services.length - 1];
      if (last.description.length + part.length < 3999)
        last.description += '\n' + part;
      else unresolved.push(part);
      continue;
    }
    const color = part.match(/^(?:cor|cor principal)\s*:?\s*(#[a-f\d]{6})$/i);
    if (color) {
      draft.accent = color[1];
      continue;
    }
    const design = part.match(
      /^(?:visual|estilo)\s*:?\s*(editorial|est[uú]dio|executiv[ao])$/i,
    );
    if (design) {
      explicitDesign = true;
      draft.design = /^est/i.test(design[1])
        ? 'contrast'
        : /^exec/i.test(design[1])
          ? 'compact'
          : 'editorial';
      continue;
    }
    if (/https?:\/\//i.test(part)) {
      unresolved.push(part);
      continue;
    }
    if (amounts(part).length) {
      // A conjunction starts another priced item only after a complete previous price.
      // "Tráfego e conteúdo por R$ 3.000" remains one combined package.
      let start = 0;
      for (const delimiter of part.matchAll(/\s+(?:e|mais)\s+|,\s+/gi)) {
        const end = delimiter.index!;
        const next = end + delimiter[0].length;
        const current = part.slice(start, end);
        const rest = part.slice(next);
        if (
          amounts(current).length &&
          amounts(rest).length &&
          !/^(?:por|ao|mensal|inclui|com|at[eé]|de|a|pagamento|entrada|saldo|n[aã]o|sem)\b/i.test(
            rest,
          )
        ) {
          addService(current);
          start = next;
        }
      }
      addService(part.slice(start));
    } else addService(part, /^(?:servi[cç]o|escopo|entregas?)\s*:/i.test(part));
  }
  if (draft.title === 'Proposta comercial' && draft.services.length) {
    const title = draft.services.map((s) => s.title).join(' + ');
    if (title.length <= 160) draft.title = title;
  }
  const visualSignal = fold(
    `${draft.title} ${draft.objective} ${draft.briefing} ${draft.services.map((s) => s.title).join(' ')}`,
  );
  if (
    !explicitDesign &&
    !base.services.length &&
    /arquitet|interior|decoracao|ambiente|obra/.test(visualSignal)
  )
    draft.design = 'editorial';
  else if (
    !explicitDesign &&
    !base.services.length &&
    /site|sistema|software|app|automacao|tecnolog|trafego|marketing|conteudo|campanha|design/.test(
      visualSignal,
    )
  )
    draft.design = 'contrast';
  else if (
    !explicitDesign &&
    !base.services.length &&
    /financeir|bpo|crm|comercial|consultoria|operacao|processo/.test(
      visualSignal,
    )
  )
    draft.design = 'compact';
  if (!draft.services.length) warnings.push('Nenhum serviço identificado.');
  if (draft.services.some((service) => service.unitCents === null))
    warnings.push('Há serviços com preço a definir.');
  const normalized = normalizeZeroDraft(draft);
  return {
    draft: { ...normalized, briefing: text },
    warnings: [...new Set(warnings)],
    unresolved,
  };
}

const isDefaultTitle = (value: string) =>
  fold(value) === fold('Proposta comercial');

function mergeServices(source: ZeroService[], changes: ZeroService[]) {
  if (!changes.length) return source;
  const used = new Set<number>();
  const merged = source.map((service) => ({ ...service }));
  for (const change of changes) {
    const exact = merged.findIndex(
      (service, index) => !used.has(index) && fold(service.title) === fold(change.title),
    );
    // A single new item is normally a correction to a single-item reference,
    // even when its label changed together with its value.
    const index = exact >= 0 ? exact : source.length === 1 && changes.length === 1 ? 0 : -1;
    if (index >= 0) {
      merged[index] = { ...change, id: source[index].id };
      used.add(index);
    } else merged.push(change);
  }
  return merged.slice(0, 24);
}

/**
 * Applies a short list of changes to a public proposal imported as a base.
 * Both passes are local and deterministic: the reference supplies the shape,
 * while only explicitly stated commercial facts replace its values.
 */
export function composeZeroReferenceBrief(
  changes: string,
  base: ZeroDraft,
  preserveDesign = false,
): ZeroComposition {
  if (!base.referenceContent.trim())
    return composeZeroBrief(changes, base, preserveDesign);

  const reference = composeZeroBrief(base.referenceContent, base, true);
  if (!changes.trim())
    return {
      ...reference,
      draft: { ...reference.draft, briefing: '' },
    };

  const update = composeZeroBrief(
    changes,
    { ...base, referenceContent: '' },
    preserveDesign,
  );
  const source = reference.draft;
  const patch = update.draft;
  const merged = normalizeZeroDraft({
    ...source,
    email: base.email,
    phone: base.phone,
    logo: base.logo,
    cover: base.cover,
    gallery: base.gallery,
    design: preserveDesign ? base.design : source.design,
    accent: preserveDesign ? base.accent : source.accent,
    serif: preserveDesign ? base.serif : source.serif,
    referenceUrl: base.referenceUrl,
    referenceContent: base.referenceContent,
    referenceSections: base.referenceSections,
    briefing: changes,
    client: patch.client || source.client,
    supplier: patch.supplier || source.supplier,
    title: !isDefaultTitle(patch.title) ? patch.title : source.title,
    objective: patch.objective || source.objective,
    timeline: patch.timeline || source.timeline,
    terms: patch.terms || source.terms,
    exclusions: patch.exclusions || source.exclusions,
    validity: patch.validity || source.validity,
    months: patch.months || source.months,
    discountPercent: patch.discountPercent || source.discountPercent,
    services: mergeServices(source.services, patch.services),
  });
  return {
    draft: merged,
    warnings: [...new Set([...reference.warnings, ...update.warnings])],
    unresolved: [...reference.unresolved, ...update.unresolved],
  };
}
