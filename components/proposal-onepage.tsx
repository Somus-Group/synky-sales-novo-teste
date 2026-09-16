'use client';

import { Fragment, type CSSProperties, type ReactNode } from 'react';
import { CollectionProposal } from './proposal-collection';
import { getCollectionDesign } from '@/lib/proposal-collection';
import { ArrowDown, Check, Loader2 } from 'lucide-react';
import { resolveProposalTemplate, type ArtworkProposal, type ProposalTemplateId, type ProposalSlideContent } from '@/components/proposal-artwork';
import { getProposalTemplate } from '@/lib/proposal-templates';

type OnePageProps = {
  proposal: ArtworkProposal;
  accepted?: boolean;
  accepting?: boolean;
  onAccept?: () => void;
  preview?: boolean;
  actions?: ReactNode;
  idPrefix?: string;
  editable?: boolean;
  selectedSlide?: number;
  onSelectSlide?: (index: number) => void;
  onEditSlide?: (index: number, field: 'eyebrow' | 'title' | 'body' | 'bullets', value: string | string[]) => void;
  onEditSubtitle?: (value: string) => void;
};

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

export function ProposalOnePage({ proposal, accepted = false, accepting = false, onAccept, preview = false, actions, idPrefix = 'proposal', editable = false, selectedSlide = -1, onSelectSlide, onEditSlide, onEditSubtitle }: OnePageProps) {
  const theme = resolveProposalTemplate(proposal.template);
  const slides = proposal.content?.slides?.length ? proposal.content.slides : createFallbackProposalSections(proposal);
  const design = getCollectionDesign(proposal.template);
  if (design) return <CollectionProposal {...{ design, proposal, slides, accepted, accepting, onAccept, actions, idPrefix }} />;
  const brand = proposal.content?.brand_name || 'SOMUS';
  const logoUrl = proposal.content?.logo_url;
  const primaryColor = proposal.content?.primary_color;
  const secondaryColor = proposal.content?.secondary_color;
  const company = proposal.content?.company;
  const portfolioImages = proposal.content?.portfolio_images || [];
  const visualImages = proposalVisualImages(proposal);
  const heroImageUrl = proposal.content?.hero_image_url || visualImages[0]?.url;
  const sectionImages = visualImages.filter((image) => image.url !== heroImageUrl);
  const sections = slides.slice(1, -1);
  const closing = slides.at(-1)!;
  const investmentIndex = sections.findIndex((item) => item.type === 'investment');
  const height = preview ? 'min-h-[560px]' : 'min-h-[88svh]';
  const heroHeight = preview ? 'min-h-[560px]' : 'min-h-[calc(100svh-4rem)]';
  const closingHeight = preview ? 'min-h-[560px]' : 'min-h-[92svh]';
  const palette = getPalette(theme);

  return <article className={`relative [overflow-wrap:anywhere] [&_p]:whitespace-pre-line ${palette.page} ${preview ? 'text-[90%]' : ''}`}>
    <header className={`sticky top-0 z-40 flex h-16 items-center gap-5 border-b px-[5vw] backdrop-blur-xl ${palette.header}`}>
      <Brand name={brand} theme={theme} logoUrl={logoUrl} accentColor={secondaryColor} />
      <nav className="ml-auto hidden min-w-0 items-center gap-5 overflow-x-auto lg:flex">{sections.slice(0, 5).map((item, index) => <a key={`${item.type}-${index}`} href={`#${idPrefix}-section-${index + 1}`} className={`shrink-0 whitespace-nowrap text-[10px] font-medium uppercase tracking-[0.13em] transition-opacity hover:opacity-100 ${palette.muted}`}>{shortLabel(item, index)}</a>)}</nav>
      <span className={`hidden h-4 w-px shrink-0 lg:block ${palette.divider}`} />
      <span className={`hidden shrink-0 whitespace-nowrap text-[10px] lg:block ${palette.muted}`}>{proposal.code}</span>
      {actions}
    </header>

    <section id={`${idPrefix}-section-0`} onClick={() => onSelectSlide?.(0)} style={customSurface(slides[0].backgroundColor || primaryColor)} className={`relative flex ${heroHeight} flex-col justify-end overflow-hidden px-[6vw] pb-[max(6rem,7vw)] pt-[12vw] ${palette.hero} ${editable && selectedSlide === 0 ? 'ring-4 ring-[#5b7fff] ring-inset' : ''}`}>
      {!slides[0].backgroundColor && <HeroBackground theme={theme} imageUrl={heroImageUrl} brandColor={primaryColor} />}
      <div style={scaleStyle(slides[0])} className="relative z-10">
        <EditableText editable={editable} value={slides[0].eyebrow || 'Proposta comercial'} onChange={(value) => onEditSlide?.(0, 'eyebrow', value)} style={validColor(secondaryColor) ? { color: secondaryColor } : undefined} className={`text-[10px] font-semibold uppercase tracking-[0.32em] ${palette.heroAccent}`} suffix={` · ${proposal.code}`} />
        <EditableText as="h1" editable={editable} value={slides[0].title || proposal.project} onChange={(value) => onEditSlide?.(0, 'title', value)} className={`mt-6 max-w-[1100px] text-[clamp(48px,8.4vw,132px)] leading-[1.02] tracking-[-0.075em] ${theme === 'editorial' ? 'font-serif font-normal' : 'font-semibold'}`} />
        {slides[0].body && <EditableText editable={editable} value={slides[0].body} onChange={(value) => onEditSlide?.(0, 'body', value)} className="mt-7 max-w-3xl text-base leading-relaxed opacity-80" />}
        <EditableBullets editable={editable} theme={theme} bullets={slides[0].bullets} invert onChange={(bullets) => onEditSlide?.(0, 'bullets', bullets)} />
        <div className={`mt-10 grid gap-6 border-t pt-6 md:grid-cols-[1fr_auto] ${palette.heroBorder}`}><EditableText editable={editable} value={proposal.content?.subtitle || 'Uma proposta criada para transformar clareza em movimento.'} onChange={(value) => onEditSubtitle?.(value)} className="max-w-xl text-[clamp(14px,1.4vw,20px)] leading-relaxed opacity-55" /><div className="md:text-right"><span className="block text-[9px] uppercase tracking-[0.22em] opacity-40">Preparada para</span><strong className="mt-2 block text-[clamp(16px,1.7vw,24px)] font-medium">{proposal.client}</strong></div></div>
      </div>
      <a href={`#${idPrefix}-section-1`} className="absolute bottom-7 right-7 z-20 grid size-11 place-items-center rounded-full border border-current/20 bg-white/10 backdrop-blur transition-transform hover:translate-y-1" aria-label="Continuar lendo"><ArrowDown className="size-4" /></a>
    </section>

    {sections.map((section, index) => <Fragment key={`${section.type}-${index}`}>{section.type === 'investment' ? <InvestmentSection id={`${idPrefix}-section-${index + 1}`} theme={theme} section={section} proposal={proposal} height={height} accentColor={secondaryColor} editable={editable} selected={selectedSlide === index + 1} onSelect={() => onSelectSlide?.(index + 1)} onEdit={(field, value) => onEditSlide?.(index + 1, field, value)} /> : <NarrativeSection id={`${idPrefix}-section-${index + 1}`} theme={theme} section={section} index={index} height={height} accentColor={secondaryColor} visualImage={sectionImages[index]} editable={editable} selected={selectedSlide === index + 1} onSelect={() => onSelectSlide?.(index + 1)} onEdit={(field, value) => onEditSlide?.(index + 1, field, value)} />}{index === Math.min(1, sections.length - 1) && portfolioImages.length > 0 && <PortfolioSection images={portfolioImages} brand={brand} height={height} primaryColor={primaryColor} secondaryColor={secondaryColor} />}</Fragment>)}

    <section id={`${idPrefix}-section-${sections.length + 1}`} onClick={() => onSelectSlide?.(slides.length - 1)} style={customSurface(closing.backgroundColor || primaryColor)} className={`relative flex ${closingHeight} items-center justify-center overflow-hidden px-[7vw] py-[12vw] text-center ${palette.closing} ${editable && selectedSlide === slides.length - 1 ? 'ring-4 ring-[#5b7fff] ring-inset' : ''}`}>
      {!closing.backgroundColor && !validColor(primaryColor) && <ClosingBackground theme={theme} />}
      <div style={scaleStyle(closing)} className="relative z-10 max-w-[1050px]"><EditableText editable={editable} value={closing.eyebrow || 'Próximo passo'} onChange={(value) => onEditSlide?.(slides.length - 1, 'eyebrow', value)} style={validColor(secondaryColor) ? { color: secondaryColor } : undefined} className={`text-[10px] font-semibold uppercase tracking-[0.32em] ${palette.heroAccent}`} /><EditableText as="h2" editable={editable} value={closing.title || 'Vamos construir algo relevante juntos?'} onChange={(value) => onEditSlide?.(slides.length - 1, 'title', value)} className={`mt-7 text-[clamp(46px,8vw,122px)] leading-[1.02] tracking-[-0.075em] ${theme === 'editorial' ? 'font-serif font-normal' : 'font-semibold'}`} /><EditableText editable={editable} value={closing.body || `${brand} está pronta para começar.`} onChange={(value) => onEditSlide?.(slides.length - 1, 'body', value)} className="mx-auto mt-8 max-w-xl text-[clamp(14px,1.25vw,19px)] leading-relaxed opacity-48" /><EditableBullets editable={editable} theme={theme} bullets={closing.bullets} invert onChange={(bullets) => onEditSlide?.(slides.length - 1, 'bullets', bullets)} />{accepted ? <div style={customSurface(secondaryColor)} className={`mx-auto mt-10 flex w-fit items-center gap-2 rounded-full px-7 py-4 text-sm font-semibold ${palette.button}`}><Check className="size-4" />Proposta aceita</div> : <button style={customSurface(secondaryColor)} disabled={accepting} onClick={onAccept} className={`mt-10 inline-flex items-center gap-2 rounded-full px-8 py-4 text-sm font-semibold shadow-2xl transition-transform hover:scale-[1.025] disabled:opacity-60 ${palette.button}`}>{accepting ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}{onAccept ? 'Aceitar proposta' : 'Pronta para apresentar'}</button>}</div>
    </section>

    <footer className={`grid gap-5 border-t px-[6vw] py-8 text-[10px] uppercase tracking-[0.17em] md:grid-cols-[auto_1fr_auto] md:items-center ${palette.footer}`}><Brand name={brand} theme={theme} logoUrl={logoUrl} accentColor={secondaryColor} /><span className={`md:text-center ${palette.muted}`}>{[company?.website, company?.email, company?.phone].filter(Boolean).join(' · ') || `Proposta comercial · ${proposal.code}`}</span><span className={`md:text-right ${palette.muted}`}>{company?.address || (investmentIndex >= 0 ? 'Escopo, investimento e próximos passos' : 'Uma relação construída com clareza')}</span></footer>
  </article>;
}

