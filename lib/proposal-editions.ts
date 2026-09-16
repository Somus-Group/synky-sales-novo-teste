import type { ProposalNiche, ProposalTemplateTheme } from './proposal-templates';

export type CollectionDesign = {
  name: string; niche: ProposalNiche; theme: ProposalTemplateTheme; layout: string;
  colors: readonly [string, string, string]; brand: string; title: string; subtitle: string;
  description: string; context: string; scope: readonly string[]; steps: readonly string[];
  value: number; terms: readonly string[]; image?: string;
};

// Each edition has a service-specific scope; prices and schedules are illustrative.
type Edition = [string, string, string, string, string, string, number];
const editions: Record<ProposalNiche, Edition[]> = {
  Consultoria: [
    ['futuro', 'Next / Transformação', 'O próximo capítulo começa agora.', 'Transformação digital', 'Auditoria de maturidade digital|Mapa de oportunidades e riscos|Roadmap de transformação|Governança de implementação', 'Alinhar tecnologia, processos e pessoas em uma transformação com prioridades claras.', 36000],
    ['capital', 'Capital inteligente', 'Números que abrem caminhos.', 'Consultoria financeira', 'Diagnóstico financeiro|Modelagem de fluxo de caixa|Plano de redução de custos|Painel de gestão financeira', 'Dar visibilidade ao caixa e apoiar decisões de investimento com informações organizadas.', 22000],
    ['lideranca', 'Liderança em perspectiva', 'O futuro é feito de pessoas.', 'Desenvolvimento de lideranças', 'Entrevistas e avaliação de competências|Três workshops de liderança|Plano de desenvolvimento individual|Sessões de acompanhamento', 'Desenvolver lideranças preparadas para conduzir equipes e sustentar a estratégia.', 27000],
    ['escala', 'Escala comercial', 'Crescer com direção.', 'Estratégia e operação de vendas', 'Diagnóstico do funil comercial|Definição do perfil de cliente|Playbook de vendas e abordagem|Treinamento e rituais de gestão', 'Organizar a operação de vendas para transformar oportunidades em relações comerciais consistentes.', 19500],
    ['impacto', 'Impacto & legado', 'Valor que vai além do negócio.', 'Estratégia ESG', 'Diagnóstico de práticas atuais|Matriz de materialidade|Plano de compromissos e indicadores|Relatório executivo de sustentabilidade', 'Priorizar iniciativas socioambientais coerentes com o contexto e a capacidade de execução da empresa.', 32000],
    ['governanca', 'Conselho estratégico', 'Decisões à altura da sua ambição.', 'Governança corporativa', 'Mapa de responsabilidades|Estrutura de comitês e alçadas|Calendário de governança|Manual de tomada de decisão', 'Estabelecer uma estrutura de decisão transparente, com responsabilidades e acompanhamento.', 41000],
    ['inovacao', 'Radar de inovação', 'Novas possibilidades. Valor real.', 'Inovação e novos negócios', 'Pesquisa de tendências e mercado|Oficina de oportunidades|Desenho de três conceitos de negócio|Plano de validação das hipóteses', 'Explorar oportunidades de novos negócios antes de comprometer recursos em escala.', 29000],
    ['experiencia', 'Cliente no centro', 'Cada contato conta.', 'Experiência do cliente', 'Pesquisa com clientes|Mapa da jornada e pontos de atrito|Redesenho de dois serviços|Indicadores e plano de acompanhamento', 'Melhorar a experiência nos pontos de contato que mais influenciam a satisfação do cliente.', 24500],
  ],
  Arquitetura: [
    ['materia', 'Matéria & luz', 'Arquitetura para sentir.', 'Residências contemporâneas', 'Programa de necessidades|Estudo volumétrico e implantação|Anteprojeto e imagens 3D|Projeto executivo arquitetônico', 'Projetar uma residência que conecte paisagem, luz e a forma de viver dos moradores.', 68000],
    ['refugio', 'Refúgio natural', 'Um lugar para desacelerar.', 'Casas de campo', 'Análise do terreno|Implantação e integração à paisagem|Projeto dos ambientes|Especificação de materiais naturais', 'Criar um refúgio integrado ao terreno, valorizando conforto, vistas e materiais adequados ao clima.', 52000],
    ['atelier', 'Atelier de interiores', 'O extraordinário está nos detalhes.', 'Interiores residenciais', 'Levantamento e layout|Conceito de interiores|Detalhamento de marcenaria|Caderno de acabamentos e mobiliário', 'Transformar os ambientes existentes com soluções de interiores alinhadas à rotina e ao orçamento.', 38000],
    ['varejo', 'Espaços de marca', 'Seu espaço também comunica.', 'Arquitetura de varejo', 'Jornada de compra e setorização|Conceito arquitetônico da loja|Projeto de expositores|Detalhamento de materiais e iluminação', 'Traduzir a identidade da marca em uma experiência de compra funcional e memorável.', 46000],
    ['hospitalidade', 'Hospitalidade essencial', 'Receber é uma arte.', 'Hotéis e pousadas', 'Programa de hospedagem|Estudo dos quartos e áreas comuns|Conceito de interiores|Caderno técnico de especificações', 'Criar espaços de acolhimento que equilibrem experiência do hóspede e operação cotidiana.', 89000],
    ['paisagem', 'Entre jardins', 'A natureza encontra seu lugar.', 'Paisagismo', 'Análise de insolação e solo|Plano de massas vegetais|Projeto de percursos e áreas de estar|Caderno de espécies e manutenção', 'Desenhar áreas externas que aproximem as pessoas da natureza e respeitem as condições do local.', 26000],
    ['restauro', 'Tempo & memória', 'Preservar para reinventar.', 'Reforma e requalificação', 'Levantamento do imóvel|Diagnóstico de usos e potencialidades|Projeto de requalificação|Detalhamento de intervenções', 'Requalificar um espaço existente preservando suas características relevantes e atualizando seus usos.', 57000],
    ['saude', 'Espaços de cuidado', 'Projetar também é cuidar.', 'Clínicas e espaços de saúde', 'Programa de ambientes e fluxos|Estudo de layout e acessibilidade|Projeto de interiores|Documentação para compatibilização técnica', 'Organizar ambientes de atendimento acolhedores com fluxos claros para pacientes e equipes.', 49000],
  ],
  Marketing: [
    ['lancamento', 'Big / Lançamento', 'Impossível passar despercebido.', 'Lançamento de produto', 'Pesquisa de público e mensagem|Conceito criativo de campanha|Plano de lançamento multicanal|Kit de peças e relatório inicial', 'Criar uma campanha de lançamento coesa que apresente o produto ao público certo.', 23500],
    ['cultura', 'Cultura de marca', 'Uma marca que faz parte da conversa.', 'Posicionamento e comunicação', 'Diagnóstico de posicionamento|Territórios de comunicação|Narrativa e mensagens-chave|Guia de ativação da marca', 'Encontrar um território de comunicação relevante para o público e consistente com o negócio.', 18000],
    ['social', 'Social first', 'Conteúdo que entra na conversa.', 'Redes sociais', 'Estratégia para duas redes|Calendário de conteúdo mensal|Oito carrosséis e quatro roteiros|Rotina de análise e otimização', 'Desenvolver conteúdo reconhecível e uma rotina editorial sustentável para as redes da marca.', 7200],
    ['performance', 'Performance / Lab', 'Criatividade encontra conversão.', 'Campanhas de aquisição', 'Auditoria de conversão|Estratégia de mídia para dois canais|Plano de testes criativos|Relatório e otimização semanal', 'Conectar criação e mensuração em campanhas orientadas a hipóteses verificáveis.', 9800],
    ['influencia', 'Vozes & conexões', 'Histórias que aproximam.', 'Marketing de influência', 'Mapeamento de criadores|Curadoria e critérios de parceria|Briefings de conteúdo|Acompanhamento e relatório da campanha', 'Construir parcerias entre a marca e criadores alinhados ao seu público e posicionamento.', 14500],
    ['evento', 'Ao vivo / Brand experience', 'Uma experiência para ficar.', 'Ativação e eventos', 'Conceito da ativação|Jornada dos participantes|Plano de divulgação|Kit criativo e roteiro de operação', 'Transformar um encontro de marca em uma experiência coerente antes, durante e depois do evento.', 31000],
    ['relacionamento', 'Conexão contínua', 'A próxima venda começa na relação.', 'CRM e relacionamento', 'Segmentação da base|Desenho de três jornadas|Copy de oito mensagens|Plano de testes e indicadores', 'Criar uma comunicação útil em cada etapa do relacionamento, respeitando consentimento e preferências.', 12500],
    ['busca', 'Presença orgânica', 'Seja encontrado por quem importa.', 'SEO e conteúdo', 'Auditoria técnica do site|Pesquisa de temas e palavras-chave|Plano de otimização de páginas|Quatro pautas e relatório mensal', 'Organizar a presença orgânica com base na intenção de busca e na qualidade do conteúdo.', 8800],
  ],
  Design: [
    ['chrome', 'Beyond / Brand design', 'Nascida para ser diferente.', 'Identidade visual experimental', 'Imersão e plataforma de marca|Duas direções visuais|Sistema de identidade completo|Brandbook e seis aplicações', 'Construir uma identidade expressiva que tenha presença e consistência em diferentes formatos.', 28000],
    ['objeto', 'Objeto de desejo', 'Design que dá vontade de ter.', 'Design de embalagens', 'Análise de categoria|Conceito para uma linha de produtos|Sistema gráfico de três embalagens|Arquivos finais para produção', 'Criar uma família de embalagens reconhecível que comunique o valor do produto na prateleira.', 21000],
    ['editorial', 'Margem / Editorial', 'Boas histórias merecem boa forma.', 'Design editorial', 'Direção de arte|Projeto gráfico de publicação|Diagramação de até 40 páginas|Fechamento digital e para impressão', 'Organizar texto e imagem em uma publicação com ritmo de leitura e identidade própria.', 17500],
    ['motion', 'Move / Motion design', 'Sua marca em movimento.', 'Animação e identidade em vídeo', 'Conceito e storyboard|Styleframes de direção de arte|Animação de até 30 segundos|Três adaptações de formato', 'Criar uma linguagem de movimento que amplie a identidade da marca nos canais digitais.', 19500],
    ['digital', 'Interface / Studio', 'O simples exige intenção.', 'Design de produto digital', 'Discovery e definição de fluxos|Wireframes de até dez telas|Interface e protótipo navegável|Documentação para desenvolvimento', 'Desenhar interfaces claras, acessíveis e alinhadas aos objetivos do produto.', 32000],
    ['tipografia', 'Tipo & personalidade', 'Uma voz que se vê.', 'Sistema visual tipográfico', 'Pesquisa de expressão visual|Direção tipográfica|Sistema de aplicação|Guia de uso e cinco aplicações', 'Dar personalidade à comunicação por meio de tipografia, ritmo visual e hierarquia.', 16000],
    ['sistema', 'Design em escala', 'Consistência que liberta.', 'Design system', 'Auditoria de interfaces|Tokens e fundamentos visuais|Biblioteca de até 25 componentes|Documentação e workshop de adoção', 'Organizar a linguagem visual do produto em um sistema compartilhado entre design e desenvolvimento.', 39000],
    ['cultural', 'Forma / Cultura', 'Ideias que ocupam espaço.', 'Identidade cultural e sinalização', 'Pesquisa e conceito visual|Identidade do projeto cultural|Sistema de sinalização|Kit de peças de divulgação', 'Criar um sistema visual que conecte conteúdo, espaço e público em um projeto cultural.', 24000],
  ],
};

