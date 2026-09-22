import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import ts from 'typescript';
import { parse } from 'parse5';
import * as React from 'react';
import * as jsxRuntime from 'react/jsx-runtime';
import { renderToStaticMarkup } from 'react-dom/server';
import * as icons from 'lucide-react';

globalThis.fetch = async () => {
  throw new Error('Network disabled: Proposta Zero must never call an AI API.');
};
const source = (path) =>
  readFileSync(new URL('../' + path, import.meta.url), 'utf8');
function load(path, mocks = {}) {
  const module = { exports: {} };
  const js = ts.transpileModule(source(path), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
    },
  }).outputText;
  new Function('require', 'module', 'exports', js)(
    (id) => {
      if (!(id in mocks)) throw new Error('Unexpected dependency: ' + id);
      return mocks[id];
    },
    module,
    module.exports,
  );
  return module.exports;
}
const zero = load('lib/zero-proposal.ts', {
  './zero-proposal-styles': load('lib/zero-proposal-styles.ts'),
});
const { composeZeroBrief, composeZeroReferenceBrief } = load('lib/zero-compose.ts', {
  './zero-proposal': zero,
});

test('new composer opens with one briefing and one optional reference, no form wall', () => {
  const { ZeroLab } = load('components/zero-lab.tsx', {
    react: React,
    'react/jsx-runtime': jsxRuntime,
    'lucide-react': icons,
    '@/components/ui/button': {
      Button: ({ children, variant, size, ...props }) =>
        React.createElement('button', props, children),
    },
    '@/components/ui/input': {
      Input: (props) => React.createElement('input', props),
    },
    '@/lib/zero-proposal': zero,
    '@/lib/zero-compose': { composeZeroBrief, composeZeroReferenceBrief },
    './zero-lab.module.css': {
      default: new Proxy({}, { get: (_, key) => String(key) }),
    },
  });
  const markup = renderToStaticMarkup(
    React.createElement(ZeroLab, {
      profile: { businessName: 'Synky', email: '', phone: '' },
      onDirtyChange: () => {},
    }),
  );
  const nodes = [];
  const visit = (node) => {
    if (node.tagName) nodes.push(node);
    for (const child of node.childNodes || []) visit(child);
  };
  visit(parse(markup));
  assert.equal(nodes.filter((n) => n.tagName === 'textarea').length, 1);
  assert.equal(
    nodes.filter(
      (n) => n.tagName === 'input' && !n.attrs.some((a) => a.name === 'hidden'),
    ).length,
    1,
  );
  assert.equal(nodes.filter((n) => n.tagName === 'select').length, 0);
  assert.match(markup, /Link de referência visual/);
  assert.match(markup, /Criar proposta/);
  assert.match(markup, /Editar campos/);
  assert.doesNotMatch(markup, /Composição/);
  const visualModels = nodes.find((n) =>
    n.attrs.some(
      (a) => a.name === 'aria-label' && a.value === 'Modelos visuais',
    ),
  );
  const choices = visualModels.childNodes
    .flatMap((n) => n.childNodes || [])
    .filter((n) => n.tagName === 'button');
  assert.equal(choices.length, 3);
  const thumbnails = nodes.filter(
    (n) => n.tagName === 'iframe' && n.attrs.some((a) => a.name === 'inert'),
  );
  assert.equal(thumbnails.length, 3);
  for (const thumbnail of thumbnails) {
    assert.ok(
      thumbnail.attrs.some(
        (a) => a.name === 'sandbox' && a.value === 'allow-same-origin',
      ),
    );
    assert.match(
      thumbnail.attrs.find((a) => a.name === 'srcdoc').value,
      /<section class="hero">/,
    );
  }
  assert.equal(
    choices.filter((n) =>
      n.attrs.some((a) => a.name === 'aria-pressed' && a.value === 'true'),
    ).length,
    1,
  );
  const desktop = nodes.find((n) =>
    n.attrs.some(
      (a) => a.name === 'aria-label' && a.value === 'Prévia para computador',
    ),
  );
  assert.ok(
    desktop.attrs.some((a) => a.name === 'aria-pressed' && a.value === 'true'),
  );
  assert.doesNotMatch(markup, /Dados da proposta|Condições de pagamento/);
});

