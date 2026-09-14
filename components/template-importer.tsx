'use client';
import { useEffect, useRef, useState } from 'react';
import { FileUp, Loader2, Pencil, Save, X } from 'lucide-react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from './ui/dialog';
import { CollectionCover } from './proposal-collection';
import { collectionTemplates, getCollectionDesign } from '@/lib/proposal-collection';
import { proposalNiches, type ProposalNiche } from '@/lib/proposal-templates';
import type { ImportedTemplate } from '@/lib/imported-template';
import type { Proposal } from './somus-app';
import styles from './template-importer.module.css';

export function TemplateImporter({ onCreated, onNotify }: { onCreated: (proposal: Proposal) => void; onNotify: (message: string) => void }) {
  const [items, setItems] = useState<ImportedTemplate[]>([]);
  const [open, setOpen] = useState(false);
  const [item, setItem] = useState<ImportedTemplate | null>(null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [warning, setWarning] = useState('');
  const [client, setClient] = useState('');
  const [section, setSection] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [dragging, setDragging] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const operation = useRef(false);
  const abort = useRef<AbortController | null>(null);
  function load() {
    return fetch('/api/templates').then(async r => {
      const d = await r.json() as { error?: string; templates: ImportedTemplate[] };
      if (!r.ok) throw new Error(d.error);
      return d.templates;
    });
  }
  function retryLoad() { void load().then(next => { setItems(next); setLoadError(''); }).catch(() => setLoadError('Não foi possível carregar seus modelos importados.')); }
  useEffect(() => {
    let active = true;
    void load().then(next => { if (active) setItems(next); }).catch(() => { if (active) setLoadError('Não foi possível carregar seus modelos importados.'); });
    return () => { active = false; abort.current?.abort(); };
  }, []);
  function close() {
    if (busy || dirty && !window.confirm('Sair sem salvar as alterações deste modelo?')) return;
    setOpen(false); setItem(null); setDirty(false); setError('');
  }
  function begin(next: ImportedTemplate | null) { setItem(next ? structuredClone(next) : null); setOpen(true); setSection(0); setDirty(false); setWarning(''); setError(''); setClient(''); }
  function edit(next: ImportedTemplate) { setItem(next); setDirty(true); }
  async function importPdf(file?: File) {
    if (!file || operation.current) return;
    setError('');
    if (!/\.pdf$/i.test(file.name) || !file.size || file.size > 8 * 1024 * 1024) { setError('Escolha um PDF com até 8 MB.'); return; }
    operation.current = true; setBusy('Lendo o PDF e organizando os textos…'); abort.current = new AbortController();
    try {
      const r = await fetch('/api/templates/import', { method: 'POST', headers: { 'Content-Type': 'application/pdf' }, body: file, signal: abort.current.signal });
      const d = await r.json() as { error?: string; template: ImportedTemplate; warning: string }; if (!r.ok) throw new Error(d.error);
      setItem(d.template); setWarning(d.warning); setSection(0); setDirty(true);
    } catch (e) { if (!(e instanceof Error && e.name === 'AbortError')) setError(e instanceof Error ? e.message : 'Falha ao importar.'); }
    finally { operation.current = false; setBusy(''); }
  }
  async function save(use = false) {
    if (!item || operation.current) return;
    if (!item.name.trim() || use && !client.trim()) { setError('Informe o nome do modelo e, para criar uma proposta, o cliente.'); return; }
    operation.current = true; setBusy(use ? 'Criando sua proposta…' : 'Salvando modelo…'); setError('');
    try {
      const r = await fetch('/api/templates', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(item) });
      const d = await r.json() as { error?: string; template: ImportedTemplate }; if (!r.ok) throw new Error(d.error);
      setItems(current => [d.template, ...current.filter(i => i.id !== item.id)]); setDirty(false);
      if (use) {
        const draft = { client: client.trim(), project: item.content.title || item.name, value: 0, validity: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10), template: item.template, content: item.content };
        const result = await fetch('/api/proposals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(draft) });
        const created = await result.json() as { error?: string; id: number; code: string; slug: string }; if (!result.ok) throw new Error(created.error);
        onCreated({ ...draft, id: created.id, code: created.code, slug: created.slug, status: 'Rascunho', updated: 'Agora' });
      } else onNotify('Template salvo na biblioteca da sua empresa.');
    } catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível salvar.'); }
    finally { operation.current = false; setBusy(''); }
  }
  const design = item ? getCollectionDesign(item.template) : undefined;
  const slide = item?.content.slides[section];
  function updateSlide(field: 'title' | 'body' | 'eyebrow' | 'bullets', value: string) {
    if (!item) return;
    edit({ ...item, content: { ...item.content, ...(section === 0 && field === 'title' ? { title: value } : section === 0 && field === 'body' ? { subtitle: value } : {}), slides: item.content.slides.map((s, i) => i === section ? { ...s, [field]: field === 'bullets' ? value.split('\n') : value } : s) } });
  }
  function updateHeading(field: 'title' | 'subtitle', value: string) {
    if (!item) return;
    edit({ ...item, content: { ...item.content, [field]: value, slides: item.content.slides.map((s, i) => i === 0 ? { ...s, [field === 'title' ? 'title' : 'body']: value } : s) } });
  }
  return <div className={styles.importer}>
    <div className={styles.importbar}><div><strong>Seu modelo, no Synky</strong><p>Importe uma proposta em PDF e transforme os textos em um modelo reutilizável.</p></div><Button onClick={() => begin(null)}><FileUp size={17} />Importar template</Button></div>
    {loadError && <p role="alert">{loadError} <button onClick={retryLoad}>Tentar novamente</button></p>}
    {items.length > 0 && <div className={styles.saved}><h3>Templates da sua empresa</h3><div>{items.map(saved => <button key={saved.id} onClick={() => begin(saved)}><FileUp size={20} /><span><strong>{saved.name}</strong><small>{saved.niche} · {saved.content.slides.length} seções</small></span><Pencil size={16} /></button>)}</div></div>}
    <Dialog open={open} onOpenChange={next => { if (!next) close(); }}><DialogContent className={styles.dialog} showCloseButton={false}>
      <header className={styles.header}><div><DialogTitle>{item ? 'Editar template importado' : 'Importar template em PDF'}</DialogTitle><DialogDescription>Textos editáveis em um layout Synky. Imagens, fontes e diagramação do PDF não são reproduzidas fielmente.</DialogDescription></div><Button variant="ghost" size="icon" aria-label="Fechar importação" disabled={!!busy} onClick={close}><X /></Button></header>
      {!item ? <div className={styles.upload} data-dragging={dragging} onDragOver={e => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={e => { e.preventDefault(); setDragging(false); void importPdf(e.dataTransfer.files[0]); }}><FileUp size={40} /><h3>Traga sua proposta para cá</h3><p>Arraste seu PDF ou escolha um arquivo. Até 8 MB.</p><input ref={input} type="file" accept="application/pdf,.pdf" hidden onChange={e => { void importPdf(e.target.files?.[0]); e.target.value = ''; }} /><Button disabled={!!busy} onClick={() => input.current?.click()}>Selecionar PDF</Button><p className={styles.disclosure}>O arquivo será enviado à IA da OpenAI para leitura. Envie apenas documentos que você tem autorização para usar. Só os textos revisados são salvos na sua empresa; o PDF original não é armazenado.</p></div>
      : <div className={styles.workspace}><fieldset disabled={!!busy} className={styles.fields}>
        <label>Nome do template<input maxLength={120} value={item.name} onChange={e => edit({ ...item, name: e.target.value })} /></label>
        <div className={styles.row}><label>Área<select aria-label="Área" value={item.niche} onChange={e => edit({ ...item, niche: e.target.value as ProposalNiche })}>{proposalNiches.map(n => <option key={n}>{n}</option>)}</select></label><label>Marca<input maxLength={200} value={item.content.brand_name} onChange={e => edit({ ...item, content: { ...item.content, brand_name: e.target.value } })} /></label></div>
        <label>Layout da proposta<select aria-label="Layout da proposta" value={item.template} onChange={e => edit({ ...item, template: e.target.value })}>{collectionTemplates.map(t => <option value={t.value} key={t.id}>{t.niche} · {t.name}</option>)}</select></label>
        <label>Título da proposta<input maxLength={300} value={item.content.title} onChange={e => updateHeading('title', e.target.value)} /></label>
        <label>Subtítulo<textarea aria-label="Subtítulo" rows={2} maxLength={2000} value={item.content.subtitle} onChange={e => updateHeading('subtitle', e.target.value)} /></label>
        <label>Seção para editar<select aria-label="Seção para editar" value={section} onChange={e => setSection(Number(e.target.value))}>{item.content.slides.map((s, i) => <option key={i} value={i}>{i + 1}. {s.title || 'Sem título'}</option>)}</select></label>
        {slide && <><label>Rótulo da seção<input maxLength={200} value={slide.eyebrow} onChange={e => updateSlide('eyebrow', e.target.value)} /></label><label>Título da seção<input maxLength={300} value={slide.title} onChange={e => updateSlide('title', e.target.value)} /></label><label>Texto<textarea aria-label="Texto" rows={9} maxLength={18000} value={slide.body} onChange={e => updateSlide('body', e.target.value)} /></label><label>Itens (um por linha)<textarea aria-label="Itens (um por linha)" rows={5} value={slide.bullets.join('\n')} onChange={e => updateSlide('bullets', e.target.value)} /></label></>}
      </fieldset><aside className={styles.preview}><span>Prévia da capa</span>{design && <div className={styles.cover}><CollectionCover compact design={design} proposal={{ code: 'SEU MODELO', client: client || 'Nome do cliente', project: item.content.title, template: item.template, content: item.content }} /></div>}<p>Revise todas as seções, especialmente valores, prazos e condições. A conversão pode conter imprecisões.</p>{warning && <p className={styles.warning}>{warning}</p>}<label>Cliente da nova proposta<input disabled={!!busy} value={client} maxLength={200} onChange={e => setClient(e.target.value)} placeholder="Informe para usar este modelo" /></label><p>O valor total fica “A confirmar” até você defini-lo no editor. Os valores transcritos continuam nos textos.</p></aside></div>}
      {error && <p className={styles.error} role="alert">{error}</p>}<footer className={styles.footer}>{busy ? <output><Loader2 className="animate-spin" size={17} />{busy}</output> : <span>{dirty ? 'Alterações ainda não salvas' : item ? 'Modelo salvo na sua empresa' : 'Seu arquivo original não será alterado'}</span>}{item && <div><Button variant="outline" disabled={!!busy} onClick={() => void save()}><Save size={16} />Salvar template</Button><Button disabled={!!busy} onClick={() => void save(true)}>Usar na proposta</Button></div>}</footer>
    </DialogContent></Dialog>
  </div>;
}
