# Proposal collection — September 2026

The Templates tab now highlights eight complete proposal models (two per niche):

| Niche | Models |
| --- | --- |
| Consultoria | Direção estratégica; Gestão em movimento |
| Arquitetura | Horizonte residencial; Espaço corporativo |
| Marketing | Plano de aceleração; Presença & conteúdo |
| Design | Identidade essencial; Produto em foco |

The collection data, illustrative copy, and complete Markdown download are in
lib/proposal-collection.ts. Each example has a cover, context, scope, schedule,
investment/terms, and closing. Prices and brand names are explicitly examples.

CollectionCover renders both thumbnails and covers. CollectionProposal renders
the selected design with the approved proposal content, brand assets, portfolio,
investment, and acceptance callback. ProposalOnePage routes the eight new IDs to
this renderer; the previous catalog remains resolvable for existing proposals
and in the editor. No saved records or database migrations are changed.

The gallery uses the existing preview dialog with desktop/tablet/phone modes.
Typography and grids have mobile rules, and interaction transitions respect
reduced-motion preferences. Architecture reuses the existing local editorial
image; no new remote image service or package is required.

Validation: proposal workflow tests cover preservation of approved content in
all prior themes and all eight new layouts, category counts, example completeness,
and downloadable content. Typecheck, production build, and new-module lint are
required before publication. Browser visual QA was not part of this request.
