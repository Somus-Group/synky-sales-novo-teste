'use client';

// Customer uploads and catalog assets share the existing native-image rendering path.
/* oxlint-disable next/no-img-element */

import type { CSSProperties, ReactNode } from 'react';
import { Check, Loader2 } from 'lucide-react';
import type { ArtworkProposal, ProposalSlideContent } from './proposal-artwork';
import type { CollectionDesign } from '@/lib/proposal-collection';
import styles from './proposal-collection.module.css';

function designStyle(design: CollectionDesign, proposal?: ArtworkProposal): CSSProperties {
  const primary = proposal?.content?.primary_color;
  const secondary = proposal?.content?.secondary_color;
  return {
    '--document-ink': primary && /^#[0-9a-f]{6}$/i.test(primary) ? primary : design.colors[0],
    '--document-accent': secondary && /^#[0-9a-f]{6}$/i.test(secondary) ? secondary : design.colors[1],
    '--document-paper': design.colors[2],
  } as CSSProperties;
}

export function CollectionCover({ design, proposal, compact = false }: {
  design: CollectionDesign; proposal: ArtworkProposal; compact?: boolean;
}) {
  const cover = proposal.content?.slides?.[0];
  const title = cover?.title || proposal.project;
  const photo = proposal.content?.hero_image_url || proposal.content?.portfolio_images?.[0]?.url || '/proposal/editorial-cover.png';
  const architectural = design.niche === 'Arquitetura';
  const Heading = compact ? 'h3' : 'h1';
  return <section className={`${styles.cover} ${compact ? styles.compact : ''}`} data-layout={design.layout} style={designStyle(design, proposal)}>
    <header className={styles.coverHeader}>
      <span>{proposal.content?.logo_url && <img src={proposal.content.logo_url} alt="" />}{proposal.content?.brand_name || design.brand}</span>
      <span>{proposal.code}</span>
    </header>
    {architectural && <img className={styles.coverPhoto} src={photo} alt={compact ? '' : 'Referência visual de arquitetura e interiores'} />}
    <div className={styles.coverMain}>
      <p className={styles.kicker}>{cover?.eyebrow || 'Proposta comercial'}</p>
      <Heading className={styles.coverTitle} style={{ color: 'inherit' }}>{title}</Heading>
      <p className={styles.coverSubtitle}>{cover?.body || proposal.content?.subtitle}</p>
      {!compact && !!cover?.bullets.length && <ul className={styles.coverBullets}>{cover.bullets.map((text, index) => <li key={index}>{text}</li>)}</ul>}
    </div>
    {!architectural && <aside className={styles.coverAside} aria-hidden={compact || undefined}>
      <span className={styles.edition}>{design.niche === 'Design' ? 'Aa' : '01—03'}</span>
      <span>{design.niche === 'Marketing' ? 'Estratégia.\nCriação.\nResultados.' : design.niche === 'Design' ? 'Estratégia.\nForma.\nExperiência.' : 'Diagnosticar.\nPlanejar.\nTransformar.'}</span>
    </aside>}
    <footer className={styles.coverFooter}><span>Preparada para<strong>{proposal.client}</strong></span><span>{design.niche}<strong>Escopo · Etapas · Investimento</strong></span></footer>
  </section>;
}

export function CollectionProposal({ design, proposal, slides, accepted, accepting, onAccept, actions, idPrefix }: {
  design: CollectionDesign; proposal: ArtworkProposal; slides: ProposalSlideContent[];
  accepted?: boolean; accepting?: boolean; onAccept?: () => void; actions?: ReactNode; idPrefix: string;
}) {
  const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
  const company = proposal.content?.company;
  return <article className={styles.document} data-layout={design.layout} style={designStyle(design, proposal)}>
    {actions && <div className={styles.actions}>{actions}</div>}
    <CollectionCover design={design} proposal={{ ...proposal, content: { ...proposal.content, slides } }} />
    <nav className={styles.index} aria-label="Seções da proposta">{slides.slice(1).map((slide, index) => <a key={index} href={`#${idPrefix}-${index + 1}`}><span>{String(index + 1).padStart(2, '0')}</span>{slide.eyebrow.replace(/^\d+\s*[·/—-]\s*/, '') || slide.title}</a>)}</nav>
    {slides.slice(1).map((slide, index) => <section key={index} id={`${idPrefix}-${index + 1}`} className={styles.section} data-type={slide.type}
      style={slide.backgroundColor && /^#[0-9a-f]{6}$/i.test(slide.backgroundColor) ? { backgroundColor: slide.backgroundColor } : undefined}>
      <div className={styles.sectionHeading}><p className={styles.kicker}>{slide.eyebrow}</p><h2>{slide.title}</h2></div>
      <div className={styles.sectionContent}><p>{slide.body}</p>
        {slide.type === 'investment' && <div className={styles.investment}><span>Investimento proposto</span><strong>{proposal.content?.budget_pending ? 'A confirmar' : currency.format(proposal.value ?? (proposal.valueCents ?? 0) / 100)}</strong>{proposal.validity && <small>Validade · {proposal.validity.split('-').reverse().join('/')}</small>}</div>}
        {!!slide.bullets.length && <ol className={styles.deliverables}>{slide.bullets.map((text, itemIndex) => <li key={itemIndex}><span>{String(itemIndex + 1).padStart(2, '0')}</span><p>{text}</p></li>)}</ol>}
        {slide.type === 'closing' && (accepted ? <p className={styles.accepted}><Check size={18} />Proposta aceita</p> : onAccept ? <button className={styles.accept} onClick={onAccept} disabled={accepting}>{accepting ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}{accepting ? 'Confirmando…' : 'Aceitar proposta'}</button> : <p className={styles.demo}>Modelo de proposta · personalize antes de enviar.</p>)}
      </div>
    </section>)}
    {!!proposal.content?.portfolio_images?.length && <section className={styles.portfolio}><h2>Portfólio selecionado</h2><div>{proposal.content.portfolio_images.map((item, index) => <figure key={index}><img src={item.url} alt={item.caption || item.name} /><figcaption>{item.caption || item.name}</figcaption></figure>)}</div></section>}
    <footer className={styles.documentFooter}><strong>{proposal.content?.brand_name || design.brand}</strong><span>{[company?.website, company?.email, company?.phone, company?.address].filter(Boolean).join(' · ') || `Proposta comercial · ${proposal.code}`}</span></footer>
  </article>;
}
