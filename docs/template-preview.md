# Proposal template preview

The library opens `TemplatePreviewDialog`, independent of the small default dialog
width. Its toolbar remains outside the scrolling proposal and wraps on narrow
screens. Desktop (1280 px), tablet (820 px), and phone (390 px) are actual iframe
viewports, scaled down only when the available workspace is narrower.

`/templates/preview/[id]` accepts only IDs from the existing template catalog and
renders `ProposalOnePage` with fictional example data. It does not load customer
records, saved proposals, or change permissions. The existing "Usar template"
callback is preserved. The observer is attached after the dialog portal mounts
and disconnected on close.

## Validation — 2026-09-11

- Browser checks: Transformation Roadmap, Strategy Board, Executive Advisory in
  all three device modes; real iframe width and document scroll width match.
- No excessive cover-title wrapping; desktop navigation collapses on tablet and
  phone. Header controls and proposal scrolling are independent.
- Phone-sized outer window (390 × 844), dark theme, close/reopen, and applying a
  template to the proposal agent checked without writing customer data.
- Typecheck, production build, and proposal workflow tests pass.
- New preview files pass lint. Existing lint findings in `somus-app.tsx` and
  `proposal-onepage.tsx` remain outside this fix (unused legacy declarations,
  existing effects/deprecated types, and unoptimized image warnings).

No new dependency or database migration is required.
