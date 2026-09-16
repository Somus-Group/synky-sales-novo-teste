# Estúdio Lab

Módulo experimental independente, acessível pelo menu **Estúdio Lab**. Os módulos
Agente de propostas, Configurar agente e Propostas continuam disponíveis.

## Fluxos

- **Com briefing**: cole o briefing ou envie PDF, TXT ou MD (até 8 MB). O link de
  referência é opcional. Crie o workspace e envie o primeiro pedido na conversa.
- **Criação livre**: comece sem briefing e sem referência, ou acrescente ambos.
  Descreva a proposta na conversa e peça mudanças sucessivas de texto e visual.
- Cada resposta que altera a página salva uma nova versão. Em **Versões**, abra
  uma versão anterior e restaure-a. Restaurar cria outra versão, sem apagar o histórico.
- A prévia é uma página web privada, com visualizações para computador, tablet e
  celular. A abertura em outra aba exige acesso ao mesmo workspace.

## Editor por conversa

- **Sob medida** é o padrão. Os templates só são usados quando escolhidos
  explicitamente. Uma referência visual tem prioridade sobre o template.
- Links HTTPS enviados na conversa são lidos e salvos como referência junto com
  a versão concluída. Links identificados como contato não substituem o modelo.
- O briefing de até 40.000 caracteres é preservado. O documento atual, a mensagem
  original e as quatro mensagens recentes mantêm o contexto das edições. Textos
  idênticos ao briefing não são reenviados em duplicidade. Pedidos que ultrapassam
  o orçamento estimado são recusados antes da chamada, sem truncar fatos silenciosamente.
- Cada envio faz no máximo uma chamada de IA. Não há especificação separada,
  auditoria paga, repetição automática ou escalada silenciosa para modelo caro.
- A criação produz o visual personalizado uma vez. Edições usam um mapa de
  elementos e retornam apenas mudanças de texto, estilo ou blocos. O servidor
  aplica essas mudanças preservando o restante da marcação. Preços em negrito e
  células de tabelas também aparecem no mapa. Alterações conflitantes são recusadas.
- Verificações de estrutura, navegação e imagens são locais. Alertas de proposta
  ficam na aba Revisão; não representam uma auditoria independente da fidelidade
  comercial. Documento vazio, referência declaradamente ignorada ou imagem
  inexistente preservam a versão anterior sem nova chamada. Logos ausentes na
  criação são inseridas localmente a partir do catálogo real.
- A aba Revisão e cada resposta mostram o consumo estimado. O progresso continua
  vindo do servidor por streaming, sem porcentagens inventadas.
- A leitura de links seleciona as regras CSS das classes encontradas, mantém
  regras responsivas completas e extrai cores, fontes e títulos. Não renderiza
  uma captura da referência nem promete reprodução visual idêntica.

- **Criar** executa pedidos na proposta atual; **Planejar** apenas conversa e salva
  o plano. O servidor descarta qualquer HTML retornado no modo Planejar. **Aplicar
  plano** executa o último plano em uma nova versão.
- **Contexto** permite editar o nome, briefing e apresentação de referência em
  projetos existentes, inclusive remover o link. Alterações pendentes devem ser
  salvas ou descartadas antes de gerar, restaurar ou fazer uma edição visual.
- **Editar visual** seleciona um elemento da prévia. O painel altera texto simples,
  cor, fundo, tamanho e alinhamento sem chamada de IA, salvando uma nova versão.
  Também é possível usar o trecho selecionado como contexto do próximo pedido à IA.
- A prévia permite consultar o código e baixar a proposta em HTML. Isso exporta
  uma cópia local; não publica nem cria um link público para a proposta.
- A biblioteca tem busca por nome. O identificador do último projeto aberto é
  uma preferência da sessão; conteúdo e histórico continuam vindo do servidor.
- Validação visual local com navegador automatizado usa respostas simuladas de IA;
  testes de persistência usam SQLite e o parser real de HTML dos Workers.

## Conexão da IA

O servidor precisa de `OPENAI_API_KEY`. A chave nunca deve ser enviada no chat do
estúdio, incluída no código, exposta no navegador ou adicionada ao Git.
O módulo usa a Responses API, com `store: false`, no mesmo padrão do agente existente.
O padrão econômico usa `STUDIO_ECONOMY_AI_MODEL` ou `gpt-5-mini`. O modo Avançado,
selecionado explicitamente para um envio, usa `STUDIO_DESIGN_AI_MODEL` ou `gpt-5.5`.
Conversas e planejamento usam o modelo econômico mesmo nesse modo. A interface
volta para Econômico após cada envio. As antigas variáveis INITIAL, DETAIL e
STUDIO_AI_MODEL não selecionam mais modelos neste módulo. Modelos sem tarifa
cadastrada são recusados, evitando estimativas incorretas. Nenhuma assinatura do
ChatGPT ou da Lovable é usada como crédito de API.