function PortfolioSection({ images, brand, height, primaryColor, secondaryColor }: { images: Array<{ url: string; name: string; caption: string }>; brand: string; height: string; primaryColor?: string; secondaryColor?: string }) {
  const visible = images.slice(0, 6);
  return <section style={customSurface(primaryColor)} className={`relative flex ${height} flex-col justify-center overflow-hidden bg-[#172A25] px-[6vw] py-[9vw] text-white`}><div className="mb-9 flex flex-col gap-5 border-b border-current/15 pb-6 sm:flex-row sm:items-end sm:justify-between"><div><p style={validColor(secondaryColor) ? { color: secondaryColor } : undefined} className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#E7AA69]">Portfólio selecionado</p><h2 className="mt-4 max-w-3xl text-[clamp(42px,6.5vw,96px)] font-semibold leading-[1.04] tracking-[-0.07em]">Experiência que se torna evidência.</h2></div><p className="max-w-xs text-[11px] leading-5 opacity-50">Uma seleção de projetos e imagens da {brand} conectada a esta proposta.</p></div><div className={`grid gap-3 ${visible.length > 3 ? 'sm:grid-cols-2 lg:grid-cols-3' : 'sm:grid-cols-2 lg:grid-cols-3'}`}>{visible.map((image, index) => <figure key={`${image.url}-${index}`} className={`group relative overflow-hidden rounded-[24px] bg-white/8 ${index === 0 && visible.length > 3 ? 'sm:col-span-2 lg:col-span-1' : ''}`}><img src={image.url} alt={image.caption || image.name} className="aspect-[4/3] h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.025]" /><figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-5 pb-4 pt-12"><span className="text-[9px] uppercase tracking-[0.16em] text-white/55">Projeto {String(index + 1).padStart(2, '0')}</span><strong className="mt-1 block text-[12px] font-medium text-white">{image.caption || image.name.replace(/\.[^.]+$/, '')}</strong></figcaption></figure>)}</div></section>;
}

