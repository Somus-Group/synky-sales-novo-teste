export const zeroProposalStyles = `
*{box-sizing:border-box;letter-spacing:0}
html{scroll-behavior:smooth;scroll-padding-top:24px}
body{margin:0;background:#fff;color:#1d2524;font:16px/1.65 Arial,Helvetica,sans-serif;overflow-wrap:anywhere}
h1,h2,h3,p,figure{margin:0}h1,h2{font-family:var(--display);line-height:1.08;font-weight:var(--weight)}
h1{font-size:64px;max-width:820px;text-wrap:balance}h1.long-title{font-size:46px}
h2{font-size:42px;max-width:720px;text-wrap:balance}h3{font-size:21px;line-height:1.3}
a{color:inherit;text-decoration:none}a:focus-visible,summary:focus-visible{outline:3px solid var(--accent);outline-offset:5px}
p+p{margin-top:12px}img{max-width:100%;display:block}.wrap{width:min(1160px,88%);margin-inline:auto}
.brandbar{min-height:76px;display:flex;align-items:center;justify-content:space-between;gap:24px;padding-block:18px}
.brandbar .brand{max-width:50%;font-size:21px;font-weight:700;line-height:1.25}
.brandbar img{max-height:46px;width:150px;object-fit:contain;object-position:left}
.brandbar nav{display:flex;align-items:center;gap:28px;font-size:13px;color:#4e5b58}
.brandbar nav a:hover{color:var(--accent)}
.hero{position:relative;isolation:isolate;display:flex;align-items:flex-end;min-height:min(650px,calc(100svh - 200px));background:#182324;color:#fff}
.hero-media{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center;z-index:-2}
.hero::before{content:'';position:absolute;inset:0;background:rgba(5,15,18,.42);z-index:-1}
.hero-copy{padding-block:64px 52px;text-shadow:0 2px 18px rgba(0,0,0,.45)}
.hero .eyebrow{font-size:13px;margin-bottom:20px;color:#fff;text-transform:uppercase}
.hero .client{font-size:18px;margin-top:24px;max-width:700px}
.hero-foot{display:flex;align-items:flex-end;justify-content:space-between;gap:24px;margin-top:40px;font-size:13px}
.hero-foot span{max-width:70%}.hero-foot a{display:flex;align-items:center;gap:12px;border-bottom:1px solid #fff;padding-bottom:8px;white-space:nowrap}
.section{padding-block:76px;border-bottom:1px solid #e1e7e4}
.section-label{font-size:12px;font-weight:700;text-transform:uppercase;color:var(--ink);display:block;margin-bottom:18px}
.section-heading{display:flex;align-items:flex-end;justify-content:space-between;gap:24px;margin-bottom:38px}
.section-heading>span{font-size:13px;color:#677571;flex-shrink:0}
.overview{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(200px,.65fr);gap:56px;align-items:start}
.overview h2{margin-bottom:28px}.prose{white-space:pre-wrap;max-width:760px;color:#4b5b56;line-height:1.85}
.facts{margin:0;border-top:3px solid var(--accent)}
.facts>div{padding:18px 0;border-bottom:1px solid #dde4e0}
.facts dt{color:#65746e;font-size:13px}.facts dd{font-size:25px;line-height:1.3;margin:7px 0 0;font-weight:600}
.scope{background:#f6f8f7}.services{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px}
.service{padding:28px;background:#fff;border:1px solid #dce4df;border-radius:6px;break-inside:avoid;min-width:0}
.service-top{display:flex;justify-content:space-between;align-items:center;gap:16px;margin-bottom:24px}
.service-icon{display:grid;place-items:center;width:44px;height:44px;border:1px solid #d9e3dd;border-radius:6px;color:var(--ink);background:#f8faf9}
.service-top small{font-size:12px;color:#728079}.service h3{margin-bottom:22px}
.deliverables{margin:0;padding:0;list-style:none}.deliverables li{display:flex;gap:10px;align-items:flex-start;margin-top:12px;font-size:15px;color:#50605a;white-space:pre-wrap}
.deliverables svg{flex:0 0 auto;margin-top:4px;color:var(--ink)}.service-bottom{display:flex;gap:12px;justify-content:space-between;font-size:12px;padding-top:22px;margin-top:22px;border-top:1px solid #e5eae7;color:#63726b}
.process{padding-left:0;list-style:none;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:30px;margin:0}
.process li{border-top:2px solid var(--accent);padding-top:22px;min-width:0;break-inside:avoid}
.process .step-number{font-size:38px;line-height:1;color:var(--ink);margin-bottom:20px;font-family:var(--display)}
.process p{color:#50605a;white-space:pre-wrap}.process.single{grid-template-columns:1fr;max-width:820px}
.portfolio{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:24px}.portfolio figure{min-width:0;break-inside:avoid}
.portfolio img{width:100%;aspect-ratio:4/3;object-fit:contain;background:#f1f4f2}.portfolio figcaption{font-size:14px;padding-top:12px;color:#5a6961}
.investment{background:#142923;color:#fff}.investment .section-label{color:#b9dcbe}.investment h2{color:#fff}
.totals{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr));gap:28px;margin-bottom:30px}
.total{padding-block:22px;border-top:1px solid #527064}.total span{display:block;font-size:14px;color:#c2d6cb}.total strong{font-size:36px;font-weight:500;line-height:1.2;display:block;margin-top:12px}.total small{color:#c2d6cb;font-size:13px}
.investment-note{max-width:820px;font-size:14px;color:#d2e4d9;margin:16px 0}.price-detail{border-top:1px solid #527064;padding-top:20px;margin-top:32px}
.price-detail summary{cursor:pointer;font-size:14px;padding:6px 0}.table-wrap{overflow:auto;margin-top:20px}
table{width:100%;border-collapse:collapse;font-size:14px}th,td{padding:16px 10px;border-bottom:1px solid #456056;text-align:left}th{font-weight:500;color:#bfd3c7;font-size:12px}td:last-child,th:last-child{text-align:right}td:first-child{min-width:140px}
.conditions{display:grid;grid-template-columns:1fr 1fr;gap:36px}.conditions h3{margin-bottom:16px}.conditions p{color:#50605a;white-space:pre-wrap}
.closing{padding-block:64px}.closing-row{display:flex;justify-content:space-between;align-items:center;gap:32px}.closing h2{font-size:46px;max-width:650px}.closing p{margin-top:18px;color:#5c6b64}
.contact{display:flex;flex-wrap:wrap;gap:12px;margin-top:30px}.contact a{display:inline-flex;align-items:center;gap:12px;padding:14px 20px;background:var(--accent);color:var(--on-accent);border-radius:4px;font-size:14px;font-weight:600;min-height:48px}
.contact a.secondary{background:#edf2ef;color:#243e30}.signature{border-top:1px solid #dce4df;margin-top:48px;padding-top:22px;display:flex;justify-content:space-between;gap:20px;font-size:12px;color:#6a786f}
.draft-note{color:#6a786f;padding-block:18px}
.contrast .hero{min-height:min(620px,calc(100svh - 150px))}.contrast .hero-copy{padding-top:90px}.contrast h1{text-transform:uppercase;font-family:Arial,sans-serif;font-weight:750;font-size:62px;max-width:780px}.contrast h1.long-title{font-size:46px}
.contrast .scope{background:#fff}.contrast .services{grid-template-columns:repeat(3,minmax(0,1fr));gap:0;border-top:1px solid #dce4df}.contrast .service{border:0;border-bottom:1px solid #dce4df;border-radius:0;padding:30px 24px}.contrast .service:nth-child(3n+2){border-inline:1px solid #dce4df}.contrast .service-icon{background:#f2f4f3;color:#273e35}.contrast .service h3{font-size:24px}.contrast .investment{background:#22242b}.contrast .total{border-top-color:#d3f37b}.contrast .investment .section-label{color:#d3f37b}
.compact .hero{min-height:min(500px,calc(100svh - 150px))}.compact .hero h1{font-size:48px;max-width:780px}.compact .hero h1.long-title{font-size:38px}.compact .hero-copy{padding-block:52px 40px}.compact .section{padding-block:52px}.compact .services{grid-template-columns:1fr}.compact .service{display:grid;grid-template-columns:44px minmax(0,.8fr) minmax(0,1.2fr);gap:24px;border-width:0 0 1px;border-radius:0;padding-inline:0;background:transparent}.compact .service-top{display:block;margin:0}.compact .service-top small{display:block;margin-top:12px}.compact .service-bottom{grid-column:2/4}.compact .scope{background:#fff}.compact .deliverables li:first-child{margin-top:0}.compact .investment{background:#eaf3ef;color:#1b3429}.compact .investment :is(h2,.total strong){color:#1b3429}.compact .investment :is(.section-label,.total span,.total small,.investment-note,th){color:#496456}.compact .total{border-top-color:#9bbbab}.compact :is(td,th,.price-detail){border-color:#c4d6cb}
.contrast .hero{min-height:min(620px,calc(100svh - 200px))}.compact .hero{min-height:min(500px,calc(100svh - 200px))}
@media(max-width:900px){h1{font-size:48px}.contrast h1{font-size:48px}.contrast .services{grid-template-columns:1fr 1fr}.contrast .service:nth-child(n){border-inline:0}.contrast .service:nth-child(2n){border-left:1px solid #dce4df}.overview{gap:30px}.hero-copy{padding-block:48px 36px}h2{font-size:34px}.total strong{font-size:30px}.process{gap:22px}.wrap{width:88%}}
@media(max-width:600px){.brandbar{min-height:64px;padding-block:14px}.brandbar .brand{max-width:65%;font-size:18px}.brandbar nav{gap:12px;font-size:12px}.brandbar nav a:not(:last-child){display:none}.brandbar img{width:124px;height:36px}h1,.contrast h1,.compact .hero h1{font-size:36px}h1.long-title,.contrast h1.long-title,.compact .hero h1.long-title{font-size:30px}.hero,.contrast .hero,.compact .hero{min-height:min(570px,calc(100svh - 130px))}.hero-copy,.contrast .hero-copy,.compact .hero-copy{padding-block:46px 32px}.hero .eyebrow{font-size:12px}.hero .client{font-size:16px}.hero-foot{margin-top:30px;font-size:12px}.hero-foot span{max-width:55%}.section,.compact .section{padding-block:42px}h2,.closing h2{font-size:32px}.section-heading{margin-bottom:28px;align-items:flex-start}.section-heading>span{display:none}.overview{grid-template-columns:1fr;gap:30px}.facts{display:grid;grid-template-columns:1fr 1fr;gap:0 20px}.facts dd{font-size:22px}.services,.contrast .services{grid-template-columns:1fr}.service,.contrast .service{padding:24px}.contrast .service:nth-child(n){border-inline:0;padding-inline:0}.compact .service{grid-template-columns:44px minmax(0,1fr);gap:18px}.compact .service h3{margin-bottom:0}.compact .service .deliverables,.compact .service-bottom{grid-column:2}.process,.portfolio,.conditions{grid-template-columns:1fr}.process{gap:24px}.process li{display:grid;grid-template-columns:40px minmax(0,1fr);gap:20px}.process .step-number{font-size:28px;margin:0}.total strong{font-size:30px}.totals{gap:14px}.closing-row{display:block}.signature{flex-direction:column;gap:8px}.contact a{width:100%;justify-content:center}.hero-media{object-position:65% center}}
@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}}
@media print{@page{size:A4;margin:12mm}body{font-size:10pt}.wrap{width:100%}.brandbar{min-height:45px;padding-block:8px}.brandbar nav,.hero-foot a,.contact{display:none}.hero,.contrast .hero,.compact .hero{min-height:100mm;break-inside:avoid}.hero-copy,.contrast .hero-copy,.compact .hero-copy{width:90%;padding:24px 0}.hero h1,.contrast h1,.compact .hero h1{font-size:32pt}.hero h1.long-title,.contrast h1.long-title,.compact .hero h1.long-title{font-size:26pt}.section,.compact .section{padding-block:26px}.section-heading{margin-bottom:22px}h2,.closing h2{font-size:24pt}h3{font-size:14pt}.overview{gap:24px}.facts dd{font-size:19pt}.services,.contrast .services{grid-template-columns:1fr 1fr}.service{padding:18px}.deliverables li{font-size:10pt}.process{grid-template-columns:1fr;gap:16px}.process li{padding-top:14px}.process .step-number{font-size:20pt;margin-bottom:8px}.total strong{font-size:22pt}.investment{padding-inline:20px}.price-detail>summary{display:none}.price-detail::details-content{display:block}.table-wrap{overflow:visible}table{font-size:10pt}th,td{padding:9px 6px}thead{display:table-header-group}tr{break-inside:avoid}.conditions{gap:24px}.portfolio{grid-template-columns:1fr 1fr}.closing{padding-block:28px}.signature{margin-top:24px}h2,h3{break-after:avoid}*{print-color-adjust:exact;-webkit-print-color-adjust:exact}}
`;