test('one natural request becomes a client-specific visual proposal without network', () => {
  const text =
    'Proposta para Clínica Aurora. Gestão de tráfego por R$ 2.500 por mês e criação de site por R$ 4.000, pagamento único. Contrato de 6 meses. Objetivo: aumentar os agendamentos. Validade de 15 dias. Não inclui verba de anúncios.';
  const result = composeZeroBrief(text, zero.emptyZeroDraft('Synky'));
  assert.equal(result.draft.client, 'Clínica Aurora');
  assert.equal(result.draft.objective, 'aumentar os agendamentos');
  assert.equal(result.draft.months, 6);
  assert.equal(result.draft.validity, '15 dias');
  assert.equal(result.draft.briefing, text);
  assert.equal(result.draft.services.length, 2);
  assert.deepEqual(
    result.draft.services.map((s) => [
      s.title,
      s.unitCents,
      s.billing,
      s.quantity,
    ]),
    [
      ['Gestão de tráfego', 250000, 'monthly', 1],
      ['Criação de site', 400000, 'once', 1],
    ],
  );
  assert.deepEqual(result.unresolved, []);
  assert.deepEqual(result.warnings, []);
  assert.equal(zero.zeroTotals(result.draft).contract, 1900000);
  assert.match(zero.renderZeroProposal(result.draft), /Clínica Aurora/);
  assert.match(zero.renderZeroProposal(result.draft), /campaign-cover\.png/);
  assert.match(result.draft.exclusions, /verba de anúncios/);
  assert.doesNotMatch(
    result.draft.services.map((s) => s.description).join(' '),
    /Configuração de anúncios|Relatório de desempenho/,
  );
});

test('natural inline client, decimal prices and custom services do not need catalog or labels', () => {
  const result = composeZeroBrief(
    'Eu quero uma proposta para a Loja Sol, fotografia de produtos por R$ 1.234,56, pagamento único e 12 posts por 2,5 mil por mês. Inclui revisão com a cliente.',
    zero.emptyZeroDraft('Synky'),
  );
  assert.equal(result.draft.client, 'Loja Sol');
  assert.deepEqual(
    result.draft.services.map((s) => [s.unitCents, s.quantity]),
    [
      [123456, 1],
      [250000, 1],
    ],
  );
  assert.equal(result.draft.services[0].description, '');
  assert.match(
    result.draft.services[1].description,
    /Inclui revisão com a cliente/,
  );
  assert.deepEqual(result.unresolved, []);
});

test('scope text is separated from price wording without inventing deliverables', () => {
  const original =
    'Proposta para Aurora. Gestão de tráfego com 4 campanhas por R$ 2.500 por mês, incluindo relatório de resultados. Site por R$ 4.000, pagamento único.';
  const { draft } = composeZeroBrief(original, zero.emptyZeroDraft('Synky'));
  assert.equal(draft.briefing, original);
  assert.equal(draft.services[0].title, 'Gestão de tráfego');
  assert.equal(
    draft.services[0].description,
    '4 campanhas\nrelatório de resultados',
  );
  assert.equal(draft.services[1].description, '');
  assert.equal(draft.services[0].unitCents, 250000);
  assert.equal(draft.services[1].unitCents, 400000);
  for (const design of ['editorial', 'contrast', 'compact']) {
    const html = zero.renderZeroProposal({ ...draft, design });
    assert.match(html, /<h1>Gestão de tráfego \+ Site<\/h1>/);
    assert.match(html, /Para Aurora/);
    assert.match(html, /<li>4 campanhas<\/li>/);
    assert.doesNotMatch(html, /<li>[^<]*R\$/);
  }
});

test('all deliverables survive web expansion and unspecified prices never look free', () => {
  const value = draft();
  value.services = [{ ...value.services[0], unitCents: null, description: Array.from({ length: 14 }, (_, i) => 'Entrega confirmada ' + i).join('\n') }];
  for (const design of ['editorial', 'contrast', 'compact']) {
    const html = zero.renderZeroProposal({ ...value, design });
    for (let i = 0; i < 14; i++) assert.ok(html.includes('Entrega confirmada ' + i));
    assert.match(html, /<details class="scope-more">/);
    assert.doesNotMatch(html, /R\$\s*0,00|A partir de/);
    assert.doesNotMatch(html, /Relatório de desempenho|Ritmo de trabalho|roteiro inicial/);
  }
});