type ProposalVisualImage = { url: string; name: string; caption: string };

function NoirImagePanel({ image, index, accentColor, light }: { image?: ProposalVisualImage; index: number; accentColor?: string; light: boolean }) {
  const accentStyle = validColor(accentColor) ? { backgroundColor: accentColor } : undefined;
  return <div className="relative z-10 min-h-[320px] overflow-hidden rounded-[34px] border border-current/10 bg-current/[0.04] shadow-2xl shadow-black/10">
    {image ? <img src={image.url} alt={image.caption || image.name} className={`h-full min-h-[320px] w-full object-cover ${light ? 'grayscale-[18%] contrast-110' : 'grayscale contrast-125'}`} /> : <GridLines dark={!light} />}
    <div className={`absolute inset-0 ${light ? 'bg-gradient-to-tr from-[#F0EEE8]/55 via-transparent to-black/10' : 'bg-gradient-to-tr from-black/70 via-black/15 to-transparent'}`} />
    <span className={`absolute left-[8%] top-[8%] text-[clamp(72px,13vw,210px)] font-black leading-[0.75] tracking-[-0.1em] ${light ? 'text-black/[0.08]' : 'text-white/[0.09]'}`}>0{index + 1}</span>
    <span style={accentStyle} className="absolute bottom-[8%] left-[8%] h-2 w-24 bg-[#D7FF38]" />
    <span className={`absolute bottom-[8%] right-[8%] max-w-[48%] text-right text-[9px] uppercase tracking-[0.18em] ${light ? 'text-black/40' : 'text-white/42'}`}>{image?.caption || image?.name || 'Imagem da proposta'}</span>
  </div>;
}

