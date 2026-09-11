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

## Conexão da IA

O servidor precisa de `OPENAI_API_KEY`. A chave nunca deve ser enviada no chat do
estúdio, incluída no código, exposta no navegador ou adicionada ao Git.
O módulo usa a Responses API, com `store: false`, no mesmo padrão do agente existente.
O modelo padrão é `gpt-5.5`; `STUDIO_AI_MODEL` permite configurar outro modelo
compatível com Responses, JSON Schema, PDFs e web search. Nenhuma assinatura do
ChatGPT ou da Lovable é usada como crédito de API.

No desenvolvimento com Cloudflare/Vite, configure os segredos no arquivo local
ignorado `.dev.vars` e reinicie o servidor. Na hospedagem, use as variáveis secretas
do ambiente. Nunca versione `.dev.vars`.

Sem a chave, rascunhos, briefing e referências podem ser salvos. A interface informa
que a IA está desconectada e a API retorna `503 ai_not_configured`, sem simular uma
geração. Se a referência pública não puder ser consultada, a resposta informa isso.
O link orienta a estrutura e o conteúdo; não é uma importação idêntica do código da
Lovable. Briefing e PDF são enviados à API para atender à solicitação.

## Banco e validação

As tabelas `studio_projects` e `studio_versions` são isoladas das propostas existentes.
A migração é `drizzle/0009_real_thunderbolt.sql`. Na implantação, use o fluxo de
migrações do projeto. Na base local já preparada, aplique essa migração nova com
Wrangler D1 local no mesmo diretório de persistência do servidor.

As consultas verificam o workspace, e a gravação de versões usa transação e controle
de concorrência. Anexos PDF ficam no R2; conteúdo, mensagens e versões ficam no D1.
Prévia em iframe sem permissões, HTML sanitizado e CSP bloqueiam scripts, formulários
e conexões. Imagens remotas da prévia se limitam a `images.unsplash.com`.

Validação: `node --test tests/studio.test.mjs tests/proposal-workflow.test.mjs`,
`npx tsc --noEmit` e `npm run build`.

Referências oficiais:
- https://developers.openai.com/api/docs/guides/structured-outputs
- https://developers.openai.com/api/docs/guides/file-inputs
- https://developers.openai.com/api/docs/guides/tools-web-search