test('a public proposal can become a complete local base with only its changes applied', () => {
  const reference =
    'Proposta para Casa Lume. Gestão de tráfego por R$ 2.500 por mês. Site por R$ 4.000, pagamento único. Contrato de 6 meses. Objetivo: gerar novos projetos.';
  const result = composeZeroReferenceBrief(
    'Cliente: Clínica Aurora\nGestão de tráfego por R$ 3.000 por mês\nObjetivo: aumentar os agendamentos.',
    {
      ...zero.emptyZeroDraft('Synky'),
      referenceUrl: 'https://example.com/proposta-casa-lume',
      referenceContent: reference,
      referenceSections: ['Apresentação', 'Entregas', 'Investimento'],
    },
  );
  assert.equal(result.draft.client, 'Clínica Aurora');
  assert.equal(result.draft.months, 6);
  assert.equal(result.draft.services.length, 2);
  assert.equal(result.draft.services[0].title, 'Gestão de tráfego');
  assert.equal(result.draft.services[0].unitCents, 300000);
  assert.equal(result.draft.services[1].unitCents, 400000);
  assert.equal(result.draft.referenceContent, reference);
  assert.match(result.draft.briefing, /aumentar os agendamentos/);
  const html = zero.renderZeroProposal(result.draft);
  assert.match(html, /Clínica Aurora/);
  assert.match(html, /R\$\s?3\.000,00/);
  assert.match(html, /R\$\s?4\.000,00/);
  assert.match(html, /class="editorial reference-mode"/);
  assert.match(html, />Entregas<\/h2>/);
});

test('long briefings are preserved as readable proposal details', () => {
  const notes = Array.from(
    { length: 120 },
    (_, index) => `Detalhe comercial confirmado ${index + 1}: informação do briefing.`,
  ).join('\n');
  const value = { ...draft(), briefing: notes };
  const html = zero.renderZeroProposal(value);
  assert.match(html, /id="briefing"/);
  assert.match(html, /Detalhe comercial confirmado 1/);
  assert.match(html, /Detalhe comercial confirmado 120/);
  assert.equal(zero.normalizeZeroDraft(value).briefing, notes);
});

test('one conversational request finds supplier, client and familiar services without form labels', () => {
  const result = composeZeroBrief(
    'vamos criar uma proposta da somus, ela e uma empresa voltada para ajudar os arquitetos, ela quer fazere uma porposta de trafego pago e comercial para a lie arquitetas, faça uma porposta bem legal',
    zero.emptyZeroDraft(),
  );
  assert.equal(result.draft.supplier, 'Somus');
  assert.equal(result.draft.client, 'Lie Arquitetas');
  assert.deepEqual(
    result.draft.services.map((service) => service.title),
    ['Gestão de tráfego pago', 'Operação comercial'],
  );
  assert.ok(result.draft.services.every((service) => service.unitCents === null));
  assert.doesNotMatch(result.warnings.join(' '), /nome do cliente|nome da sua empresa/i);
});

test('bullet scope and exclusions stay separate, and an explicit visual wins over sector defaults', () => {
  const { draft, unresolved } = composeZeroBrief('Proposta para Aurora.\nSite por R$ 4.000, pagamento único.\n- Página inicial\n- Formulário de contato\n- Não inclui hospedagem\nVisual: editorial', zero.emptyZeroDraft('Synky'));
  assert.equal(draft.services[0].description, 'Página inicial\nFormulário de contato');
  assert.equal(draft.exclusions, 'Não inclui hospedagem');
  assert.equal(draft.design, 'editorial');
  assert.deepEqual(unresolved, []);
});

