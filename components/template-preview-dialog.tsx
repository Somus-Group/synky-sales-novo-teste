'use client';

import { useEffect, useState } from 'react';
import { Monitor, Smartphone, Sparkles, Tablet, X } from 'lucide-react';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { ProposalTemplateDefinition } from '@/lib/proposal-templates';
import styles from './template-preview-dialog.module.css';

const devices = [
  { id: 'desktop', label: 'Desktop', width: 1280, Icon: Monitor },
  { id: 'tablet', label: 'Tablet', width: 820, Icon: Tablet },
  { id: 'mobile', label: 'Celular', width: 390, Icon: Smartphone },
] as const;

export function TemplatePreviewDialog({ template, onOpenChange, onUse }: {
  template: ProposalTemplateDefinition | null;
  onOpenChange: (open: boolean) => void;
  onUse: () => void;
}) {
  return <Dialog open={!!template} onOpenChange={onOpenChange}>
    {template && <TemplateViewer key={template.id} template={template} onUse={onUse} />}
  </Dialog>;
}

function TemplateViewer({ template, onUse }: { template: ProposalTemplateDefinition; onUse: () => void }) {
  const [device, setDevice] = useState<(typeof devices)[number]>(devices[0]);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [loaded, setLoaded] = useState(false);
  const [viewport, setViewport] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    const element = viewport;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      setSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [viewport]);

  // Keep a real device viewport; fit the whole document visually without changing its breakpoints.
  const scale = Math.min(1, size.width / device.width) || 1;
  const height = Math.max(1, size.height / scale);

  return <DialogContent className={styles.dialog} showCloseButton={false}>
    <header className={styles.toolbar}>
      <div className={styles.heading}>
        <span className={styles.eyebrow}>Prévia da proposta · {template.niche}</span>
        <DialogTitle className={styles.title}>{template.name}</DialogTitle>
        <DialogDescription className={styles.description}>{template.description}</DialogDescription>
      </div>
      <div className={styles.controls}>
        <fieldset className={styles.devices} aria-label="Tamanho da prévia">
          {devices.map(({ id, label, Icon }) => <button type="button" key={id}
            aria-label={`Ver em ${label}`} aria-pressed={device.id === id}
            onClick={() => setDevice(devices.find((item) => item.id === id)!)}>
            <Icon size={17} /><span>{label}</span>
          </button>)}
        </fieldset>
        <Button onClick={onUse} className={styles.use}><Sparkles size={16} />Usar template</Button>
      </div>
      <DialogClose className={styles.close} aria-label="Fechar prévia"><X size={20} /></DialogClose>
    </header>
    <div className={styles.stage}>
      <div ref={setViewport} className={styles.viewport}>
        {!loaded && <output className={styles.loading}>Carregando prévia…</output>}
        <div className={styles.frame} style={{ width: device.width * scale, height: size.height || '100%', visibility: size.width ? 'visible' : 'hidden' }}>
          <iframe title={`Prévia de ${template.name}`} src={`/templates/preview/${template.id}`}
            onLoad={() => setLoaded(true)}
            style={{ width: device.width, height, transform: `scale(${scale})` }} />
        </div>
      </div>
    </div>
    <footer className={styles.footer}>
      <span>Conteúdo ilustrativo · role para explorar a proposta</span>
      <span aria-live="polite">{device.label} · {device.width} px · {Math.round(scale * 100)}%</span>
    </footer>
  </DialogContent>;
}