Orçamento estimado por envio: US$ 0,05 no Econômico e US$ 0,60 no Avançado.
O limite diário padrão é US$ 1 por workspace, configurável no servidor por
`STUDIO_DAILY_BUDGET_USD`; a janela reinicia às 00:00 UTC. Reservas atômicas incluem
pedidos em outros projetos do mesmo workspace. São controles de aplicação, não
garantia do faturamento exato da OpenAI: PDFs, imagens e tarifas podem variar.
Configure também os controles de gastos da conta da API. Requisições duplicadas
com o mesmo identificador não chamam o modelo novamente.

`studio_ai_requests` registra tokens de entrada, saída (incluindo raciocínio),
cache, modelo, custo estimado e status mesmo quando a saída é inválida/truncada.
Falhas de rede sem confirmação mantêm uma reserva conservadora no limite diário;
a interface mostra consumo não confirmado. O histórico anterior à ativação não
é inferido nem contabilizado como custo zero.

As referências lidas são reutilizadas no R2 por até 24 horas, isoladas por projeto
e workspace. "Releia a referência" força atualização. Edições pontuais não
reenviam CSS da referência nem imagens anteriores. O PDF é enviado quando ainda
não há extração salva; a própria chamada devolve seus fatos em `source_summary`,
reutilizado depois. Essa extração é feita por IA, não equivale ao texto original
verificado; o PDF original continua disponível. Prefixos estáveis e
`prompt_cache_key` favorecem o cache da API sem presumir que houve acerto de cache.

Edição visual e substituições inequívocas como `Troque "Escopo confirmado" por
"Escopo aprovado"` não chamam a API. Substituições ambíguas usam a edição por IA.

No desenvolvimento com Cloudflare/Vite, configure os segredos no arquivo local
ignorado `.dev.vars` e reinicie o servidor. Na hospedagem, use as variáveis secretas
do ambiente. Nunca versione `.dev.vars`.

Sem a chave, rascunhos, briefing e referências podem ser salvos. A interface informa
que a IA está desconectada e a API retorna `503 ai_not_configured`, sem simular uma
geração. Se a referência pública não puder ser consultada, a resposta informa isso.
O link orienta o visual e a estrutura; os fatos comerciais vêm do briefing e do pedido.
Não é uma importação idêntica do código da
Lovable. Briefing e PDF são enviados à API para atender à solicitação.

## Banco e validação

As tabelas `studio_projects`, `studio_versions` e `studio_ai_requests` são isoladas
das propostas existentes. A migração adicional de consumo é
`drizzle/0012_large_redwing.sql`. Na implantação, use o fluxo de
migrações do projeto. Na base local já preparada, aplique essa migração nova com
Wrangler D1 local no mesmo diretório de persistência do servidor.

As consultas verificam o workspace, e a gravação de versões usa transação e controle
de concorrência. Anexos PDF ficam no R2; conteúdo, mensagens e versões ficam no D1.
Prévia em iframe, HTML sanitizado e CSP bloqueiam scripts, formulários
e conexões. Imagens remotas da prévia se limitam a `images.unsplash.com`.
No editor, `allow-same-origin` permite somente ao código confiável da interface
inspecionar e selecionar elementos; `allow-scripts` nunca é concedido. A prévia
separada mantém o sandbox opaco. Edições visuais são validadas e sanitizadas no
servidor; cores e estilos aceitam apenas valores limitados.

Validação: `node --test tests/studio.test.mjs tests/studio-media.test.mjs tests/studio-reference.test.mjs tests/proposal-workflow.test.mjs`,
`npx tsc --noEmit` e `npm run build`.

`tests/studio.test.mjs` bloqueia chamadas de rede sem respostas simuladas explícitas.
Essa suíte não utiliza a chave da API. Não executar geração real ou testes pagos
sem autorização do usuário. O teste opcional de referência pública não usa IA e
só roda quando `STUDIO_LIVE_REFERENCE_URL` é definido.

Referências oficiais:

- https://developers.openai.com/api/docs/guides/structured-outputs
- https://developers.openai.com/api/docs/guides/file-inputs
- https://developers.openai.com/api/docs/guides/tools-web-search