test('three proposal compositions use distinct content structures with no empty boilerplate', () => {
  const value = {
    ...zero.emptyZeroDraft('Synky'),
    client: 'Aurora',
    title: 'Projeto de marca',
    services: [
      {
        id: 'one',
        title: 'Identidade visual',
        description: 'Manual de marca\nArquivos finais',
        quantity: 1,
        unitCents: 400000,
        billing: 'once',
      },
    ],
  };
  for (const [design, structure] of [
    ['editorial', 'scope-chapter'],
    ['contrast', 'scope-tile'],
    ['compact', 'scope-row'],
  ]) {
    const html = zero.renderZeroProposal({ ...value, design });
    assert.match(html, new RegExp('class="' + structure + '"'));
    assert.doesNotMatch(
      html,
      /Objetivo a definir|cliente a definir|Vamos alinhar os próximos passos|1 unidade/,
    );
    assert.doesNotMatch(html, /id="objetivo"|id="metodo"|id="proximos-passos"/);
    assert.match(html, /<h1>Projeto de marca<\/h1>/);
    assert.match(html, /Manual de marca/);
    assert.match(html, /Arquivos finais/);
    assert.doesNotMatch(
      html,
      /id="cronograma"|id="condicoes"|id="referencias"/,
    );
    assert.equal(
      html.indexOf('id="investimento"') < html.indexOf('id="escopo"'),
      false,
    );
  }
  const empty = zero.renderZeroProposal(zero.emptyZeroDraft());
  assert.doesNotMatch(empty, /id="escopo"|id="investimento"|<details/);
  const long = zero.renderZeroProposal({
    ...value,
    objective: 'Objetivo extenso. '.repeat(100),
  });
  assert.match(long, /class="objective-copy long-copy"/);
  assert.equal(
    zero.zeroCover({
      ...value,
      services: [{ ...value.services[0], title: 'Automação de sistemas' }],
    }),
    '/proposal/chrome-cover.png',
  );
  assert.equal(
    zero.zeroCover({
      ...value,
      services: [{ ...value.services[0], title: 'Design de interiores' }],
    }),
    '/proposal/editorial-cover.png',
  );
});

test('reference sections can reorder the proposal without changing its facts', () => {
  const value = {
    ...draft(),
    objective: 'Aumentar conversas qualificadas.',
    timeline: 'Etapa 1: alinhamento',
    referenceSections: ['Investimento', 'Entregas', 'Contexto do projeto'],
  };
  const html = zero.renderZeroProposal(value);
  assert.ok(html.indexOf('id="investimento"') < html.indexOf('id="escopo"'));
  assert.ok(html.indexOf('id="escopo"') < html.indexOf('id="objetivo"'));
  assert.match(html, /Aumentar conversas qualificadas/);
  assert.match(html, /Serviço confirmado/);
});

test('packages stay together; shared totals, exclusions and vague instructions are not billed', () => {
  const result = composeZeroBrief(
    'Cliente: Aurora\nTráfego e conteúdo por R$ 3.000 por mês\nNão quero consultoria por R$ 5.000\nSem site\nInvestimento total R$ 9.000\nDeixe igual à referência https://example.com/proposta. Mantenha um tom bem direto.',
    zero.emptyZeroDraft('Synky'),
  );
  assert.equal(result.draft.services.length, 1);
  assert.equal(result.draft.services[0].unitCents, 300000);
  assert.match(result.draft.exclusions, /consultoria/);
  assert.ok(result.unresolved.some((t) => /total/.test(t)));
  assert.ok(result.unresolved.some((t) => /https:/.test(t)));
  assert.ok(result.unresolved.some((t) => /tom bem direto/.test(t)));
});

test('ambiguous, malformed and missing prices remain pending, never guessed', () => {
  for (const text of [
    'Site a partir de R$ 2.000',
    'Site de R$ 2.000 a R$ 4.000',
    '12 posts por R$ 100 cada',
    'Site em 3x R$ 1.000',
    'Site por R$ 2.500,555',
    'Site por R$ 2.50',
    'Site por R$ 999.999.999',
    'Serviço: Análise técnica',
    'Site por R$ 200 por mês e pagamento único',
  ]) {
    const { draft } = composeZeroBrief(text, zero.emptyZeroDraft('Synky'));
    assert.ok(draft.services.length > 0, text);
    assert.ok(
      draft.services.every((s) => s.unitCents === null),
      text,
    );
  }
  assert.equal(
    composeZeroBrief('Site por R$ 0, pagamento único', zero.emptyZeroDraft())
      .draft.services[0].unitCents,
    0,
  );
});