function NarrativeSection({ id, theme, section, index, height, accentColor, visualImage, editable = false, selected = false, onSelect, onEdit }: { id: string; theme: ProposalTemplateId; section: ProposalSlideContent; index: number; height: string; accentColor?: string; visualImage?: ProposalVisualImage; editable?: boolean; selected?: boolean; onSelect?: () => void; onEdit?: (field: 'eyebrow' | 'title' | 'body' | 'bullets', value: string | string[]) => void }) {
  const palette = getPalette(theme);
  const even = index % 2 === 0;
  const style = customSurface(section.backgroundColor);
  const selectedClass = editable && selected ? 'ring-4 ring-[#5b7fff] ring-inset' : '';
  if (theme === 'editorial' && index === 0 && !section.backgroundColor) return <section id={id} onClick={onSelect} className={`grid ${height} lg:grid-cols-[0.78fr_1.22fr] ${selectedClass}`}><div className="relative min-h-[420px] overflow-hidden"><div className="absolute inset-0 scale-105 bg-[url('/proposal/editorial-cover.png')] bg-cover bg-[72%_center]" /><div style={validColor(accentColor) ? { backgroundColor: accentColor } : undefined} className="absolute inset-0 bg-[#7A3F25]/20 opacity-25 mix-blend-multiply" /><span className="absolute bottom-[7%] left-[9%] font-serif text-[clamp(72px,11vw,170px)] italic text-white/82">01</span></div><div className={`flex flex-col justify-center px-[8vw] py-[12vw] ${palette.section}`}><div style={scaleStyle(section)}><EditableText editable={editable} value={section.eyebrow} onChange={(value) => onEdit?.('eyebrow', value)} style={validColor(accentColor) ? { color: accentColor } : undefined} className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#B86538]" /><EditableText as="h2" editable={editable} value={section.title} onChange={(value) => onEdit?.('title', value)} className="mt-7 max-w-[820px] font-serif text-[clamp(48px,6.6vw,100px)] font-normal leading-[1.04] tracking-[-0.065em]" /><EditableText editable={editable} value={section.body} onChange={(value) => onEdit?.('body', value)} className={`mt-8 max-w-2xl text-[clamp(15px,1.35vw,20px)] leading-[1.75] ${palette.body}`} /><EditableBullets editable={editable} theme={theme} bullets={section.bullets} onChange={(bullets) => onEdit?.('bullets', bullets)} /></div></div></section>;

  if (theme === 'noir') return <section id={id} onClick={onSelect} style={style} className={`relative grid ${height} overflow-hidden px-[6vw] py-[10vw] lg:grid-cols-[0.78fr_1.22fr] lg:gap-[7vw] ${even ? 'bg-[#F0EEE8] text-[#0B0B0C]' : 'bg-[#0B0B0C] text-white'} ${selectedClass}`}><GridLines dark={!even} /><NoirImagePanel image={visualImage} index={index} accentColor={accentColor} light={even} /><div style={scaleStyle(section)} className="relative z-10 flex flex-col justify-center"><EditableText editable={editable} value={section.eyebrow} onChange={(value) => onEdit?.('eyebrow', value)} style={validColor(accentColor) ? { color: accentColor } : undefined} className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#97B819]" /><EditableText as="h2" editable={editable} value={section.title} onChange={(value) => onEdit?.('title', value)} className="mt-8 text-[clamp(48px,7vw,108px)] font-black uppercase leading-[1.02] tracking-[-0.078em]" /><EditableText editable={editable} value={section.body} onChange={(value) => onEdit?.('body', value)} className={`mt-9 max-w-2xl text-[clamp(15px,1.35vw,20px)] leading-[1.75] ${even ? 'text-black/52' : 'text-white/48'}`} /><EditableBullets editable={editable} theme={theme} bullets={section.bullets} invert={!even} onChange={(bullets) => onEdit?.('bullets', bullets)} /></div><span style={validColor(accentColor) ? { backgroundColor: accentColor } : undefined} className="absolute right-0 top-0 h-full w-3 bg-[#D7FF38]" /></section>;

  if (theme === 'prisma') return <section id={id} onClick={onSelect} style={style} className={`relative ${height} overflow-hidden px-[6vw] py-[10vw] ${even ? 'bg-[#F5F2EB] text-[#17171B]' : 'bg-[#3434D8] text-white'} ${selectedClass}`}><span style={validColor(accentColor) && even ? { color: accentColor } : undefined} className={`absolute right-[2vw] top-[2vw] text-[clamp(120px,24vw,360px)] font-semibold leading-none tracking-[-0.11em] opacity-[0.055] ${even ? 'text-[#3434D8]' : 'text-white'}`}>0{index + 1}</span><div style={scaleStyle(section)} className="relative z-10 grid lg:grid-cols-[1.1fr_0.9fr] lg:gap-[9vw]"><div><EditableText editable={editable} value={section.eyebrow} onChange={(value) => onEdit?.('eyebrow', value)} style={validColor(accentColor) ? { color: accentColor } : undefined} className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#5B46E8]" /><EditableText as="h2" editable={editable} value={section.title} onChange={(value) => onEdit?.('title', value)} className="mt-7 text-[clamp(48px,7vw,106px)] font-semibold leading-[1.04] tracking-[-0.075em]" /><EditableText editable={editable} value={section.body} onChange={(value) => onEdit?.('body', value)} className={`mt-8 max-w-2xl text-[clamp(15px,1.35vw,20px)] leading-[1.7] ${even ? 'text-black/52' : 'text-white/52'}`} /></div><EditablePrismaCards editable={editable} bullets={section.bullets} onChange={(bullets) => onEdit?.('bullets', bullets)} /></div></section>;

  return <section id={id} onClick={onSelect} style={style} className={`relative ${height} px-[6vw] py-[10vw] ${even ? palette.section : palette.sectionAlt} ${selectedClass}`}><div style={scaleStyle(section)} className="grid lg:grid-cols-[0.75fr_1.25fr] lg:gap-[9vw]"><div><EditableText editable={editable} value={section.eyebrow} onChange={(value) => onEdit?.('eyebrow', value)} style={validColor(accentColor) ? { color: accentColor } : undefined} className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#B86538]" /><span style={validColor(accentColor) ? { color: accentColor } : undefined} className="mt-10 block font-serif text-[clamp(78px,13vw,200px)] italic leading-none text-[#B86538]/20 opacity-20">0{index + 1}</span></div><div className="flex flex-col justify-center"><EditableText as="h2" editable={editable} value={section.title} onChange={(value) => onEdit?.('title', value)} className="font-serif text-[clamp(48px,6.7vw,102px)] font-normal leading-[1.04] tracking-[-0.065em]" /><EditableText editable={editable} value={section.body} onChange={(value) => onEdit?.('body', value)} className={`mt-8 max-w-2xl text-[clamp(15px,1.35vw,20px)] leading-[1.75] ${palette.body}`} /><EditableBullets editable={editable} theme={theme} bullets={section.bullets} onChange={(bullets) => onEdit?.('bullets', bullets)} /></div></div></section>;
}