const layouts = ['cinema', 'split', 'masthead', 'poster', 'frame', 'gallery', 'column', 'offset'];
const palettes: Record<ProposalNiche, Array<readonly [string, string, string]>> = {
  Consultoria: [['#111D30','#9EB6DE','#F5F7FB'],['#183B31','#B5CD9C','#F5F8F2'],['#3A203C','#DDBDCB','#FCF7FA'],['#172E62','#F2BC52','#F7F8FC'],['#153F32','#A8C9A0','#F4F7F3'],['#24232D','#D5B789','#FAF8F4'],['#162F4B','#75BFE2','#F1F7FB'],['#672D32','#EDBDB4','#FFF7F4']],
  Arquitetura: [['#282A25','#C8B398','#FAF8F4'],['#253F33','#B9C3AA','#F5F6F1'],['#493D32','#C8A67D','#FCF9F4'],['#2F302F','#EF784A','#FAF7F4'],['#442B2F','#D7B89D','#FAF7F3'],['#233B31','#ADC38C','#F5F7F0'],['#5F3E2D','#C7A080','#FAF7F2'],['#203C40','#ABC7C3','#F3F8F7']],
  Marketing: [['#2921A5','#FF643E','#FAF9FF'],['#6B203A','#E5B6CE','#FCF6FA'],['#AC292C','#F5BB36','#FFF9EF'],['#232632','#BCF45C','#F7FAF3'],['#3F216D','#DAAFE9','#FAF5FC'],['#842D13','#FFC671','#FFF7EB'],['#153D50','#96CDDA','#F1F8FA'],['#204534','#C3DAA3','#F6FAF1']],
  Design: [['#15151D','#A5B9FF','#F7F7FA'],['#373179','#F8A061','#FFF8F2'],['#4A2434','#D9B6C2','#FBF6F8'],['#201C9A','#FE8362','#F7F6FF'],['#153C4D','#9BD8D2','#F2F9F9'],['#2B2926','#E5D6B3','#FBF8EF'],['#163866','#AAC6FF','#F4F7FF'],['#8E2924','#EFBA64','#FFF8EE']],
};