test('rebuilding keeps identity and imagery, reuses service IDs, and removes stale commercial terms', () => {
  const base = {
    ...zero.emptyZeroDraft('Synky'),
    client: 'Antigo',
    months: 12,
    discountPercent: 20,
    email: 'contato@example.com',
    phone: '123',
    logo: '/api/assets/logo12345',
    cover: '/proposal/architecture-cover.png',
    gallery: [{ url: '/api/assets/photo12345', caption: 'Projeto real' }],
    terms: 'Condição antiga',
    services: [
      {
        id: 'same-id',
        title: 'Site',
        description: 'Antigo',
        quantity: 2,
        unitCents: 99,
        billing: 'monthly',
      },
    ],
  };
  const { draft } = composeZeroBrief(
    'Proposta para Novo. Site por 2000 reais, pagamento único.',
    base,
  );
  assert.equal(draft.client, 'Novo');
  assert.equal(draft.months, 0);
  assert.equal(draft.terms, '');
  assert.equal(draft.discountPercent, 0);
  for (const key of ['supplier', 'email', 'phone', 'logo', 'cover', 'gallery'])
    assert.deepEqual(draft[key], base[key]);
  assert.equal(draft.design, base.design);
  assert.equal(draft.services[0].id, 'same-id');
  assert.equal(draft.services[0].unitCents, 200000);
  assert.equal(base.client, 'Antigo');
});

test('composer bounds input, retains unsupported and conflicting text, and keeps output escaped', () => {
  assert.throws(() => composeZeroBrief(' ', zero.emptyZeroDraft()));
  assert.throws(() =>
    composeZeroBrief('x'.repeat(60001), zero.emptyZeroDraft()),
  );
  const text =
    'Cliente: Ana\nCliente: Bia\nContrato de 999 meses\nServiço: ' +
    'x'.repeat(161);
  const result = composeZeroBrief(text, zero.emptyZeroDraft('Synky'));
  assert.equal(result.draft.client, 'Ana');
  assert.equal(result.draft.months, 0);
  assert.equal(result.draft.briefing, text);
  assert.equal(result.unresolved.length, 3);
  const unsafe = composeZeroBrief(
    'Cliente: <script>alert(1)</script>\nSite por R$ 400',
    zero.emptyZeroDraft('Synky'),
  );
  assert.doesNotMatch(zero.renderZeroProposal(unsafe.draft), /<script>/);
});
const limited = load('lib/imported-template.ts');
const studio = load('lib/studio.ts');
const service = (
  id = 'first',
  unitCents = 1999,
  billing = 'monthly',
  quantity = 2,
) => ({
  id,
  title: 'Serviço confirmado',
  description: 'Entrega original\nRevisão com cliente',
  unitCents,
  billing,
  quantity,
});
const draft = () => ({
  ...zero.emptyZeroDraft('Fornecedor teste'),
  client: 'Cliente teste',
  services: [service()],
  months: 6,
});

test('totals separate monthly and once, use cents and do not multiply setup by months', () => {
  const value = {
    ...draft(),
    discountPercent: 10,
    services: [service(), service('setup', 12345, 'once', 1)],
  };
  const totals = zero.zeroTotals(value);
  assert.equal(totals.monthly, 3598);
  assert.equal(totals.once, 11110);
  assert.equal(totals.contract, 32698);
  assert.equal(totals.initial, 14708);
  assert.equal(totals.pending, false);
  assert.equal(zero.zeroTotals({ ...value, months: 0 }).contract, null);
});

test('unknown prices remain pending and differ from explicitly free services', () => {
  const unknown = { ...draft(), services: [service('unknown', null)] };
  assert.equal(zero.zeroTotals(unknown).pending, true);
  assert.match(
    zero.renderZeroProposal(unknown),
    /Valores pendentes de definição/,
  );
  assert.match(zero.renderZeroProposal(unknown), /A definir/);
  assert.equal(
    zero.zeroTotals({ ...unknown, services: [service('free', 0)] }).pending,
    false,
  );
  assert.deepEqual(zero.zeroReadiness(draft()), []);
  assert.ok(zero.zeroReadiness(zero.emptyZeroDraft()).length >= 1);
});

