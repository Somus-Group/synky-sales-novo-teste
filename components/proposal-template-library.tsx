'use client';

import { useState } from 'react';
import { ArrowUpRight, Download, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProposalThumbnail } from './proposal-artwork';
import { TemplatePreviewDialog } from './template-preview-dialog';
import { collectionTemplates, collectionMarkdown } from '@/lib/proposal-collection';
import { proposalNiches, type ProposalNiche, type ProposalTemplateDefinition } from '@/lib/proposal-templates';
import styles from './proposal-template-library.module.css';
import { TemplateImporter } from './template-importer';
import type { Proposal } from './somus-app';

export function ProposalTemplateLibrary({ onUse, onNotify, onImported }: { onUse: (value: string) => void; onNotify: (message: string) => void; onImported: (proposal: Proposal) => void }) {
  const [niche, setNiche] = useState<ProposalNiche | 'Todos'>('Todos');
  const [preview, setPreview] = useState<ProposalTemplateDefinition | null>(null);
  const templates = collectionTemplates.filter(item => niche === 'Todos' || item.niche === niche);
  function download(template: ProposalTemplateDefinition) {
    const url = URL.createObjectURL(new Blob([collectionMarkdown(template.value)], { type: 'text/markdown;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url; link.download = `${template.id}-proposta.md`; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    onNotify('Modelo completo baixado. Personalize o conteúdo para seu cliente.');
  }
  return <section className={styles.library} aria-label="Biblioteca de templates de propostas">
    <TemplateImporter onCreated={onImported} onNotify={onNotify} />
    <div className={styles.intro}><div><span className={styles.label}>COLEÇÃO SYNKY / PROPOSTAS</span><p>10 modelos por área. Explore a prévia e escolha a apresentação do seu próximo projeto.</p></div><span className={styles.count}>{collectionTemplates.length}<small>modelos completos</small></span></div>
    <div className={styles.filterbar}><fieldset className={styles.filters} aria-label="Área de atuação">{(['Todos', ...proposalNiches] as const).map(item => <button type="button" key={item} aria-pressed={niche === item} onClick={() => setNiche(item)}>{item}</button>)}</fieldset><span>{templates.length} modelos</span></div>
    <div className={styles.grid}>{templates.map(template => <article className={styles.card} key={template.id}>
      <button type="button" className={styles.thumbnail} onClick={() => setPreview(template)} aria-label={`Ver prévia do template ${template.name}`}><ProposalThumbnail template={template.value} /><span className={styles.previewLabel}><Eye size={16} />Explorar proposta</span></button>
      <div className={styles.cardBody}><div className={styles.metadata}><span>{template.niche}</span><span>6 seções · Editável</span></div><h3>{template.name}</h3><p>{template.description}</p><div className={styles.actions}><Button variant="ghost" onClick={() => download(template)} aria-label={`Baixar modelo ${template.name}`}><Download size={16} />Baixar</Button><Button onClick={() => onUse(template.value)}>Usar modelo<ArrowUpRight size={16} /></Button></div></div>
    </article>)}</div>
    <p className={styles.note}>As prévias usam textos e valores de exemplo. Ajuste as entregas e as condições à realidade de cada projeto.</p>
    <TemplatePreviewDialog template={preview} onOpenChange={open => { if (!open) setPreview(null); }} onUse={() => { if (preview) onUse(preview.value); }} />
  </section>;
}