function InvestmentSection({ id, theme, section, proposal, height, accentColor, editable = false, selected = false, onSelect, onEdit }: { id: string; theme: ProposalTemplateId; section: ProposalSlideContent; proposal: ArtworkProposal; height: string; accentColor?: string; editable?: boolean; selected?: boolean; onSelect?: () => void; onEdit?: (field: 'eyebrow' | 'title' | 'body' | 'bullets', value: string | string[]) => void }) {
  const value = proposal.value ?? ((proposal.valueCents ?? 0) / 100);
  const colors = theme === 'editorial' ? 'bg-[#B86538] text-[#FFF8EE]' : theme === 'noir' ? 'bg-[#D7FF38] text-black' : 'bg-[#FF5D45] text-[#17171B]';
  return <section id={id} onClick={onSelect} style={customSurface(section.backgroundColor || accentColor)} className={`relative flex ${height} items-center overflow-hidden px-[6vw] py-[11vw] ${colors} ${editable && selected ? 'ring-4 ring-[#5b7fff] ring-inset' : ''}`}>{!section.backgroundColor && !validColor(accentColor) && theme === 'prisma' && <><i className="absolute -right-[14vw] -top-[20vw] size-[50vw] rounded-full bg-[#E9FF70]" /><i className="absolute -bottom-[27vw] left-[25vw] size-[48vw] rounded-full bg-[#3434D8]" /></>}{!section.backgroundColor && theme === 'noir' && <GridLines />}<div style={scaleStyle(section)} className="relative z-10 grid w-full gap-14 lg:grid-cols-[0.78fr_1.22fr] lg:items-end"><div><EditableText editable={editable} value={section.eyebrow || 'Investimento'} onChange={(value) => onEdit?.('eyebrow', value)} className="text-[10px] font-semibold uppercase tracking-[0.3em] opacity-65" /><EditableText as="h2" editable={editable} value={section.title || 'Investimento'} onChange={(value) => onEdit?.('title', value)} className={`mt-7 text-[clamp(46px,6.4vw,98px)] leading-[1.04] tracking-[-0.07em] ${theme === 'editorial' ? 'font-serif font-normal' : 'font-semibold uppercase'}`} /><EditableText editable={editable} value={section.body} onChange={(value) => onEdit?.('body', value)} className="mt-8 max-w-xl text-[clamp(14px,1.2vw,18px)] leading-relaxed opacity-58" /></div><div className={`rounded-[32px] p-[7%] ${theme === 'editorial' ? 'bg-[#F3EADF] text-[#2F241E]' : theme === 'noir' ? 'bg-[#0B0B0C] text-white' : 'bg-[#F5F2EB] text-[#17171B]'}`}><span className="text-[10px] uppercase tracking-[0.24em] opacity-45">Investimento total</span><strong className={`mt-5 block text-[clamp(48px,7vw,108px)] leading-none tracking-[-0.075em] ${theme === 'editorial' ? 'font-serif font-normal' : 'font-semibold'}`}>{proposal.content?.budget_pending ? 'A confirmar' : money.format(value)}</strong><EditableInvestmentBullets editable={editable} bullets={section.bullets} onChange={(bullets) => onEdit?.('bullets', bullets)} /><p className="mt-8 text-[10px] opacity-38">Validade da proposta · {formatValidity(proposal.validity)}</p></div></div></section>;
}

function EditableText({ as: Tag = 'p', editable, value, suffix = '', className = '', style, onChange }: { as?: 'p' | 'h1' | 'h2'; editable?: boolean; value: string; suffix?: string; className?: string; style?: CSSProperties; onChange?: (value: string) => void }) {
  return <>
    <Tag
    contentEditable={editable}
    suppressContentEditableWarning
    style={style}
    tabIndex={editable ? 0 : undefined}
    className={`${className} ${editable ? 'cursor-text rounded-md outline-none hover:bg-white/10 focus:bg-white/15 focus:ring-2 focus:ring-[#5b7fff]' : ''}`}
    onBlur={(event) => {
      if (!editable) return;
      const next = event.currentTarget.innerText.replace(/\s+$/g, '');
      if (next !== value) onChange?.(next);
    }}
  >{value}</Tag>
    {suffix && <span style={style} className={className}>{suffix}</span>}
  </>;
}

function EditableBullets({ theme, bullets, invert = false, editable = false, onChange }: { theme: ProposalTemplateId; bullets: string[]; invert?: boolean; editable?: boolean; onChange?: (bullets: string[]) => void }) {
  if (!bullets.length) return null;
  return <div className={`mt-10 grid gap-3 ${bullets.length > 2 ? 'sm:grid-cols-2' : ''}`}>{bullets.map((bullet, index) => <div key={`${index}-${bullet}`} className={`flex items-center gap-4 border-t py-4 text-[13px] font-medium ${invert ? 'border-white/18' : 'border-current/15'}`}><span className={`${theme === 'editorial' ? 'font-serif italic text-[#B86538]' : theme === 'noir' ? 'grid size-7 place-items-center bg-[#D7FF38] text-[10px] font-black text-black' : 'grid size-7 place-items-center rounded-full bg-[#E9FF70] text-[10px] font-semibold text-black'}`}>0{index + 1}</span><span
    contentEditable={editable}
    suppressContentEditableWarning
    tabIndex={editable ? 0 : undefined}
    className={editable ? 'min-w-0 flex-1 cursor-text rounded-md outline-none hover:bg-white/10 focus:bg-white/15 focus:ring-2 focus:ring-[#5b7fff]' : ''}
    onBlur={(event) => {
      if (!editable) return;
      const next = [...bullets];
      next[index] = event.currentTarget.innerText.replace(/\s+$/g, '');
      onChange?.(next);
    }}
  >{bullet}</span></div>)}</div>;
}