test('briefing imports explicit labels only and never invents price or discards long terms', () => {
  const terms = 'Pagamento acordado. '.repeat(20);
  const original = `Cliente: Ana\nProjeto: Operação\nObjetivo: Organizar CRM\nCondições: ${terms}\nTexto sem rótulo: valor comercial privado`;
  const result = zero.readZeroBrief(original);
  assert.equal(result.fields.client, 'Ana');
  assert.equal(result.fields.terms, terms.trim());
  assert.deepEqual(result.suggestions, ['sales']);
  assert.equal(result.fields.services, undefined);
  assert.equal(result.fields.unitCents, undefined);
  const tooLong = zero.readZeroBrief('Projeto: ' + 'x'.repeat(161));
  assert.equal(tooLong.fields.title, undefined);
  assert.equal(tooLong.warnings.length, 1);
  assert.equal(
    zero.normalizeZeroDraft({ ...draft(), briefing: original }).briefing,
    original,
  );
});

test('untrusted text stays text in all three layouts; no executable or external resources', () => {
  const injection =
    '<script>fetch("https://invalid.example")</script><img src=x onerror=alert(1)>';
  for (const design of ['editorial', 'contrast', 'compact']) {
    const value = {
      ...draft(),
      design,
      objective: injection,
      client: injection,
      terms: injection,
    };
    const html = zero.renderZeroProposal(value);
    const tags = [];
    function visit(node) {
      if (node.tagName) tags.push(node);
      for (const child of node.childNodes || []) visit(child);
    }
    visit(parse(html));
    assert.equal(
      tags.filter((node) =>
        ['script', 'iframe', 'link', 'form'].includes(node.tagName),
      ).length,
      0,
    );
    assert.match(html, /script-src 'none'/);
    const images = tags.filter((node) => node.tagName === 'img');
    assert.equal(images.length, 1);
    assert.equal(
      images[0].attrs.find((attr) => attr.name === 'src').value,
      zero.zeroCover(value),
    );
    assert.equal(
      tags
        .flatMap((node) => node.attrs)
        .filter((attr) => /^on/i.test(attr.name)).length,
      0,
    );
    assert.match(html, /connect-src 'none'/);
    assert.match(html, /&lt;script&gt;/);
    assert.match(html, /@media print/);
    assert.match(html, /@media\(max-width:600px\)/);
    assert.equal(
      html.indexOf('id="investimento"') < html.indexOf('id="escopo"'),
      false,
    );
  }
});

test('normalization rejects unsafe assets, invalid amounts and duplicate service IDs', () => {
  for (const patch of [
    { accent: 'red;url(https://example.com)' },
    { logo: 'https://example.com/x.png' },
    { logo: '/api/studio/generate' },
    { cover: 'https://example.com/image.png' },
    { cover: '/api/agent/generate' },
    { gallery: [{ url: 'javascript:alert(1)', caption: 'Untrusted' }] },
    { months: NaN },
    { months: 2.5 },
    { discountPercent: 101 },
    { services: [service(), service()] },
    { services: [service('bad', -1)] },
  ]) {
    assert.throws(() => zero.normalizeZeroDraft({ ...draft(), ...patch }));
  }
  assert.match(
    zero.renderZeroProposal(
      { ...draft(), logo: '/api/assets/own-token' },
      'https://example.com',
      'data:image/png;base64,YQ==',
    ),
    /src="data:image\/png;base64,YQ=="/,
  );
});

test('legacy drafts get a visual cover, and known service categories select relevant built-in art', () => {
  const legacy = draft();
  delete legacy.cover;
  delete legacy.gallery;
  const normalized = zero.normalizeZeroDraft(legacy);
  assert.equal(normalized.cover, 'auto');
  assert.deepEqual(normalized.gallery, []);
  assert.equal(zero.zeroCover(normalized), '/team/organization-office.png');
  assert.equal(
    zero.zeroCover({
      ...draft(),
      services: [{ ...service(), title: 'Gestão de tráfego' }],
    }),
    '/proposal/campaign-cover.png',
  );
  assert.equal(
    zero.zeroCover({
      ...draft(),
      services: [{ ...service(), title: 'Arquitetura residencial' }],
    }),
    '/proposal/architecture-cover.png',
  );
  for (const cover of zero.zeroCovers)
    assert.ok(
      readFileSync(new URL('../public' + cover.url, import.meta.url))
        .byteLength > 0,
    );
});

