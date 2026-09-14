# Equipe

A tela de Equipe usa os registros reais de `workspace_members` do workspace autenticado. Os cartões, a barra de utilização, os indicadores e a lista são calculados a partir desses mesmos dados.

O plano atual permite até 10 pessoas. Esse limite está centralizado em `lib/team-metrics.ts` e também é aplicado pela rota `POST /api/members`, evitando que a interface mostre uma capacidade diferente daquela que o sistema aceita.

Os estados de acesso vêm de `workspace_members.status`: `Ativo` conta como acesso ativo e os demais estados aparecem como pendentes.
