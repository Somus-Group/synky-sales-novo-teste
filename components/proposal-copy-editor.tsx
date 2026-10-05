'use client';

import { useMemo, useRef, useState } from 'react';
import { Download, ExternalLink, FilePlus2, LoaderCircle, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type TextItem = { path: number[]; text: string };
const keyOf = (item: TextItem) => item.path.join('.');
const frameDocument = (html: string, base: string) => {
  const policy = "default-src 'none'; style-src 'unsafe-inline' https:; img-src https: data:; font-src https: data:; connect-src 'none'; script-src 'none'; object-src 'none'; form-action 'none'; base-uri https:";
  const baseTag = `<base href="${new URL('.', base).href}">`;
  return html.replace(/<head([^>]*)>/i, `<head$1><meta http-equiv="Content-Security-Policy" content="${policy}">${baseTag}`);
};

export function ProposalCopyEditor() {
  const [url, setUrl] = useState('');
  const [source, setSource] = useState<{ title: string; url: string; html: string; texts: TextItem[] } | null>(null);
  const [changes, setChanges] = useState<Record<string, string>>({});
  const [search, setSearch] = useState('');
  const [preview, setPreview] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [shareUrl, setShareUrl] = useState('');
  const renderVersion = useRef(0);

  const visibleTexts = useMemo(() => source?.texts.filter((item) => item.text.toLowerCase().includes(search.toLowerCase())) || [], [source, search]);
  const replacementList = useMemo(() => source?.texts.filter((item) => changes[keyOf(item)] !== undefined && changes[keyOf(item)] !== item.text).map((item) => ({ path: item.path, text: changes[keyOf(item)] })) || [], [source, changes]);

  async function importLink(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setMessage(''); setShareUrl('');
    try {
      const response = await fetch('/api/proposal-copy/import', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url }) });
      const data = await response.json() as { error?: string; title: string; url: string; html: string; texts: TextItem[] };
      if (!response.ok) throw new Error(data.error || 'Não foi possível abrir a proposta.');
      setSource(data); setChanges({}); setPreview(data.html); setMessage(`${data.texts.length} trechos de texto encontrados.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Não foi possível abrir a proposta.'); }
    finally { setBusy(false); }
  }

  async function refreshPreview(next: Record<string, string>) {
    if (!source) return;
    const currentVersion = ++renderVersion.current;
    const replacements = source.texts.filter((item) => next[keyOf(item)] !== undefined && next[keyOf(item)] !== item.text).map((item) => ({ path: item.path, text: next[keyOf(item)] }));
    const response = await fetch('/api/proposal-copy/render', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ html: source.html, replacements }) });
    const data = await response.json() as { html?: string; error?: string };
    if (!response.ok || !data.html) throw new Error(data.error || 'Não foi possível atualizar a prévia.');
    if (currentVersion === renderVersion.current) setPreview(data.html);
  }

  function edit(item: TextItem, value: string) {
    const next = { ...changes, [keyOf(item)]: value };
    setChanges(next);
    void refreshPreview(next).catch((error) => setMessage(error.message));
  }

  async function publishCopy() {
    if (!source || !preview) return;
    setBusy(true); setMessage('');
    try {
      const rendered = await fetch('/api/proposal-copy/render', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ html: source.html, replacements: replacementList }) });
      const renderedData = await rendered.json() as { html?: string; error?: string };
      if (!rendered.ok || !renderedData.html) throw new Error(renderedData.error || 'Não foi possível preparar a cópia.');
      const response = await fetch('/api/proposal-copy/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: source.title, sourceUrl: source.url, html: renderedData.html }) });
      const data = await response.json() as { url?: string; error?: string };
      if (!response.ok || !data.url) throw new Error(data.error || 'Não foi possível salvar a cópia.');
      setShareUrl(data.url); setMessage('Cópia publicada. A proposta original não foi alterada.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Não foi possível salvar a cópia.'); }
    finally { setBusy(false); }
  }

  function downloadCopy() {
    if (!source || !preview) return;
    const blob = new Blob([frameDocument(preview, source.url)], { type: 'text/html;charset=utf-8' });
    const anchor = document.createElement('a'); anchor.href = URL.createObjectURL(blob); anchor.download = `${source.title.replace(/[^\p{L}\p{N}-]+/gu, '-').slice(0, 60) || 'proposta'}-editada.html`; anchor.click(); URL.revokeObjectURL(anchor.href);
  }

  return <section className="mx-auto flex min-h-[calc(100dvh-68px)] max-w-[1600px] flex-col gap-5 px-4 py-5 text-[#17243b] sm:px-6 lg:px-8">
    <header className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#0b6fe8]">Módulo novo</p><h1 className="mt-1 text-2xl font-semibold">Editar proposta existente</h1><p className="mt-1 text-sm text-[#68778d]">Troque somente os textos. O layout e os estilos vêm do link original.</p></div><div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-800">Sem uso de IA · R$ 0,00</div></header>
    <form onSubmit={importLink} className="flex flex-col gap-2 sm:flex-row"><Input required type="url" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="Cole o link público da proposta" className="h-11 min-w-0 flex-1 rounded-lg border-[#d5deea] bg-white" /><Button disabled={busy} className="h-11 rounded-lg bg-[#0b6fe8] px-5 text-white">{busy ? <LoaderCircle className="animate-spin" /> : <ExternalLink />} Abrir proposta</Button></form>
    {message && <p role="status" className="text-sm text-[#586a82]">{message}</p>}
    {source && <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[minmax(320px,0.8fr)_minmax(0,1.4fr)]">
      <section className="flex min-h-[520px] flex-col overflow-hidden rounded-lg border border-[#dce3ec] bg-white"><div className="border-b border-[#e6ebf1] p-4"><div className="flex items-center justify-between gap-3"><div className="min-w-0"><h2 className="truncate text-sm font-semibold">{source.title}</h2><p className="mt-1 truncate text-xs text-[#7b8798]">{new URL(source.url).hostname}</p></div><span className="shrink-0 text-xs text-[#738198]">{replacementList.length} alterados</span></div><label className="relative mt-3 block"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#7e8ba0]" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Localizar texto da proposta" className="h-9 rounded-md border-[#e1e6ee] pl-9" /></label></div>
        <div className="min-h-0 flex-1 divide-y divide-[#edf0f4] overflow-y-auto">{visibleTexts.map((item) => <label key={keyOf(item)} className="block px-4 py-3"><span className="mb-1.5 block text-[11px] text-[#718098]">Original</span><span className="mb-2 block whitespace-pre-wrap text-sm leading-5 text-[#34435a]">{item.text}</span><span className="sr-only">Novo texto</span><textarea aria-label={`Novo texto: ${item.text.slice(0, 80)}`} value={changes[keyOf(item)] ?? item.text} onChange={(event) => edit(item, event.target.value)} rows={Math.min(4, Math.max(2, Math.ceil(item.text.length / 54)))} className="w-full resize-y rounded-md border border-[#dfe5ed] bg-[#fafbfd] px-3 py-2 text-sm leading-5 outline-none focus:border-[#6ba8f3] focus:ring-2 focus:ring-[#0b6fe8]/10" /></label>)}{visibleTexts.length === 0 && <p className="p-5 text-sm text-[#7b8798]">Nenhum texto corresponde à busca.</p>}</div>
        <footer className="flex flex-wrap items-center gap-2 border-t border-[#e6ebf1] p-3"><Button type="button" variant="outline" disabled={busy || !replacementList.length} onClick={() => void publishCopy()} className="h-9 rounded-md">{busy ? <LoaderCircle className="animate-spin" /> : <FilePlus2 />} Salvar cópia e gerar link</Button><Button type="button" variant="ghost" disabled={!replacementList.length} onClick={downloadCopy} className="h-9 rounded-md"><Download /> Baixar HTML</Button>{shareUrl && <a className="ml-auto text-sm font-medium text-[#0b6fe8] underline" href={shareUrl} target="_blank" rel="noreferrer">Abrir cópia publicada</a>}</footer>
      </section>
      <section className="flex min-h-[520px] flex-col overflow-hidden rounded-lg border border-[#dce3ec] bg-white"><div className="flex h-12 items-center justify-between border-b border-[#e6ebf1] px-4"><h2 className="text-sm font-semibold">Prévia da proposta</h2><span className="text-xs text-[#718098]">Visual original · conteúdo revisado</span></div><iframe title="Prévia da proposta editada" sandbox="" referrerPolicy="no-referrer" srcDoc={frameDocument(preview, source.url)} className="min-h-0 flex-1 bg-white" /></section>
    </div>}
    {!source && <div className="grid min-h-[420px] flex-1 place-items-center rounded-lg border border-dashed border-[#cfd9e6] bg-white/70 px-6 text-center"><div><FilePlus2 className="mx-auto size-8 text-[#4889d8]" /><p className="mt-3 text-sm font-medium">A proposta aparece aqui, sem mudar o original</p><p className="mt-1 text-xs text-[#718098]">Cole um link público para começar.</p></div></div>}
  </section>;
}