test('standalone output embeds cover and gallery, preserves full content, and adds deterministic guidance only', () => {
  const image = '/api/assets/visual-own';
  const value = {
    ...draft(),
    cover: image,
    gallery: [{ url: image, caption: '<Projeto real>' }],
    timeline: 'Primeira etapa: dados\nSegunda etapa: aprovação',
    objective: 'Objetivo integral confirmado',
  };
  assert.deepEqual(zero.zeroImagePaths(value), [image]);
  const html = zero.renderZeroProposal(value, '', '', {
    [image]: 'data:image/png;base64,YQ==',
  });
  assert.equal(
    (html.match(/src="data:image\/png;base64,YQ=="/g) || []).length,
    2,
  );
  assert.match(html, /&lt;Projeto real&gt;/);
  assert.match(html, /Objetivo integral confirmado/);
  assert.match(html, /<h3>Primeira etapa<\/h3><p>dados<\/p>/);
  assert.match(html, /<h3>Segunda etapa<\/h3><p>aprovação<\/p>/);
  const empty = zero.renderZeroProposal(draft());
  assert.doesNotMatch(empty, /<ol class="process method"|Ritmo de trabalho|id="proximos-passos"/);
  assert.doesNotMatch(empty, /<div class="portfolio/);
  assert.doesNotMatch(empty, /href="https:\/\/wa.me/);
});

function fixture() {
  const sqlite = new DatabaseSync(':memory:');
  for (const name of readdirSync(new URL('../drizzle/', import.meta.url))
    .filter((name) => name.endsWith('.sql'))
    .sort())
    sqlite.exec(source('drizzle/' + name));
  sqlite.exec(
    "INSERT INTO workspaces VALUES ('one', 'One', 'one', 1), ('two', 'Two', 'two', 1)",
  );
  let user = { userId: 'one', email: 'one@example.com' };
  const db = {
    prepare(sql) {
      const statement = (args = []) => ({
        bind: (...values) => statement(values),
        first: async () => sqlite.prepare(sql).get(...args) || null,
        all: async () => ({ results: sqlite.prepare(sql).all(...args) }),
        run: async () => ({
          meta: { changes: Number(sqlite.prepare(sql).run(...args).changes) },
        }),
      });
      return statement();
    },
  };
  const mocks = {
    '@/db': { getD1: () => db },
    '@/app/chatgpt-auth': { getChatGPTUser: async () => user },
    '@/db/workspace': { getWorkspaceForUser: async (user) => user.userId },
    '@/lib/imported-template': limited,
    '@/lib/zero-proposal': zero,
  };
  return {
    sqlite,
    route: load('app/api/zero/route.ts', mocks),
    setUser: (value) => {
      user = value;
    },
    mocks,
  };
}
const id = '18b539b6-cbae-4faa-8514-f929d9ff8212';
const post = (value, revision = 0) =>
  new Request('http://localhost/api/zero', {
    method: 'POST',
    body: JSON.stringify({ id, revision, draft: value }),
  });
const get = (projectId = '') =>
  new Request(
    'http://localhost/api/zero' + (projectId ? '?id=' + projectId : ''),
  );

test('draft save/open/list is isolated, requires auth and preserves other modules', async (t) => {
  const f = fixture();
  t.after(() => f.sqlite.close());
  assert.equal((await f.route.POST(post(draft()))).status, 200);
  const found = await (await f.route.GET(get(id))).json();
  assert.deepEqual(found.project.draft, draft());
  assert.equal(found.project.revision, 1);
  assert.equal((await (await f.route.GET(get())).json()).projects.length, 1);
  f.setUser({ userId: 'two' });
  assert.equal((await f.route.GET(get(id))).status, 404);
  assert.equal((await (await f.route.GET(get())).json()).projects.length, 0);
  assert.equal((await f.route.POST(post(draft(), 1))).status, 409);
  f.setUser(null);
  assert.equal((await f.route.GET(get())).status, 401);
  assert.equal((await f.route.POST(post(draft()))).status, 401);
  for (const table of [
    'clients',
    'proposals',
    'studio_projects',
    'studio_ai_requests',
  ])
    assert.equal(
      f.sqlite.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n,
      0,
    );
});

test('stale or duplicated saves cannot overwrite another editor', async (t) => {
  const f = fixture();
  t.after(() => f.sqlite.close());
  await f.route.POST(post(draft()));
  assert.equal(
    (await f.route.POST(post({ ...draft(), title: 'Duplicate' }))).status,
    409,
  );
  assert.equal(
    (await f.route.POST(post({ ...draft(), title: 'New version' }, 1))).status,
    200,
  );
  assert.equal(
    (await f.route.POST(post({ ...draft(), title: 'Stale' }, 1))).status,
    409,
  );
  const found = await (await f.route.GET(get(id))).json();
  assert.equal(found.project.draft.title, 'New version');
  assert.equal(found.project.revision, 2);
  assert.equal(
    (
      await f.route.POST(
        post({ ...draft(), logo: '/api/assets/not-our-logo' }, 2),
      )
    ).status,
    400,
  );
  assert.equal(
    (await f.route.POST(post({ ...draft(), title: '' }, 2))).status,
    400,
  );
});

test('cover and gallery saves require ownership of every selected image', async (t) => {
  const f = fixture();
  t.after(() => f.sqlite.close());
  f.sqlite.exec(
    "INSERT INTO brand_assets (workspace_id, public_token, kind, name, caption, object_key, content_type, size_bytes, created_at) VALUES ('one', 'photo-one', 'gallery', 'Own', '', 'own.png', 'image/png', 1, 1), ('two', 'photo-two', 'gallery', 'Other', '', 'other.png', 'image/png', 1, 1)",
  );
  const own = {
    ...draft(),
    cover: '/api/assets/photo-one',
    gallery: [{ url: '/api/assets/photo-one', caption: 'Próprio' }],
  };
  assert.equal((await f.route.POST(post(own))).status, 200);
  assert.equal(
    (await f.route.POST(post({ ...own, cover: '/api/assets/photo-two' }, 1)))
      .status,
    400,
  );
  assert.equal(
    (
      await f.route.POST(
        post(
          { ...own, gallery: [{ url: '/api/assets/photo-two', caption: '' }] },
          1,
        ),
      )
    ).status,
    400,
  );
  const found = await (await f.route.GET(get(id))).json();
  assert.equal(found.project.draft.cover, '/api/assets/photo-one');
  assert.equal(found.project.revision, 1);
});

test('reference route returns a local proposal base without calling an AI dependency', async (t) => {
  const f = fixture();
  t.after(() => f.sqlite.close());
  let reads = 0;
  const route = load('app/api/zero/reference/route.ts', {
    ...f.mocks,
    '@/lib/studio': studio,
    '@/lib/studio-reference': {
      readStudioReference: async () => {
        reads++;
        return {
          title: 'Reference',
          text: 'Do not import my prices',
          designEvidence: {
            colors: ['#123456', 'invalid'],
            fonts: ['Arial', 'sans-serif'],
            sectionOrder: ['Abertura', 'Escopo', 'Investimento'],
          },
        };
      },
    },
  });
  const request = () =>
    new Request('http://localhost/api/zero/reference', {
      method: 'POST',
      body: JSON.stringify({ url: 'https://example.com/reference' }),
    });
  const result = await (await route.POST(request())).json();
  assert.deepEqual(result.colors, ['#123456']);
  assert.equal(result.serif, false);
  assert.equal(result.design, 'contrast');
  assert.deepEqual(result.sections, ['Abertura', 'Escopo', 'Investimento']);
  assert.equal(result.content, 'Do not import my prices');
  assert.equal(reads, 1);
  f.setUser(null);
  assert.equal((await route.POST(request())).status, 401);
  assert.equal(reads, 1);
});
