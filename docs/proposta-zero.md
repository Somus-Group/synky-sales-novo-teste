# Proposta Zero (experimental)

Available at `/zero` and in the **Proposta Zero** sidebar entry. This is an
independent proposal composer, not a cheaper model or an automatic fallback to AI.
Existing Estudio Lab, agent, clients and proposals remain unchanged.

## Cost Boundary

Generation, editing, calculations, layout selection, JSON export and printing run
in the browser. This module makes no model calls and requires no AI API key.
There are no tokens, paid retries or background AI jobs in its flow. Existing
hosting, D1 storage and optional logo/reference requests still use infrastructure;
"R$ 0 em IA" is not a claim that hosting or all infrastructure is free.

## Prototype Workflow

- The default **Escrever** view has one natural request textarea and one
  **Montar proposta** action. It accepts inline client names, custom priced
  services, BRL amounts, explicit monthly/one-off billing, duration, objectives,
  validity and exclusions. TXT/MD import uses the same entry point (24,000
  characters). Example: `Proposta para Aurora. Site por R$ 4.000, pagamento
unico. Validade de 15 dias.`
- Composition is a bounded local rules parser, not general-purpose AI. It does
  not interpret arbitrary commands, follow reference links or silently fall back
  to a model. Unrecognized clauses appear as unapplied excerpts. Ambiguous prices,
  installment amounts and unit rates remain pending; unspecified frequency is
  flagged for review. A shared package price is not assigned to multiple services.
  Only supplied scope text is used, without adding catalog promises automatically.
- The complete request remains in the private briefing, not in the client-facing
  export. Changing it does not regenerate automatically. The UI flags the old
  preview and prevents saving, printing or exporting it as the updated proposal
  until the request is applied. Rebuilding replaces commercial data from the full
  request, preserving sender identity, visual choices and images. Replacing saved
  or manually edited content requires confirmation.
- **Ajustar detalhes** retains all optional direct editing controls and the older
  explicit-label briefing importer. Existing drafts without a briefing open here.
  The clearly fictional example also remains here and is never saved automatically.
  Select suggested scope entries or add a custom service. All scope text is
  editable. No price is assumed. Unknown prices remain visibly pending rather
  than being presented as free services. Review catalog suggestions before export.
- Quantities, discounts, one-off fees, monthly fees and duration recalculate
  locally using integer cents. No tax is calculated or implied. Contract totals
  multiply only monthly fees by duration and add one-off fees once.
- Three page compositions (Editorial, Estudio, Executiva) use a full-width image
  cover, visual deliverables, supplied timeline steps, highlighted investment and
  optional contact links. Executiva places investment before scope; Estudio uses
  a typographic service grid; Editorial uses individual delivery cards.
- The cover can follow the selected service category, use existing built-in
  composition images or use an image from the current workspace's library.
  Built-in images are illustrative, never presented as the supplier's portfolio.
  Add up to six workspace images with editable captions; no cases, testimonials,
  performance metrics, terms or timeline steps are invented.
- Image uploads reuse the existing image library (JPG/PNG/WebP, 8 MB each). Every
  selected stored image is verified against the workspace when saving.
  Accent color, system typography and the existing supplier logo remain editable.
  An optional public
  HTTPS reference reader extracts colors/font hints using the existing safe
  reader. It does not clone a site, import its commercial data or fully interpret
  an arbitrary briefing. No external font or AI/image-generation service is used.
- Save manually in isolated workspace drafts; open or duplicate a draft as a base.
  Concurrent/stale writes return 409 and retain the unsaved local editor content.
  Leaving the module with unsaved content requires confirmation.
- Download an editable JSON copy or a standalone HTML proposal. HTML export embeds
  the logo, cover and project images, bounded to 32 MB of image source data.
  Browser printing waits for selected images and supports saving a PDF. Neither action
  publishes a link nor inserts a proposal into the existing sales pipeline.

## Storage and Safety

Migration: `drizzle/0013_curvy_gressill.sql`, adding only `zero_projects` and its
workspace/updated index. No existing rows or tables are rewritten.
`GET/POST /api/zero` enforce authentication and workspace scoping, validate bounded
drafts, and use revision-checked writes. Logos must belong to the same workspace.
The list returns the latest 100 drafts. There is no automatic background save.

HTML is generated from a fixed renderer with escaped content and a restrictive
CSP, without executable scripts, forms or remote model connections. Preview uses
a sandboxed iframe without `allow-scripts`; print access permits only the trusted
parent application to request the browser's print dialog.

## Validation

`node --test tests/zero-proposal.test.mjs` blocks network globally. It covers
money calculations, missing prices, briefing limits, escaped HTML in all layouts,
authentication, workspace isolation, stale writes and mocked reference extraction.
Also run `npx tsc --noEmit` and `npm run build`. Never run paid API generation to
validate this prototype. Local route checks do not exercise real AI or production
client data. Browser interaction/visual tests were not run for this change.