export const newEditions: Record<string, CollectionDesign> = Object.fromEntries(
  Object.entries(editions).flatMap(([sector, items]) => items.map(([id, name, title, service, scope, context, value], index) => {
    const niche = sector as ProposalNiche;
    return [`${niche.toLowerCase()}-${id}`, {
      name, niche, theme: index % 3 === 0 ? 'noir' : index % 3 === 1 ? 'editorial' : 'prisma',
      layout: layouts[index], colors: palettes[niche][index], brand: `${name.split(' / ')[0].toUpperCase()} / ${niche.toUpperCase()}`,
      title, subtitle: service, description: `${service}: ${scope.split('|').slice(0, 2).join(' e ').toLowerCase()}.`,
      context, scope: scope.split('|'), value,
      steps: niche === 'Arquitetura' ? ['Semanas 1–3 · Levantamento e conceito', 'Semanas 4–7 · Anteprojeto e validação', 'Semanas 8–12 · Executivo e especificações'] : ['Semanas 1–2 · Imersão e direcionamento', 'Semanas 3–5 · Desenvolvimento e revisão', 'Semana 6 · Entrega e próximos passos'],
      terms: ['Valores e prazos de exemplo, sujeitos à adequação do escopo', '40% no início, 30% na aprovação intermediária e 30% na entrega', 'Duas rodadas de ajustes; produção, mídia e serviços de terceiros à parte'],
      image: niche === 'Arquitetura' ? '/proposal/architecture-cover.png' : niche === 'Marketing' ? '/proposal/campaign-cover.png' : '/proposal/chrome-cover.png',
    } satisfies CollectionDesign];
  })),
);
