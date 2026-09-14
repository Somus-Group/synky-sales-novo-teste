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
- O briefing de até 40.000 caracteres é enviado inteiro. A mensagem original,
  as dez mensagens recentes e o último plano preservam o contexto de pedidos
  longos colados diretamente no chat.
- A geração tem três etapas: especificação de requisitos e direção visual,
  construção e revisão independente de conteúdo. Se a revisão detectar omissões,
  dados inventados ou falhas de apresentação, há uma tentativa de correção antes
  de salvar. Falhas mantêm a versão anterior e explicam os pontos encontrados.
- A revisão distingue requisitos fornecidos de informações ausentes. Data de
  emissão, contatos e responsáveis não informados ficam em **Informações a definir**,
  sem bloquear a versão ou provocar outra geração. Falhas de conteúdo precisam
  apontar um requisito ou uma citação da fonte; falhas visuais precisam citar
  trechos existentes. Correções de requisitos nunca acrescentam exigências do revisor.
- A aba Revisão apresenta a direção visual e os requisitos conferidos. A conversa
  recebe o progresso real do servidor por streaming, sem porcentagens estimadas.
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
O designer usa `STUDIO_DESIGN_AI_MODEL`, depois `STUDIO_AI_MODEL`, ou `gpt-5.5`.
A especificação e a revisão usam `STUDIO_INITIAL_AI_MODEL` (padrão `gpt-5-mini`).
Edições pontuais usam `STUDIO_DETAIL_AI_MODEL` (padrão `gpt-5-mini`). Os modelos
devem aceitar Responses, JSON Schema, imagens e PDFs. A revisão acrescenta
chamadas à API; a geração pode exigir uma correção adicional. Nenhuma assinatura do
ChatGPT ou da Lovable é usada como crédito de API.

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

As tabelas `studio_projects` e `studio_versions` são isoladas das propostas existentes.
A migração é `drizzle/0009_real_thunderbolt.sql`. Na implantação, use o fluxo de
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