function EditablePrismaCards({ bullets, editable, onChange }: { bullets: string[]; editable?: boolean; onChange?: (bullets: string[]) => void }) {
  if (!bullets.length) return null;
  const colors = ['bg-[#E9FF70] text-black', 'bg-[#FF5D45] text-black', 'bg-[#8E5BFF] text-white', 'bg-[#17171B] text-white'];
  return <div className="mt-12 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:mt-0 lg:grid-cols-1 xl:grid-cols-2">{bullets.map((bullet, index) => <div key={`${index}-${bullet}`} className={`flex min-h-48 flex-col gap-6 justify-between rounded-[28px] p-[12%] ${colors[index % colors.length]}`}><span className="text-[10px] opacity-45">0{index + 1}</span><strong
    contentEditable={editable}
    suppressContentEditableWarning
    tabIndex={editable ? 0 : undefined}
    className={`text-[clamp(16px,1.4vw,22px)] leading-tight tracking-[-0.035em] ${editable ? 'cursor-text rounded-md outline-none hover:bg-white/10 focus:bg-white/15 focus:ring-2 focus:ring-[#5b7fff]' : ''}`}
    onBlur={(event) => {
      if (!editable) return;
      const next = [...bullets];
      next[index] = event.currentTarget.innerText.replace(/\s+$/g, '');
      onChange?.(next);
    }}
  >{bullet}</strong></div>)}</div>;
}

function EditableInvestmentBullets({ bullets, editable, onChange }: { bullets: string[]; editable?: boolean; onChange?: (bullets: string[]) => void }) {
  return <div className="mt-10 grid gap-4 border-t border-current/15 pt-7 sm:grid-cols-3">{bullets.map((bullet, index) => <span key={`${index}-${bullet}`} className="text-[12px] leading-relaxed"><i className="mb-2 block text-[9px] not-italic opacity-35">0{index + 1}</i><span
    contentEditable={editable}
    suppressContentEditableWarning
    tabIndex={editable ? 0 : undefined}
    className={editable ? 'block cursor-text rounded-md outline-none hover:bg-white/10 focus:bg-white/15 focus:ring-2 focus:ring-[#5b7fff]' : ''}
    onBlur={(event) => {
      if (!editable) return;
      const next = [...bullets];
      next[index] = event.currentTarget.innerText.replace(/\s+$/g, '');
      onChange?.(next);
    }}
  >{bullet}</span></span>)}</div>;
}

function scaleStyle(section: ProposalSlideContent): CSSProperties | undefined {
  if (!section.fontScale || section.fontScale === 100) return undefined;
  return { transform: `scale(${section.fontScale / 100})`, transformOrigin: 'top left', width: `${10000 / section.fontScale}%` };
}

function Bullets({ theme, bullets, invert = false }: { theme: ProposalTemplateId; bullets: string[]; invert?: boolean }) { if (!bullets.length) return null; return <div className={`mt-10 grid gap-3 ${bullets.length > 2 ? 'sm:grid-cols-2' : ''}`}>{bullets.map((bullet, index) => <div key={bullet} className={`flex items-center gap-4 border-t py-4 text-[13px] font-medium ${invert ? 'border-white/18' : 'border-current/15'}`}><span className={`${theme === 'editorial' ? 'font-serif italic text-[#B86538]' : theme === 'noir' ? 'grid size-7 place-items-center bg-[#D7FF38] text-[10px] font-black text-black' : 'grid size-7 place-items-center rounded-full bg-[#E9FF70] text-[10px] font-semibold text-black'}`}>0{index + 1}</span>{bullet}</div>)}</div>; }

