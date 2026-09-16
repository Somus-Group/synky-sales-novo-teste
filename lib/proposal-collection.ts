import type { ArtworkProposal } from '@/components/proposal-artwork';
import type { ProposalTemplateDefinition } from './proposal-templates';
import { newEditions, type CollectionDesign } from './proposal-editions';
export type { CollectionDesign } from './proposal-editions';

export const collectionDesigns: Record<string, CollectionDesign> = {
  ...newEditions,
  'consultoria-direcao': {
    name: 'Direção estratégica', niche: 'Consultoria', theme: 'noir', layout: 'executive',
    colors: ['#142A3C', '#A6C4D1', '#F5F8FA'], brand: 'NORTE / CONSULTORIA',
    title: 'Clareza para o próximo ciclo.', subtitle: 'Planejamento estratégico e crescimento sustentável',
    description: 'Proposta executiva com diagnóstico, prioridades e plano de implementação.',
    context: 'Organizar as prioridades do negócio, alinhar a liderança e transformar a estratégia em um plano que possa ser acompanhado pela equipe.',
    scope: ['Entrevistas com a liderança e análise de documentos', 'Diagnóstico do negócio e mapa de oportunidades', 'Workshop de prioridades e plano de ação', 'Painel de indicadores e apresentação executiva'],
    steps: ['Semanas 1–2 · Imersão e diagnóstico', 'Semanas 3–4 · Direcionamento estratégico', 'Semanas 5–6 · Plano e alinhamento'],
    value: 24000, terms: ['40% na contratação; 30% no diagnóstico; 30% na entrega', 'Duas rodadas de ajustes na apresentação final', 'Execução operacional e deslocamentos não inclusos'],
  },
  'consultoria-operacao': {
    name: 'Gestão em movimento', niche: 'Consultoria', theme: 'editorial', layout: 'operations',
    colors: ['#164738', '#B9D8C6', '#F6F8F5'], brand: 'EIXO / GESTÃO',
    title: 'Uma operação mais eficiente.', subtitle: 'Processos, pessoas e indicadores na mesma direção',
    description: 'Escopo organizado em frentes de trabalho, entregas e governança.',
    context: 'Mapear o fluxo atual de trabalho e reduzir retrabalho com processos claros, responsáveis definidos e uma rotina de acompanhamento.',
    scope: ['Mapeamento de até três processos prioritários', 'Desenho dos novos fluxos e matriz de responsabilidades', 'Manual operacional e treinamento da equipe', 'Acompanhamento de implantação por 30 dias'],
    steps: ['Mês 1 · Mapeamento e redesenho', 'Mês 2 · Implantação assistida', 'Mês 3 · Acompanhamento e ajustes'],
    value: 18000, terms: ['Três parcelas mensais de R$ 6.000', 'Reuniões quinzenais com o responsável pelo projeto', 'Licenças de ferramentas e contratações não inclusas'],
  },
  'arquitetura-horizonte': {
    name: 'Horizonte residencial', niche: 'Arquitetura', theme: 'editorial', layout: 'residential',
    colors: ['#423D35', '#A08461', '#FAF9F6'], brand: 'HORIZONTE / ARQUITETURA',
    title: 'O seu jeito de habitar.', subtitle: 'Projeto de arquitetura e interiores · residência de 180 m²',
    description: 'Capa editorial com fotografia, programa de necessidades e etapas do projeto.',
    context: 'Traduzir a rotina dos moradores em espaços acolhedores, com integração dos ambientes, luz natural e escolhas de materiais coerentes com o orçamento.',
    scope: ['Levantamento e programa de necessidades', 'Estudo preliminar de layout e conceito', 'Anteprojeto com imagens dos ambientes principais', 'Projeto executivo e caderno de especificações'],
    steps: ['3 semanas · Estudo preliminar', '4 semanas · Anteprojeto', '5 semanas · Detalhamento executivo'],
    value: 42000, terms: ['30% na contratação; 40% no anteprojeto; 30% na entrega', 'Duas revisões por etapa, antes da aprovação', 'Obra, aprovações legais e projetos complementares não inclusos'],
  },
  'arquitetura-espaco': {
    name: 'Espaço corporativo', niche: 'Arquitetura', theme: 'noir', layout: 'workplace',
    colors: ['#222F35', '#A1B9AD', '#F4F6F5'], brand: 'PLANO / ARQUITETURA',
    title: 'Espaços para novas ideias.', subtitle: 'Arquitetura corporativa · escritório de 320 m²',
    description: 'Proposta arquitetônica com programa, implantação e entregáveis técnicos.',
    context: 'Projetar um ambiente de trabalho que equilibre concentração, colaboração e identidade da empresa, respeitando o espaço existente e as prioridades de implantação.',
    scope: ['Briefing com equipes e análise de ocupação', 'Layout, fluxos e programa de ambientes', 'Conceito de materiais, iluminação e mobiliário', 'Detalhamento executivo e compatibilização de interfaces'],
    steps: ['Etapa 1 · Briefing e estudo de ocupação', 'Etapa 2 · Anteprojeto e validação', 'Etapa 3 · Executivo e entrega técnica'],
    value: 58000, terms: ['Pagamento em três marcos de entrega', 'Prazo estimado de 14 semanas após o levantamento', 'Aquisição de mobiliário e gerenciamento da obra à parte'],
  },
  'marketing-aceleracao': {
    name: 'Plano de aceleração', niche: 'Marketing', theme: 'prisma', layout: 'growth',
    colors: ['#2632A4', '#CCD3FF', '#F6F7FC'], brand: 'PULSO / MARKETING',
    title: 'Do interesse à conversão.', subtitle: 'Estratégia de aquisição e mídia de performance',
    description: 'Plano de canais, entregáveis e mensuração em uma proposta direta.',
    context: 'Estruturar a aquisição de demanda qualificada com campanhas, páginas de conversão e uma rotina de testes. As metas serão pactuadas após o diagnóstico inicial.',
    scope: ['Auditoria das campanhas e configuração de mensuração', 'Planejamento de mídia para até dois canais', 'Criação de até oito variações de anúncios por mês', 'Otimização semanal e relatório mensal de resultados'],
    steps: ['Dias 1–15 · Diagnóstico e configuração', 'Dias 16–30 · Primeiras campanhas', 'Meses 2–3 · Testes e otimização'],
    value: 8500, terms: ['Honorários mensais; período inicial de três meses', 'Verba de mídia paga diretamente pelo cliente', 'Resultados dependem da oferta, do mercado e da verba disponível'],
  },
  'marketing-presenca': {
    name: 'Presença & conteúdo', niche: 'Marketing', theme: 'editorial', layout: 'content',
    colors: ['#71383F', '#EBD1CE', '#FCF8F7'], brand: 'TRAMA / CONTEÚDO',
    title: 'Uma marca presente. Todos os dias.', subtitle: 'Estratégia editorial e produção de conteúdo',
    description: 'Narrativa editorial com pilares de conteúdo, cadência e plano mensal.',
    context: 'Construir uma presença consistente nos canais da marca, com conteúdo relevante para a audiência e um fluxo de produção que facilite as aprovações.',
    scope: ['Definição de até quatro pilares editoriais', 'Calendário mensal para duas redes sociais', 'Doze peças estáticas e quatro roteiros de vídeo por mês', 'Relatório mensal com aprendizados e próximos temas'],
    steps: ['Semana 1 · Imersão na marca', 'Semana 2 · Planejamento editorial', 'Semanas 3–4 · Produção e publicação'],
    value: 6200, terms: ['Honorários mensais, com renovação a cada três meses', 'Uma rodada de ajustes por lote de conteúdo', 'Captação, influenciadores e mídia paga contratados separadamente'],
  },
  'design-essencia': {
    name: 'Identidade essencial', niche: 'Design', theme: 'noir', layout: 'identity',
    colors: ['#242327', '#D8FC72', '#F6F6F3'], brand: 'FORMA / DESIGN',
    title: 'Uma identidade com significado.', subtitle: 'Estratégia de marca e sistema de identidade visual',
    description: 'Tipografia marcante com etapas criativas, sistema visual e aplicações.',
    context: 'Criar uma identidade que represente o posicionamento da empresa e funcione de forma consistente nos principais pontos de contato da marca.',
    scope: ['Imersão, diagnóstico e direção estratégica', 'Conceito criativo e sistema de logotipo', 'Paleta de cores, tipografia e linguagem gráfica', 'Manual de marca e cinco aplicações prioritárias'],
    steps: ['Semanas 1–2 · Estratégia', 'Semanas 3–4 · Exploração criativa', 'Semanas 5–6 · Sistema e aplicações'],
    value: 16500, terms: ['50% na contratação e 50% na entrega', 'Duas rodadas de ajustes na direção escolhida', 'Naming, registro de marca e produção gráfica não inclusos'],
  },
  'design-interface': {
    name: 'Produto em foco', niche: 'Design', theme: 'prisma', layout: 'product',
    colors: ['#194A69', '#B5DCE8', '#F3F8FB'], brand: 'ESTÚDIO / DIGITAL',
    title: 'Experiências que fazem sentido.', subtitle: 'Pesquisa, experiência do usuário e design de interfaces',
    description: 'Proposta de produto digital com discovery, jornadas e entrega para desenvolvimento.',
    context: 'Simplificar a experiência do produto a partir dos objetivos do negócio e das necessidades dos usuários, validando as decisões antes do desenvolvimento.',
    scope: ['Discovery com até cinco entrevistas', 'Mapeamento de jornadas e arquitetura de informação', 'Interface de até doze telas e protótipo navegável', 'Biblioteca de componentes e documentação de entrega'],
    steps: ['Semanas 1–2 · Pesquisa e síntese', 'Semanas 3–5 · Jornadas e interfaces', 'Semana 6 · Validação e handoff'],
    value: 28000, terms: ['40% no início; 30% na interface; 30% na entrega', 'Uma rodada de testes com até cinco participantes', 'Recrutamento, desenvolvimento e hospedagem não inclusos'],
  },
} as const;

