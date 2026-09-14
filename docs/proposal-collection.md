# Proposal collection — September 2026

The first collection introduced eight complete proposal models (two per niche):

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
required before publication. Browser visual QA was not part of that first release.

## Expanded editions and PDF import — 14 September 2026

The gallery now has 40 models: 10 each for Consulting, Architecture, Marketing,
and Design. The previous eight remain intact and 32 service-specific editions
are defined in `lib/proposal-editions.ts`. Eight additional cover compositions
(cinema, split, masthead, poster, frame, gallery, column, offset) vary the imagery,
typography, whitespace, scope cards and process layouts. Preview and actual
proposal rendering share the same components; existing catalog IDs still resolve.

Three original 1536×1024 cover assets were created with built-in ImageGen:

- `public/proposal/architecture-cover.png`: luxury travertine residence, landscaped
  courtyard, warm evening architectural photography, no text/logos/watermark.
- `public/proposal/chrome-cover.png`: liquid chrome ribbon with cobalt reflections,
  dark studio, subject on right with negative space, no text/logos/watermark.
- `public/proposal/campaign-cover.png`: folded orange paper and translucent red
  acrylic, saturated cobalt backdrop, hard studio light, no text/logos/watermark.

### Import design and privacy

`TemplateImporter` accepts PDF upload/drop up to 8 MB. The authenticated import
endpoint uses the existing OpenAI Responses integration (`gpt-5.5`, `store:false`)
to transcribe the PDF into bounded, editable text sections. The UI discloses the
AI transfer before selection. The original PDF is not persisted and its graphic
layout, fonts and images are not reproduced. The user reviews the output, chooses
a Synky layout, edits sections and explicitly saves or uses it. This is content
conversion, not a pixel-perfect PDF editor. Unreadable, incomplete, oversized,
protected or invalid documents return recoverable errors, never demo content.
Provider support reference: https://developers.openai.com/api/docs/guides/file-inputs

Durable imported models live in the new `imported_templates` D1 table. Migration
0011 is additive; no existing records or permissions change. GET scopes by the
authenticated workspace; writes verify ownership and enforce it in the upsert.
Payloads are bounded and rebuilt from allowed plain-text fields, removing URLs,
markup capabilities and unknown fields. Imported instructions are untrusted data.
Only reviewed text is stored; no external file URLs are fetched by this feature.

Using an imported model explicitly saves a new proposal draft via the existing
proposal flow, then opens the standard editor. The original reusable model stays
in the library. Totals start pending, not inferred from potentially ambiguous PDF
numbers; transcribed commercial terms remain editable in the body.

Validation covers all 40 examples, approved-copy preservation, invalid uploads,
missing AI, incomplete responses, content limits and cross-workspace writes.
Browser checks use local preview and synthetic/mocked imports, not customer data
or paid production AI calls. Production AI key presence was confirmed without
reading or changing its value. A real customer PDF has not been imported in QA.

Verification: 39 tests passed and one opt-in live reference test was skipped;
typecheck and production build passed. New/changed collection and import modules
pass lint. `somus-app.tsx` retains pre-existing lint findings in legacy code.
Local browser checks covered eight cover families at 1280/820/390px and the
import/edit/save/reopen flow with mocked AI and storage. A mobile grid specificity
issue and a dialog resize transition were corrected during visual inspection.
The imported editor's title and subtitle stay synchronized with the cover.
Incoming GitHub commit c8cd613 (Estúdio Lab) was fast-forwarded and its targeted
tests were included; no changes from that developer were discarded.
