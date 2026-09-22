export const zeroProposalStyles = `
* { box-sizing: border-box; }
html { scroll-behavior: smooth; scroll-padding-top: 76px; }
body { margin: 0; background: #f4f2ed; color: #15181a; font: 16px/1.55 Arial, Helvetica, sans-serif; overflow-wrap: anywhere; }
h1, h2, h3, p, figure { margin: 0; }
h1, h2, h3 { letter-spacing: 0; line-height: .98; text-wrap: balance; }
h1 { font: 700 82px/.94 Arial, Helvetica, sans-serif; }
h1.long-title { font-size: 61px; }
h2 { font: 700 53px/1 Arial, Helvetica, sans-serif; }
h3 { font: 700 26px/1.08 Arial, Helvetica, sans-serif; }
a { color: inherit; text-decoration: none; }
img { display: block; max-width: 100%; }
.wrap { width: min(1210px, calc(100% - 64px)); margin: auto; }

.brandbar { position: sticky; z-index: 20; top: 0; background: #101315; border-bottom: 1px solid #ffffff24; }
.brandbar-inner { display: flex; min-height: 66px; align-items: center; justify-content: space-between; gap: 22px; }
.brand { display: flex; align-items: center; min-width: 0; max-width: 42%; color: #fff; font-size: 14px; font-weight: 800; }
.brand img { width: 144px; height: 36px; object-fit: contain; object-position: left; }
.brandbar nav { display: flex; align-items: center; flex-wrap: wrap; gap: 3px; }
.brandbar nav a { padding: 7px 10px; border-radius: 5px; color: #b8bbb9; font-size: 11px; font-weight: 800; }
.brandbar nav a:hover { background: #ffffff16; color: #fff; }

.hero { position: relative; isolation: isolate; min-height: 748px; overflow: hidden; background: #101315; color: #fff; }
.hero:before { position: absolute; z-index: -1; top: 0; right: 0; bottom: 0; width: 34%; background: var(--accent); content: ''; }
.hero:after { position: absolute; z-index: -1; top: 0; right: 0; bottom: 0; width: 34%; border-left: 1px solid #ffffff25; content: ''; }
.hero-media { position: absolute; z-index: -1; top: 0; right: 0; width: 34%; height: 100%; object-fit: cover; opacity: .42; filter: grayscale(1) contrast(1.17); }
.hero-content { display: grid; grid-template-columns: minmax(0, 1.22fr) minmax(270px, .58fr); align-items: end; gap: 68px; min-height: 748px; padding: 116px 0 55px; }
.hero-copy { max-width: 820px; }
.eyebrow, .section-label { display: flex; align-items: center; gap: 9px; font-size: 10px; font-weight: 850; letter-spacing: .11em; text-transform: uppercase; }
.eyebrow { color: #c9ccc7; }
.eyebrow:before { display: block; width: 8px; height: 8px; background: var(--accent); content: ''; }
.hero-client { margin: 45px 0 14px; color: var(--accent); font-size: 18px; font-weight: 800; }
.hero h1 { max-width: 795px; color: #fff; }
.hero-subject { max-width: 625px; margin-top: 29px; color: #e0e2dc; font-size: 20px; line-height: 1.44; }
.hero-subject p + p { margin-top: 14px; }
.hero-link { display: inline-flex; align-items: center; gap: 18px; margin-top: 37px; padding: 7px 7px 7px 16px; background: var(--accent); color: var(--on-accent); font-size: 13px; font-weight: 850; }
.hero-link span { display: grid; width: 29px; height: 29px; place-items: center; background: #101315; color: #fff; font-size: 17px; }
.hero-link:hover { transform: translateY(-2px); }
.hero-panel { align-self: end; padding: 23px 0 0 24px; border-left: 1px solid #ffffff7a; }
.hero-panel > span { display: block; margin-bottom: 17px; color: #fff; font-size: 10px; font-weight: 850; letter-spacing: .11em; text-transform: uppercase; }
.hero-services { display: grid; gap: 0; margin: 0; padding: 0; list-style: none; }
.hero-services li { display: grid; grid-template-columns: 31px 1fr; gap: 9px; padding: 11px 0; border-top: 1px solid #ffffff49; color: #fff; font-size: 14px; font-weight: 750; }
.hero-services li span { color: #edf0e7; font-size: 10px; font-weight: 850; letter-spacing: .08em; }
.hero-panel > a { display: flex; justify-content: space-between; gap: 16px; margin-top: 21px; padding: 17px 0 0; border-top: 1px solid #ffffff49; color: #fff; font-size: 12px; font-weight: 850; }
.project-strip { background: #101315; color: #fff; }
.project-facts { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); border-top: 1px solid #ffffff24; }
.project-facts div { min-width: 0; padding: 25px 28px 28px; border-right: 1px solid #ffffff24; }
.project-facts div:first-child { border-left: 1px solid #ffffff24; }
.project-facts dt { margin-bottom: 8px; color: #9fa39f; font-size: 10px; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; }
.project-facts dd { margin: 0; color: #fff; font-size: 16px; font-weight: 800; line-height: 1.23; }

.section { padding: 118px 0; }
.section-label { margin-bottom: 18px; color: var(--accent); }
.section-heading { max-width: 700px; margin-bottom: 58px; }
.context { background: #eeece5; }
.context-grid { display: grid; grid-template-columns: minmax(250px, .76fr) minmax(0, 1.24fr); gap: 95px; }
.context .section-heading { position: sticky; top: 105px; align-self: start; margin: 0; }
.objective-copy { max-width: 760px; color: #242725; font-size: 29px; line-height: 1.43; }
.objective-copy p + p { margin-top: 18px; }
.objective-copy.long-copy { font-size: 18px; line-height: 1.62; }

.briefing { background: #e7e3db; }
.briefing-grid { display: grid; grid-template-columns: minmax(250px, .76fr) minmax(0, 1.24fr); gap: 95px; }
.briefing-grid .section-heading { position: sticky; top: 105px; align-self: start; margin: 0; }
.briefing details { border-top: 2px solid #161918; }
.briefing summary { display: flex; align-items: center; justify-content: space-between; gap: 18px; padding: 22px 0; cursor: pointer; color: #161918; font-size: 15px; font-weight: 850; list-style: none; }
.briefing summary::-webkit-details-marker { display: none; }
.briefing summary span { font-size: 24px; }
.briefing details[open] summary span { transform: rotate(45deg); }
.briefing-copy { padding: 0 0 8px; color: #343834; font-size: 17px; line-height: 1.66; white-space: normal; }
.briefing-copy p + p { margin-top: 16px; }

.scope { background: #faf9f5; }
.scope-chapters { border-top: 1px solid #c8c9c3; }
.scope-chapter { display: grid; grid-template-columns: 130px minmax(210px, .85fr) minmax(200px, 1.18fr); gap: 38px; min-height: 354px; padding: 38px 0; border-bottom: 1px solid #c8c9c3; }
.scope-chapter:nth-child(even) { padding-left: 14%; }
.scope-name, .chapter-content, .scope-description { min-width: 0; }
.service-number { display: grid; width: 51px; height: 51px; place-items: center; background: #101315; color: var(--accent); font-size: 12px; font-weight: 850; }
.service-type { display: block; margin: 10px 0 0; color: #656965; font-size: 10px; font-weight: 850; letter-spacing: .1em; text-transform: uppercase; }
.scope-name h3 { margin-top: 23px; }
.chapter-content { display: flex; flex-direction: column; gap: 22px; padding-top: 4px; }
.deliverables { margin: 0; padding: 0; list-style: none; color: #424742; }
.deliverables li { position: relative; padding: 8px 0 8px 19px; border-bottom: 1px solid #dedfd9; font-size: 15px; }
.deliverables li:before { position: absolute; left: 0; color: var(--accent); content: '\\2197'; font-weight: 900; }
.deliverables li:last-child { border-bottom: 0; }
.scope-more summary { padding-top: 8px; color: #202421; cursor: pointer; font-size: 13px; font-weight: 800; }
.service-price { display: flex; align-items: end; justify-content: space-between; gap: 17px; margin-top: auto; padding-top: 22px; border-top: 2px solid #151817; }
.service-price strong { color: #111315; font-size: 31px; line-height: 1; font-variant-numeric: tabular-nums; }
.service-price > span { max-width: 115px; color: #666b66; font-size: 10px; line-height: 1.35; text-align: right; }

.scope-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); border-top: 1px solid #c8c9c3; border-left: 1px solid #c8c9c3; }
.scope-tile { display: flex; min-height: 350px; flex-direction: column; padding: 31px; border-right: 1px solid #c8c9c3; border-bottom: 1px solid #c8c9c3; background: #faf9f5; }
.scope-tile:nth-child(4n + 2) { background: #e1f6ee; }
.scope-tile:nth-child(4n + 3) { background: #ffcb7b; }
.scope-tile .scope-name h3 { max-width: 380px; }
.scope-tile .chapter-content { flex: 1; }

.schedule { background: #1f3940; color: #fff; }
.schedule .section-label { color: #a5e4d1; }
.schedule h2 { max-width: 650px; }
.process { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); margin: 0; padding: 0; border-top: 1px solid #ffffff38; border-left: 1px solid #ffffff38; list-style: none; }
.process li { min-width: 0; min-height: 288px; padding: 28px; border-right: 1px solid #ffffff38; border-bottom: 1px solid #ffffff38; }
.step-number { display: block; margin-bottom: 78px; color: #a5e4d1; font-size: 34px; font-weight: 800; }
.process h3 { margin-bottom: 12px; font-size: 20px; }
.process p { color: #d7e4e2; }
.process.single { max-width: 690px; }

.references { background: #efede7; }
.portfolio { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
.portfolio figure { min-width: 0; }
.portfolio figure:first-child:nth-last-child(odd) { grid-column: 1 / -1; }
.portfolio img { width: 100%; aspect-ratio: 16 / 9; object-fit: cover; }
.portfolio figcaption { margin-top: 10px; color: #626862; font-size: 13px; }

.investment { background: var(--accent); color: var(--on-accent); }
.investment .section-label { color: var(--on-accent); opacity: .72; }
.investment-heading { display: flex; align-items: end; justify-content: space-between; gap: 50px; margin-bottom: 54px; }
.investment-heading .section-heading { margin: 0; }
.investment-heading > p { min-width: 180px; font-size: 13px; line-height: 1.35; opacity: .82; }
.investment-heading > p strong { display: block; margin-top: 7px; font-size: 18px; opacity: 1; }
.totals { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1px; background: #101315; }
.total { min-width: 0; padding: 29px; background: var(--accent); }
.total > span { display: block; font-size: 11px; font-weight: 850; letter-spacing: .03em; opacity: .73; }
.total strong { display: block; margin-top: 24px; font-size: 39px; line-height: 1; font-variant-numeric: tabular-nums; }
.total small { display: block; margin-top: 15px; font-size: 11px; opacity: .73; }
.investment-note { margin-top: 24px; max-width: 680px; font-size: 13px; opacity: .78; }
.price-detail { margin-top: 39px; border-top: 1px solid #ffffff88; }
.price-detail summary { display: flex; align-items: center; justify-content: space-between; gap: 20px; padding: 21px 0; cursor: pointer; font-size: 14px; font-weight: 850; list-style: none; }
.price-detail summary::-webkit-details-marker { display: none; }
.price-detail summary span { font-size: 25px; }
.price-detail[open] summary span { transform: rotate(45deg); }
.table-wrap { overflow: auto; }
table { width: 100%; min-width: 520px; border-collapse: collapse; font-size: 14px; }
th, td { padding: 14px 9px; border-bottom: 1px solid #ffffff88; text-align: left; }
th { font-size: 11px; font-weight: 800; opacity: .72; }
th:last-child, td:last-child { text-align: right; white-space: nowrap; }

.agreements { background: #faf9f5; }
.conditions { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); border-top: 1px solid #c8c9c3; border-left: 1px solid #c8c9c3; }
.conditions > div { padding: 31px; border-right: 1px solid #c8c9c3; border-bottom: 1px solid #c8c9c3; }
.conditions h3 { margin-bottom: 19px; font-size: 22px; }
.conditions p { color: #4a504b; }
.conditions p + p { margin-top: 14px; }

.closing { padding: 90px 0 30px; background: #101315; color: #fff; }
.closing .section-label { color: var(--accent); }
.closing-row { display: flex; align-items: end; justify-content: space-between; gap: 52px; margin-bottom: 76px; }
.closing h2 { max-width: 660px; }
.contact { display: flex; flex-direction: column; gap: 9px; min-width: 286px; }
.contact a { display: flex; align-items: center; justify-content: space-between; gap: 28px; padding: 15px 17px; background: var(--accent); color: var(--on-accent); font-size: 14px; font-weight: 850; }
.contact a.secondary { border: 1px solid #ffffff54; background: transparent; color: #fff; }
.signature { display: flex; justify-content: space-between; gap: 18px; padding-top: 22px; border-top: 1px solid #ffffff32; color: #afb5af; font-size: 12px; }
.signature strong { color: #fff; }
.signature a:hover { color: #fff; text-decoration: underline; }

.editorial h1, .editorial h2 { font-family: Georgia, serif; font-weight: 500; }
.editorial .hero { background: #2c2523; }
.editorial .hero:before { background: #cc5b46; }
.editorial .hero-link { background: #f0cc78; color: #2c2523; }
.editorial .hero-link span { background: #2c2523; }
.editorial .project-strip, .editorial .closing { background: #2c2523; }
.editorial .scope { background: #f2ede6; }
.editorial .scope-chapter { border-color: #b7a99f; }
.editorial .scope-chapter:nth-child(even) { background: #e6d9cd; }
.editorial .investment { background: #f0cc78; color: #2c2523; }
.editorial .totals { background: #2c2523; }
.editorial .total { background: #f0cc78; }

.contrast .hero { background: #101a20; }
.contrast .hero:before { background: #ff7567; }
.contrast .hero-link { background: #dbf3e8; color: #101a20; }
.contrast .hero-link span { background: #101a20; }
.contrast .project-strip, .contrast .closing { background: #101a20; }
.contrast .scope { background: #f2f5f0; }
.contrast .scope-grid { border-color: #9dafaa; }
.contrast .scope-tile { border-color: #9dafaa; }
.contrast .scope-tile:nth-child(4n + 2) { background: #dbf3e8; }
.contrast .scope-tile:nth-child(4n + 3) { background: #ffb768; }
.contrast .schedule { background: #15404a; }
.contrast .investment { background: #ff7567; color: #101a20; }
.contrast .totals { background: #101a20; }
.contrast .total { background: #ff7567; }

.compact h1, .compact h2 { font-family: Arial, Helvetica, sans-serif; }
.compact .hero { min-height: 640px; background: #21323d; }
.compact .hero:before { background: #c6e9e4; }
.compact .hero-content { min-height: 640px; padding-top: 95px; }
.compact .hero-client { color: #c6e9e4; }
.compact .project-strip, .compact .closing { background: #21323d; }
.compact .section { padding: 88px 0; }
.compact .scope { background: #fbfbf8; }
.compact .scope-ledger { margin: 0; padding: 0; border-top: 2px solid #21323d; list-style: none; }
.compact .scope-row { display: grid; grid-template-columns: .7fr 1.2fr .65fr; gap: 34px; align-items: start; padding: 29px 0; border-bottom: 1px solid #c5cbc8; }
.compact .scope-row .service-number { margin: 0 0 14px; background: #21323d; color: #c6e9e4; }
.compact .scope-row .scope-name h3 { margin-top: 0; }
.compact .scope-row .service-price { display: block; margin: 0; padding: 0; border: 0; text-align: right; }
.compact .scope-row .service-price > span { display: block; margin: 8px 0 0 auto; }
.compact .investment { background: #c6e9e4; color: #21323d; }
.compact .totals { background: #21323d; }
.compact .total { background: #c6e9e4; }

/* A linked proposal switches to a separate, web-first composition. */
.reference-mode { background: #f2f5ee; color: #17251f; }
.reference-mode .brandbar { background: #f8faf5; border-bottom-color: #1a30251f; }
.reference-mode .brand { color: #17251f; }
.reference-mode .brandbar nav a { color: #52645a; }
.reference-mode .brandbar nav a:hover { background: #dce8d9; color: #17251f; }
.reference-mode .hero, .reference-mode.compact .hero { min-height: 760px; background: #14271f; }
.reference-mode .hero:before { inset: 0; width: auto; background: #14271f; opacity: .72; }
.reference-mode .hero:after { display: none; }
.reference-mode .hero-media { inset: 0; width: 100%; height: 100%; opacity: .56; filter: none; }
.reference-mode .hero-content, .reference-mode.compact .hero-content { grid-template-columns: 1fr; min-height: 760px; align-content: end; gap: 42px; padding: 120px 0 42px; }
.reference-mode .hero-copy { max-width: 880px; }
.reference-mode .hero-client { margin-top: 32px; color: #d4f0a4; }
.reference-mode .hero h1 { max-width: 880px; font-family: var(--display); font-size: clamp(58px, 7vw, 104px); font-weight: var(--weight); }
.reference-mode .hero-subject { max-width: 690px; color: #f0f5e9; }
.reference-mode .hero-link { background: #d4f0a4; color: #16241e; }
.reference-mode .hero-link span { background: #f8faf5; color: #16241e; }
.reference-mode .hero-panel { display: grid; grid-template-columns: 120px minmax(0, 1fr) auto; align-items: end; gap: 24px; padding: 20px 0 0; border-top: 1px solid #ffffff75; border-left: 0; }
.reference-mode .hero-panel > span { margin: 0; color: #d4f0a4; }
.reference-mode .hero-services { grid-template-columns: repeat(3, minmax(0, 1fr)); column-gap: 20px; }
.reference-mode .hero-services li { grid-template-columns: 22px 1fr; }
.reference-mode .hero-panel > a { margin: 0; padding: 0 0 2px; border-top: 0; color: #d4f0a4; white-space: nowrap; }
.reference-mode .project-strip { background: #f8faf5; color: #17251f; }
.reference-mode .project-facts { border-color: #1a30251f; }
.reference-mode .project-facts div { padding: 24px 0; border: 0; border-right: 1px solid #1a30251f; }
.reference-mode .project-facts div:first-child { border-left: 0; }
.reference-mode .project-facts dt { color: #65766b; }
.reference-mode .project-facts dd { color: #17251f; }
.reference-mode .context, .reference-mode .briefing { background: #f2f5ee; }
.reference-mode .scope { background: #f8faf5; }
.reference-mode .context-grid, .reference-mode .briefing-grid { gap: 72px; }
.reference-mode .context .section-heading, .reference-mode .briefing-grid .section-heading { position: static; }
.reference-mode .objective-copy { font-family: var(--display); font-size: 34px; line-height: 1.35; }
.reference-mode .scope-chapters { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); border: 0; gap: 14px; }
.reference-mode .scope-chapter, .reference-mode .scope-chapter:nth-child(even) { display: flex; min-height: 360px; flex-direction: column; gap: 28px; padding: 30px; border: 1px solid #cbd7ca; background: #edf3e9; }
.reference-mode .scope-chapter:nth-child(3n + 2) { background: #dbe9d1; }
.reference-mode .scope-chapter:nth-child(3n + 3) { background: #f4ead6; }
.reference-mode .scope-grid { border: 0; gap: 14px; }
.reference-mode .scope-tile, .reference-mode .scope-tile:nth-child(4n + 2), .reference-mode .scope-tile:nth-child(4n + 3) { min-height: 360px; padding: 30px; border: 1px solid #cbd7ca; background: #edf3e9; }
.reference-mode .scope-tile:nth-child(3n + 2) { background: #dbe9d1; }
.reference-mode .scope-tile:nth-child(3n + 3) { background: #f4ead6; }
.reference-mode .scope-ledger { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); border: 0; gap: 14px; }
.reference-mode .scope-row { display: flex; min-height: 300px; flex-direction: column; gap: 22px; padding: 30px; border: 1px solid #cbd7ca; background: #edf3e9; }
.reference-mode .scope-row:nth-child(even) { background: #dbe9d1; }
.reference-mode .scope-row .scope-name { display: block; }
.reference-mode .scope-row .scope-name h3 { margin-top: 17px; }
.reference-mode .scope-row .scope-description { flex: 1; }
.reference-mode .scope-row .service-price { margin-top: auto; text-align: left; }
.reference-mode .scope-row .service-price > span { margin-left: 0; text-align: left; }
.reference-mode .scope-name h3 { margin-top: 17px; font-family: var(--display); font-size: 34px; font-weight: var(--weight); }
.reference-mode .chapter-content { flex: 1; }
.reference-mode .service-number { background: #1a3025; color: #d4f0a4; }
.reference-mode .schedule { background: #214439; }
.reference-mode .investment { background: #d4f0a4; color: #17251f; }
.reference-mode .totals { background: #17251f; }
.reference-mode .total { background: #d4f0a4; }
.reference-mode .closing { background: #17251f; }

@media (max-width: 600px) {
  .reference-mode .hero, .reference-mode .hero-content, .reference-mode.compact .hero, .reference-mode.compact .hero-content { min-height: 700px; }
  .reference-mode .hero:before, .reference-mode .hero-media { inset: 0; width: 100%; height: 100%; }
  .reference-mode .hero-content, .reference-mode.compact .hero-content { align-content: end; padding: 82px 0 28px; }
  .reference-mode .hero h1 { font-size: 53px; }
  .reference-mode .hero-panel { grid-template-columns: 1fr; gap: 14px; }
  .reference-mode .hero-services { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .reference-mode .project-facts div { padding: 17px 12px; }
  .reference-mode .scope-chapters { grid-template-columns: 1fr; }
  .reference-mode .scope-ledger { grid-template-columns: 1fr; }
  .reference-mode .scope-chapter, .reference-mode .scope-chapter:nth-child(even) { min-height: 0; padding: 24px; }
  .reference-mode .objective-copy { font-size: 26px; }
}

@media (max-width: 920px) {
  h1 { font-size: 64px; }
  h1.long-title { font-size: 49px; }
  h2 { font-size: 44px; }
  .hero, .hero-content { min-height: 670px; }
  .hero-content { grid-template-columns: minmax(0, 1fr) minmax(220px, .45fr); gap: 40px; }
  .context-grid { gap: 54px; }
  .briefing-grid { gap: 54px; }
  .scope-chapter { grid-template-columns: 90px minmax(190px, .8fr) minmax(180px, 1fr); gap: 25px; }
  .scope-chapter:nth-child(even) { padding-left: 8%; }
  .compact .scope-row { grid-template-columns: .75fr 1.25fr; }
  .compact .scope-row .scope-description { grid-column: 1 / -1; }
  .investment-heading, .closing-row { align-items: flex-start; flex-direction: column; }
}
@media(max-width:600px) {
  .wrap { width: min(100% - 34px, 1210px); }
  .brandbar-inner { min-height: 58px; }
  .brand { max-width: 54%; font-size: 12px; }
  .brand img { width: 120px; height: 30px; }
  .brandbar nav a:not(:last-child) { display: none; }
  .hero, .hero-content, .compact .hero, .compact .hero-content { min-height: 710px; }
  .hero:before, .hero:after, .hero-media { top: auto; width: 100%; height: 28%; }
  .hero:after { border-top: 1px solid #ffffff25; border-left: 0; }
  .hero-content { grid-template-columns: 1fr; align-content: start; gap: 37px; padding: 84px 0 28px; }
  .hero-client { margin-top: 35px; font-size: 16px; }
  .hero h1 { font-size: 50px; }
  .hero h1.long-title { font-size: 42px; }
  .hero-subject { font-size: 17px; }
  .hero-panel { align-self: auto; width: 100%; padding: 16px 0 0 17px; }
  .hero-services { grid-template-columns: repeat(2, minmax(0, 1fr)); column-gap: 16px; }
  .hero-panel > a { margin-top: 12px; padding-top: 12px; }
  .project-facts { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .project-facts div { padding: 19px 13px; border-bottom: 1px solid #ffffff24; }
  .project-facts div:first-child { border-left: 0; }
  .project-facts dd { font-size: 14px; }
  .section, .compact .section { padding: 71px 0; }
  .section-heading { margin-bottom: 37px; }
  .context-grid { grid-template-columns: 1fr; gap: 33px; }
  .context .section-heading { position: static; }
  .briefing-grid { grid-template-columns: 1fr; gap: 33px; }
  .briefing-grid .section-heading { position: static; }
  .objective-copy { font-size: 22px; }
  .objective-copy.long-copy { font-size: 17px; }
  .scope-chapter, .scope-chapter:nth-child(even) { grid-template-columns: 1fr; gap: 16px; min-height: 0; padding: 28px 0; }
  .scope-name { display: grid; grid-template-columns: 52px 1fr; column-gap: 15px; align-items: start; }
  .scope-name .service-number { grid-row: 1 / span 2; }
  .scope-name .service-type { margin: 0; }
  .scope-name h3 { margin: 3px 0 0; }
  .scope-grid { grid-template-columns: 1fr; }
  .scope-tile { min-height: 0; padding: 25px; }
  .scope-tile .scope-name { display: block; }
  .scope-tile .scope-name h3 { margin-top: 20px; }
  .scope-name h3 { font-size: 27px; }
  .service-price strong { font-size: 27px; }
  .process { grid-template-columns: 1fr; }
  .process li { min-height: 0; }
  .step-number { margin-bottom: 40px; }
  .portfolio { grid-template-columns: 1fr; }
  .investment-heading { gap: 23px; margin-bottom: 36px; }
  .total strong { font-size: 33px; }
  .compact .scope-row { grid-template-columns: 1fr; gap: 20px; }
  .compact .scope-row .service-price { text-align: left; }
  .compact .scope-row .service-price > span { margin-left: 0; text-align: left; }
  .conditions > div { padding: 24px; }
  .contact { width: 100%; }
  .signature { flex-direction: column; }
  .closing { padding-top: 67px; }
}
.reference-clean { background: #f5f4f1; color: #191919; }
.reference-clean .brandbar, .reference-clean .project-strip, .reference-clean .closing { background: #111112; color: #f6f5f2; }
.reference-clean .brand { color: #f6f5f2; }
.reference-clean .hero, .reference-clean.editorial .hero, .reference-clean.contrast .hero, .reference-clean.compact .hero { min-height: 620px; background: #111112; }
.reference-clean .hero:before, .reference-clean.editorial .hero:before, .reference-clean.contrast .hero:before, .reference-clean.compact .hero:before { width: 9px; background: var(--accent); }
.reference-clean .hero:after { display: none; }
.reference-clean .hero-content, .reference-clean.editorial .hero-content, .reference-clean.contrast .hero-content, .reference-clean.compact .hero-content { min-height: 620px; grid-template-columns: minmax(0, 1fr) minmax(220px, .48fr); align-items: end; padding: 84px 0 48px; }
.reference-clean .hero-client, .reference-clean .section-label { color: var(--accent); }
.reference-clean .hero h1, .reference-clean h1, .reference-clean h2 { font-family: Georgia, 'Times New Roman', serif; font-weight: 400; }
.reference-clean h3 { font-family: Arial, Helvetica, sans-serif; font-weight: 700; }
.reference-clean .hero h1 { max-width: 760px; font-size: clamp(54px, 6vw, 82px); }
.reference-clean .hero-subject { max-width: 620px; font-size: 19px; }
.reference-clean .hero-link { border-radius: 4px; background: var(--accent); color: var(--on-accent); }
.reference-clean .hero-link span { background: #111112; color: #fff; }
.reference-clean .hero-panel { border-color: #ffffff40; }
.reference-clean .hero-services li { border-color: #ffffff30; }
.reference-clean .hero-panel > span { color: var(--accent); }
.reference-clean .project-facts { border-color: #ffffff2b; }
.reference-clean .project-facts div { border-color: #ffffff2b; }
.reference-clean .project-facts dt { color: #aebbb3; }
.reference-clean .context, .reference-clean .briefing, .reference-clean .references, .reference-clean .agreements { background: #f5f4f1; }
.reference-clean .scope { background: #fff; }
.reference-clean .scope-chapters { border-color: #d4ded7; }
.reference-clean .scope-chapter, .reference-clean .scope-chapter:nth-child(even) { min-height: 0; grid-template-columns: 92px minmax(190px, .65fr) minmax(220px, 1.35fr); padding: 38px 0; border-color: #d4ded7; background: transparent; }
.reference-clean .scope-name h3 { margin-top: 12px; font-size: 29px; }
.reference-clean .service-number { background: #191919; color: var(--accent); }
.reference-clean .deliverables li { border-color: #e5ebe6; }
.reference-clean .schedule, .reference-clean.editorial .schedule, .reference-clean.contrast .schedule, .reference-clean.compact .schedule { background: #191919; color: #fff; }
.reference-clean .schedule .section-label { color: var(--accent); }
.reference-clean .investment, .reference-clean.editorial .investment, .reference-clean.contrast .investment, .reference-clean.compact .investment { background: #e9e6df; color: #191919; }
.reference-clean .investment .section-label { color: #8e473a; opacity: 1; }
.reference-clean .totals { gap: 12px; background: transparent; }
.reference-clean .total, .reference-clean.editorial .total, .reference-clean.contrast .total, .reference-clean.compact .total { border: 1px solid #d4d0c9; border-top: 3px solid var(--accent); background: #f5f4f1; color: #191919; }
.reference-clean .total strong { font-size: 34px; }
.reference-clean .price-detail { border-color: #b9c9be; }
.reference-clean .agreements .conditions { border-color: #d4ded7; }
.reference-clean .closing { padding-top: 72px; }
.reference-clean .closing .section-label { color: var(--accent); }
@media (max-width: 760px) {
  .reference-clean .hero, .reference-clean.editorial .hero, .reference-clean.contrast .hero, .reference-clean.compact .hero { min-height: 0; }
  .reference-clean .hero-content, .reference-clean.editorial .hero-content, .reference-clean.contrast .hero-content, .reference-clean.compact .hero-content { min-height: 0; grid-template-columns: 1fr; gap: 38px; padding: 76px 0 34px; }
  .reference-clean .hero h1 { font-size: 48px; }
  .reference-clean .hero-panel { padding-left: 0; border-left: 0; }
  .reference-clean .scope-chapter, .reference-clean .scope-chapter:nth-child(even) { grid-template-columns: 54px minmax(0, 1fr); gap: 17px; }
  .reference-clean .scope-chapter .chapter-content { grid-column: 2; }
}
@media (prefers-reduced-motion: reduce) { html { scroll-behavior: auto; } .hero-link { transition: none; } }
@media print {
  @page { size: A4; margin: 12mm; }
  .brandbar { position: static; }
  .brandbar-inner { min-height: 42px; }
  .brandbar nav, .hero-link, .contact, .signature a { display: none; }
  .hero, .compact .hero { min-height: 75mm; }
  .hero-content, .compact .hero-content { min-height: 75mm; padding: 17mm 0; }
  .hero:before, .hero:after, .hero-media { display: none; }
  .hero-panel { padding-left: 13px; }
  .section, .compact .section { padding: 27px 0; }
  .context .section-heading { position: static; }
  .briefing-grid .section-heading { position: static; }
  .scope-chapter, .scope-tile, .scope-row, .process li, .conditions > div { break-inside: avoid; }
}
`;