export function getCollectionDesign(value?: string): CollectionDesign | undefined {
  return Object.entries(collectionDesigns).find(([id, item]) => value === id || value === `${item.niche} · ${item.name}`)?.[1];
}

export const collectionTemplates: ProposalTemplateDefinition[] = Object.entries(collectionDesigns).map(([id, item]) => ({
  id, value: `${item.niche} · ${item.name}`, name: item.name, niche: item.niche,
  description: item.description, theme: item.theme, swatches: [...item.colors],
  focus: item.subtitle, structure: 'objetivo, escopo e entregáveis, etapas, investimento, condições e próximos passos',
}));

export function createCollectionExample(value: string): ArtworkProposal | undefined {
  const design = getCollectionDesign(value);
  if (!design) return;
  return {
    code: 'PROPOSTA / 001', project: design.title, client: 'Cliente exemplo', template: value,
    value: design.value,
    content: { brand_name: design.brand, title: design.title, subtitle: design.subtitle, slides: [
      { type: 'cover', eyebrow: `Proposta de ${design.niche.toLowerCase()}`, title: design.title, body: design.subtitle, bullets: [] },
      { type: 'context', eyebrow: '01 / O ponto de partida', title: 'O que vamos construir juntos.', body: design.context, bullets: [] },
      { type: 'scope', eyebrow: '02 / Escopo de trabalho', title: 'O que está incluído.', body: 'Entregas definidas para orientar o trabalho e alinhar as expectativas em cada etapa.', bullets: [...design.scope] },
      { type: 'process', eyebrow: '03 / Etapas e cronograma', title: 'Da primeira conversa à entrega.', body: 'Os prazos consideram o recebimento dos materiais e a aprovação de cada etapa pelo cliente.', bullets: [...design.steps] },
      { type: 'investment', eyebrow: '04 / Investimento', title: 'Uma proposta clara, do início ao fim.', body: 'Valores ilustrativos. Ajuste o investimento e as condições ao escopo do seu projeto.', bullets: [...design.terms] },
      { type: 'closing', eyebrow: '05 / Próximos passos', title: 'Vamos começar?', body: 'Após a aprovação, alinhamos o contrato, os responsáveis e a data da reunião de início.', bullets: ['Aprovação da proposta', 'Formalização do contrato', 'Reunião de início'] },
    ] },
  };
}

export function collectionMarkdown(value: string) {
  const proposal = createCollectionExample(value);
  if (!proposal) return '';
  return `# ${proposal.project}\n\n> Modelo ilustrativo. Substitua cliente, marca, escopo, valores e condições.\n\nCliente: [nome do cliente]\nEmpresa: [sua empresa]\n\n` + proposal.content!.slides!.map(section =>
    `## ${section.title}\n\n${section.body}\n\n${section.bullets.map(item => `- ${item}`).join('\n')}${section.type === 'investment' ? `\n\nInvestimento de exemplo: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(proposal.value!)}` : ''}`
  ).join('\n\n');
}