function PrismaCards({ bullets }: { bullets: string[] }) { if (!bullets.length) return null; const colors = ['bg-[#E9FF70] text-black', 'bg-[#FF5D45] text-black', 'bg-[#8E5BFF] text-white', 'bg-[#17171B] text-white']; return <div className="mt-12 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:mt-0 lg:grid-cols-1 xl:grid-cols-2">{bullets.map((bullet, index) => <div key={bullet} className={`flex min-h-48 flex-col gap-6 justify-between rounded-[28px] p-[12%] ${colors[index % colors.length]}`}><span className="text-[10px] opacity-45">0{index + 1}</span><strong className="text-[clamp(16px,1.4vw,22px)] leading-tight tracking-[-0.035em]">{bullet}</strong></div>)}</div>; }
function Eyebrow({ theme, text, accentColor }: { theme: ProposalTemplateId; text: string; accentColor?: string }) { return <p style={validColor(accentColor) ? { color: accentColor } : undefined} className={`text-[10px] font-semibold uppercase tracking-[0.3em] ${theme === 'editorial' ? 'text-[#B86538]' : theme === 'noir' ? 'text-[#97B819]' : 'text-[#5B46E8]'}`}>{text}</p>; }
function Brand({ name, theme, logoUrl, accentColor }: { name: string; theme: ProposalTemplateId; logoUrl?: string; accentColor?: string }) { return <span className="flex shrink-0 items-center gap-2.5 text-[10px] font-semibold uppercase tracking-[0.22em]">{logoUrl ? <span className="grid h-8 min-w-8 place-items-center overflow-hidden rounded-lg bg-white/95 p-1 shadow-sm"><img src={logoUrl} alt={`Logo ${name}`} className="max-h-6 max-w-24 object-contain" /></span> : <i style={validColor(accentColor) ? { borderColor: accentColor, color: accentColor } : undefined} className={`grid size-7 place-items-center rounded-full border text-[8px] not-italic ${theme === 'editorial' ? 'border-current/35' : theme === 'noir' ? 'border-[#D7FF38] text-[#D7FF38]' : 'border-current/35'}`}>{name.slice(0, 1)}</i>}{name}</span>; }
function HeroBackground({ theme, imageUrl, brandColor }: { theme: ProposalTemplateId; imageUrl?: string; brandColor?: string }) { if (imageUrl) return <><img src={imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />{validColor(brandColor) && <div style={{ backgroundColor: brandColor }} className="absolute inset-0 opacity-55 mix-blend-multiply" />}<div className={`absolute inset-0 ${theme === 'noir' ? 'bg-black/72' : theme === 'prisma' ? 'bg-[#23239B]/42 mix-blend-multiply' : 'bg-gradient-to-r from-[#160F0B]/82 via-[#1B120D]/45 to-black/15'}`} /><div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/25" /></>; if (theme === 'editorial') return <><div className="absolute inset-0 bg-[url('/proposal/editorial-cover.png')] bg-cover bg-center" /><div className="absolute inset-0 bg-gradient-to-r from-[#160F0B]/90 via-[#1B120D]/50 to-black/12" /><div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/20" /></>; if (theme === 'noir') return <><GridLines /><i style={validColor(brandColor) ? { borderColor: brandColor } : undefined} className="absolute -right-[8vw] top-[8vw] size-[38vw] rounded-full border border-[#D7FF38]/35" /><i style={validColor(brandColor) ? { backgroundColor: brandColor } : undefined} className="absolute right-[5vw] top-[16vw] size-[17vw] rounded-full bg-[#D7FF38] opacity-10 blur-[100px]" /></>; return <><i className="absolute -right-[12vw] -top-[18vw] size-[55vw] rounded-full bg-[#FF5D45]" /><i className="absolute -bottom-[34vw] left-[20vw] size-[62vw] rounded-full bg-[#E9FF70]" /><i className="absolute right-[28vw] top-[12vw] size-[22vw] rounded-full bg-[#8E5BFF] opacity-80 blur-[55px]" /><div className="absolute inset-0 bg-gradient-to-br from-transparent via-[#3434D8]/5 to-[#3434D8]/65" /></>; }
function ClosingBackground({ theme }: { theme: ProposalTemplateId }) { if (theme === 'noir') return <GridLines />; if (theme === 'prisma') return <><i className="absolute -left-[16vw] -top-[24vw] size-[60vw] rounded-full bg-[#FF5D45]" /><i className="absolute -bottom-[30vw] right-[5vw] size-[55vw] rounded-full bg-[#E9FF70]" /><div className="absolute inset-0 bg-[#3434D8]/30" /></>; return <><div className="absolute inset-0 bg-[url('/proposal/editorial-cover.png')] bg-cover bg-center opacity-20 grayscale" /><div className="absolute inset-0 bg-[#2F241E]/88" /></>; }
function GridLines({ dark = true }: { dark?: boolean }) { return <div className="pointer-events-none absolute inset-0 opacity-50" style={{ backgroundImage: `linear-gradient(${dark ? 'rgba(255,255,255,.07)' : 'rgba(0,0,0,.07)'} 1px, transparent 1px), linear-gradient(90deg, ${dark ? 'rgba(255,255,255,.07)' : 'rgba(0,0,0,.07)'} 1px, transparent 1px)`, backgroundSize: '9.1vw 9.1vw' }} />; }
function shortLabel(item: ProposalSlideContent, index: number) { const label = item.eyebrow?.replace(/^\d+\s*[·/-]\s*/, '') || item.title; return label.length > 20 ? `Seção ${String(index + 1).padStart(2, '0')}` : label; }
function formatValidity(value?: string) { if (!value) return '15 dias'; const parsed = new Date(`${value}T12:00:00`); return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString('pt-BR'); }
function customSurface(color?: string) { if (!color || !/^#[0-9a-f]{6}$/i.test(color)) return undefined; const red = Number.parseInt(color.slice(1, 3), 16); const green = Number.parseInt(color.slice(3, 5), 16); const blue = Number.parseInt(color.slice(5, 7), 16); const light = (red * 299 + green * 587 + blue * 114) / 1000 > 150; return { backgroundColor: color, color: light ? '#17171B' : '#FFFFFF' }; }
function validColor(color?: string) { return Boolean(color && /^#[0-9a-f]{6}$/i.test(color)); }

function proposalVisualImages(proposal: ArtworkProposal): ProposalVisualImage[] {
  const template = getProposalTemplate(proposal.template);
  const defaults: Record<string, ProposalVisualImage[]> = {
    Arquitetura: [
      { url: '/proposal/architecture-cover.png', name: 'Arquitetura', caption: 'Atmosfera do projeto' },
      { url: '/proposal/editorial-cover.png', name: 'Materialidade', caption: 'Matéria e luz' },
      { url: '/proposal/chrome-cover.png', name: 'Detalhe técnico', caption: 'Precisão visual' },
    ],
    Marketing: [
      { url: '/proposal/campaign-cover.png', name: 'Campanha', caption: 'Movimento de marca' },
      { url: '/proposal/chrome-cover.png', name: 'Performance', caption: 'Sinal e tecnologia' },
      { url: '/proposal/editorial-cover.png', name: 'Narrativa', caption: 'Direção editorial' },
    ],
    Design: [
      { url: '/proposal/chrome-cover.png', name: 'Sistema visual', caption: 'Linguagem e forma' },
      { url: '/proposal/campaign-cover.png', name: 'Aplicação', caption: 'Presença de marca' },
      { url: '/proposal/editorial-cover.png', name: 'Composição', caption: 'Ritmo editorial' },
    ],
    Consultoria: [
      { url: '/proposal/chrome-cover.png', name: 'Estratégia', caption: 'Clareza executiva' },
      { url: '/proposal/campaign-cover.png', name: 'Movimento', caption: 'Plano em ação' },
      { url: '/proposal/architecture-cover.png', name: 'Estrutura', caption: 'Sistema de decisão' },
    ],
  };
  const provided = [
    proposal.content?.hero_image_url ? { url: proposal.content.hero_image_url, name: 'Imagem de capa', caption: 'Imagem principal' } : undefined,
    ...(proposal.content?.portfolio_images || []),
  ].filter(Boolean) as ProposalVisualImage[];
  const used = new Set<string>();
  return [...provided, ...(defaults[template.niche] || defaults.Consultoria)].filter((image) => {
    if (!image.url || used.has(image.url)) return false;
    used.add(image.url);
    return true;
  });
}

export function createFallbackProposalSections(proposal: ArtworkProposal): ProposalSlideContent[] {
  return [
    { type: 'cover', eyebrow: 'Proposta comercial', title: proposal.project, body: '', bullets: [] },
    { type: 'vision', eyebrow: '01 · A oportunidade', title: 'O ponto de virada começa pela leitura certa.', body: 'Mais do que executar uma entrega, precisamos construir uma resposta relevante para o momento do negócio.', bullets: [] },
    { type: 'context', eyebrow: '02 · Nossa compreensão', title: 'O desafio não é apenas fazer. É fazer sentido.', body: 'A solução parte do contexto, dos objetivos e das prioridades reais do cliente.', bullets: ['Contexto', 'Desafio', 'Critério de decisão'] },
    { type: 'solution', eyebrow: '03 · A solução', title: 'Uma entrega desenhada para o desafio.', body: 'A estratégia conecta leitura, escolhas e execução em uma única jornada.', bullets: ['Diagnóstico', 'Estratégia', 'Desenvolvimento'] },
    { type: 'scope', eyebrow: '04 · Escopo', title: 'Tudo o que sustenta a entrega.', body: 'Entregáveis organizados para dar previsibilidade, ritmo e qualidade ao projeto.', bullets: ['Imersão', 'Direção', 'Implementação', 'Acompanhamento'] },
    { type: 'investment', eyebrow: '05 · Investimento', title: '', body: 'Um investimento alinhado à profundidade, ao cuidado e ao impacto da solução proposta.', bullets: ['Escopo completo', 'Cronograma acordado', 'Acompanhamento próximo'] },
    { type: 'closing', eyebrow: 'Próximo passo', title: 'Vamos construir algo relevante juntos?', body: 'Estamos prontos para transformar esta oportunidade em uma entrega memorável.', bullets: [] },
  ];
}

function getPalette(theme: ProposalTemplateId) {
  if (theme === 'noir') return { page: 'bg-[#0B0B0C] text-white', header: 'border-white/10 bg-[#0B0B0C]/88 text-white', muted: 'text-white/45', divider: 'bg-white/15', hero: 'bg-[#0B0B0C] text-white', heroAccent: 'text-[#D7FF38]', heroBorder: 'border-white/20', section: 'bg-[#F0EEE8] text-[#0B0B0C]', sectionAlt: 'bg-[#0B0B0C] text-white', body: 'text-black/52', closing: 'bg-[#0B0B0C] text-white', button: 'bg-[#D7FF38] text-black', footer: 'border-white/10 bg-[#0B0B0C] text-white' };
  if (theme === 'prisma') return { page: 'bg-[#F5F2EB] text-[#17171B]', header: 'border-black/10 bg-[#F5F2EB]/88 text-[#17171B]', muted: 'text-black/45', divider: 'bg-black/15', hero: 'bg-[#3434D8] text-white', heroAccent: 'text-[#E9FF70]', heroBorder: 'border-white/28', section: 'bg-[#F5F2EB] text-[#17171B]', sectionAlt: 'bg-[#3434D8] text-white', body: 'text-black/52', closing: 'bg-[#3434D8] text-white', button: 'bg-[#E9FF70] text-black', footer: 'border-black/10 bg-[#F5F2EB] text-[#17171B]' };
  return { page: 'bg-[#F7F1E8] text-[#2F241E]', header: 'border-[#2F241E]/10 bg-[#F7F1E8]/88 text-[#2F241E]', muted: 'text-[#2F241E]/45', divider: 'bg-[#2F241E]/15', hero: 'bg-[#2F241E] text-[#FFF8EE]', heroAccent: 'text-[#E7AA69]', heroBorder: 'border-white/25', section: 'bg-[#F7F1E8] text-[#2F241E]', sectionAlt: 'bg-[#E9DED0] text-[#2F241E]', body: 'text-[#2F241E]/58', closing: 'bg-[#2F241E] text-[#FFF8EE]', button: 'bg-[#B86538] text-white', footer: 'border-[#2F241E]/12 bg-[#E9DED0] text-[#2F241E]' };
}
