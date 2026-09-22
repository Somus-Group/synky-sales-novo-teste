'use client';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Check,
  Copy,
  Download,
  FileText,
  FolderOpen,
  LayoutTemplate,
  Link2,
  Loader2,
  Monitor,
  Maximize2,
  Minimize2,
  Palette,
  Plus,
  PenLine,
  Printer,
  Save,
  SlidersHorizontal,
  Smartphone,
  Trash2,
  Upload,
  X,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  emptyZeroDraft,
  normalizeZeroDraft,
  readZeroBrief,
  renderZeroEmptyState,
  renderZeroProposal,
  zeroCatalog,
  zeroCovers,
  zeroCover,
  zeroImagePaths,
  zeroMoney,
  zeroReadiness,
  zeroTotals,
  type ZeroDraft,
  type ZeroSaved,
  type ZeroService,
  type ZeroSummary,
} from '@/lib/zero-proposal';
import {
  composeZeroBrief,
  composeZeroReferenceBrief,
  type ZeroComposition,
} from '@/lib/zero-compose';
import type { AgentProfile } from './somus-app';
import styles from './zero-lab.module.css';

type VisualAsset = {
  url: string;
  name: string;
  kind: string;
  caption?: string;
};
type ZeroReferenceHint = {
  title: string;
  content: string;
  template: string;
  styles: string;
  colors: string[];
  serif: boolean;
  fonts: string[];
  sections: string[];
  design: ZeroDraft['design'];
};

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className={styles.field}>
      <span>{label}</span>
      {children}
    </label>
  );
}
function Icon({
  label,
  children,
  onClick,
  disabled = false,
  pressed,
}: {
  label: string;
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  pressed?: boolean;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      aria-pressed={pressed}
    >
      {children}
    </Button>
  );
}
function DesignChoices({
  draft,
  onChange,
}: {
  draft: ZeroDraft;
  onChange: (design: ZeroDraft['design']) => void;
}) {
  const preview = draft.services.length
    ? draft
    : {
        ...draft,
        client: 'Casa Lume',
        title: 'Presença digital e captação',
        objective:
          'Transformar a procura pelo escritório em conversas qualificadas e novos projetos.',
        months: 6,
        services: [
          {
            id: 'preview-site',
            title: 'Site de captação',
            description: 'Página principal\nFormulário de contato\nVersão para celular',
            quantity: 1,
            unitCents: 480000,
            billing: 'once' as const,
          },
          {
            id: 'preview-growth',
            title: 'Gestão de tráfego',
            description: 'Planejamento de campanhas\nAcompanhamento mensal',
            quantity: 1,
            unitCents: 290000,
            billing: 'monthly' as const,
          },
        ],
      };
  return (
    <div
      className={styles.designChoices}
      role="group"
      aria-label="Modelos visuais"
    >
      {(
        [
          { key: 'editorial', label: 'Editorial' },
          { key: 'contrast', label: 'Estúdio' },
          { key: 'compact', label: 'Executiva' },
        ] as const
      ).map((design) => (
        <div key={design.key} className={styles.designOption}>
          <div className={styles.designThumb} aria-hidden="true">
            <iframe
              srcDoc={renderZeroProposal({ ...preview, design: design.key })}
              title={`Modelo ${design.label}`}
              sandbox="allow-same-origin"
              tabIndex={-1}
              inert
              loading="lazy"
            />
          </div>
          <button
            type="button"
            aria-pressed={draft.design === design.key}
            onClick={() => onChange(design.key)}
          >
            <span>{design.label}</span>
            {draft.design === design.key && (
              <Check
                className={styles.selectedDesign}
                size={18}
                aria-hidden="true"
              />
            )}
          </button>
        </div>
      ))}
    </div>
  );
}
async function json<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, options);
  const result = await response.json();
  if (!response.ok)
    throw new Error(
      result &&
        typeof result === 'object' &&
        'error' in result &&
        typeof result.error === 'string'
        ? result.error
        : 'Não foi possível concluir.',
    );
  return result as T;
}
function download(content: string, name: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function ZeroLab({
  profile,
  onDirtyChange,
}: {
  profile: AgentProfile;
  onDirtyChange: (dirty: boolean) => void;
}) {
  const [draft, setDraft] = useState<ZeroDraft>(() =>
    emptyZeroDraft(profile.businessName),
  );
  const [saved, setSaved] = useState('');
  const [id, setId] = useState(() => crypto.randomUUID());
  const [revision, setRevision] = useState(0);
  const [details, setDetails] = useState(false);
  const [composition, setComposition] = useState<ZeroComposition | null>(null);
  const [needsCompose, setNeedsCompose] = useState(false);
  const [tab, setTab] = useState<'brief' | 'scope' | 'terms' | 'design'>(
    'brief',
  );
  const [projects, setProjects] = useState<ZeroSummary[]>([]);
  const [library, setLibrary] = useState(false);
  const [logos, setLogos] = useState<Array<{ url: string; name: string }>>([]);
  const [photos, setPhotos] = useState<VisualAsset[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [mobile, setMobile] = useState(false);
  const [pane, setPane] = useState<'edit' | 'preview'>('edit');
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
    if (!expanded) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setExpanded(false);
    };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [expanded]);
  const [origin, setOrigin] = useState('');
  const [suggested, setSuggested] = useState<ReturnType<
    typeof readZeroBrief
  > | null>(null);
  const [reference, setReference] = useState<ZeroReferenceHint | null>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const file = useRef<HTMLInputElement>(null);
  const briefFile = useRef<HTMLInputElement>(null);
  const imageFile = useRef<HTMLInputElement>(null);
  const gate = useRef(false);
  const touched = useRef(false);
  const designChosen = useRef(false);
  const composedCommercial = useRef('');
  const draftText = JSON.stringify(draft);
  const dirty = touched.current && draftText !== saved;
  const totals = zeroTotals(draft);
  // Typing a brief must not replace the canvas with an empty, generic proposal.
  // A commercial document only appears after the local composer has found content.
  const hasUserProposal = !!(
    draft.services.length ||
    (draft.client && draft.title !== 'Proposta comercial')
  );
  const missing = [
    ...zeroReadiness(draft),
    ...(needsCompose ? ['Pedido ainda não aplicado'] : []),
  ];
  const html = useMemo(
    () =>
      hasUserProposal
        ? renderZeroProposal(draft, origin)
        : renderZeroEmptyState(profile.businessName),
    [draft, hasUserProposal, origin, profile.businessName],
  );
  useEffect(() => {
    onDirtyChange(dirty);
  }, [dirty, onDirtyChange]);

  useEffect(() => {
    setOrigin(window.location.origin);
    void json<{ projects: ZeroSummary[] }>('/api/zero')
      .then((r) => setProjects(r.projects))
      .catch((e) => setError(e.message));
    void json<{ assets: VisualAsset[] }>('/api/agent/assets')
      .then((r) => {
        setLogos(r.assets.filter((a) => a.kind === 'logo'));
        setPhotos(r.assets.filter((a) => a.kind !== 'logo'));
      })
      .catch(() => {});
  }, []);
  useEffect(() => {
    if (!touched.current) {
      const next = {
        ...emptyZeroDraft(profile.businessName),
        email: profile.email,
        phone: profile.phone,
      };
      setDraft(next);
      setSaved(JSON.stringify(next));
    }
  }, [profile.businessName, profile.email, profile.phone]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (dirty) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  function change(next: Partial<ZeroDraft>) {
    touched.current = true;
    if (next.design && Object.keys(next).length === 1)
      designChosen.current = true;
    setDraft((d) => ({ ...d, ...next }));
    setNotice('');
    if (
      Object.keys(next).some(
        (key) =>
          ![
            'design',
            'accent',
            'serif',
            'cover',
            'logo',
            'gallery',
            'referenceUrl',
            'referenceSections',
          ].includes(key),
      )
    )
      setComposition(null);
  }
  function commercialSnapshot(value: ZeroDraft) {
    return JSON.stringify({
      client: value.client,
      title: value.title,
      objective: value.objective,
      services: value.services,
      months: value.months,
      validity: value.validity,
      timeline: value.timeline,
      terms: value.terms,
      exclusions: value.exclusions,
      discountPercent: value.discountPercent,
    });
  }
  async function compose() {
    if (
      busy ||
      (!draft.briefing.trim() &&
        !draft.referenceContent.trim() &&
        !draft.referenceUrl.trim())
    )
      return;
    if (
      (draft.services.length || draft.client || draft.objective) &&
      commercialSnapshot(draft) !== composedCommercial.current &&
      !window.confirm(
        'Remontar o conteúdo a partir deste pedido? Os dados e valores atuais serão substituídos. Sua identidade visual e suas imagens serão mantidas.',
      )
    )
      return;
    try {
      setBusy(true);
      let active = draft;
      if (active.referenceUrl.trim() && !active.referenceContent.trim()) {
        const loaded = await fetchReference(active.referenceUrl);
        setReference(loaded);
        active = referenceDraft(active, loaded);
      }
      const result = active.referenceContent.trim()
        ? composeZeroReferenceBrief(
            active.briefing,
            active,
            designChosen.current,
          )
        : composeZeroBrief(active.briefing, active, designChosen.current);
      change(result.draft);
      composedCommercial.current = commercialSnapshot(result.draft);
      setComposition(result);
      setNeedsCompose(false);
      setSuggested(null);
      setError('');
      setNotice(
        'Proposta montada. Confira o conteúdo e os valores antes de enviar.',
      );
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Não foi possível montar a proposta.',
      );
    } finally {
      setBusy(false);
    }
  }
  function editService(serviceId: string, next: Partial<ZeroService>) {
    touched.current = true;
    setComposition(null);
    setDraft((d) => ({
      ...d,
      services: d.services.map((s) =>
        s.id === serviceId ? { ...s, ...next } : s,
      ),
    }));
  }
  function addService(key?: string) {
    if (draft.services.length >= 24) return;
    const item = zeroCatalog.find((s) => s.key === key);
    change({
      services: [
        ...draft.services,
        {
          id: crypto.randomUUID(),
          title: item?.title || 'Novo serviço',
          description: item?.description || '',
          billing: item?.billing || 'once',
          unitCents: null,
          quantity: 1,
        },
      ],
    });
    setTab('scope');
  }
  function move(index: number, direction: number) {
    const services = [...draft.services];
    [services[index], services[index + direction]] = [
      services[index + direction],
      services[index],
    ];
    change({ services });
  }
  function discard() {
    return (
      !dirty ||
      window.confirm('Descartar as alterações não salvas deste rascunho?')
    );
  }
  function newDraft() {
    if (!discard()) return;
    const next = {
      ...emptyZeroDraft(profile.businessName),
      email: profile.email,
      phone: profile.phone,
    };
    setDraft(next);
    setSaved(JSON.stringify(next));
    setId(crypto.randomUUID());
    setRevision(0);
    touched.current = false;
    designChosen.current = false;
    setSuggested(null);
    setReference(null);
    setError('');
    setNotice('');
    setTab('brief');
    setDetails(false);
    setComposition(null);
    setNeedsCompose(false);
    composedCommercial.current = '';
  }
  async function save() {
    if (needsCompose) {
      setError('Monte a proposta com o pedido atualizado antes de salvar.');
      return;
    }
    if (gate.current) return;
    gate.current = true;
    setBusy(true);
    setError('');
    const snapshot = draft;
    try {
      const result = await json<{ project: ZeroSaved }>('/api/zero', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, revision, draft: snapshot }),
      });
      setRevision(result.project.revision);
      setSaved(JSON.stringify(snapshot));
      setProjects((list) =>
        [
          {
            id,
            title: snapshot.title,
            client: snapshot.client,
            revision: result.project.revision,
            updatedAt: result.project.updatedAt,
          },
          ...list.filter((p) => p.id !== id),
        ].slice(0, 100),
      );
      setNotice('Rascunho salvo.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao salvar.');
    } finally {
      gate.current = false;
      setBusy(false);
    }
  }
  async function open(projectId: string) {
    if (gate.current || !discard()) return;
    gate.current = true;
    setBusy(true);
    setError('');
    try {
      const { project } = await json<{ project: ZeroSaved }>(
        '/api/zero?id=' + encodeURIComponent(projectId),
      );
      setDraft(project.draft);
      setSaved(JSON.stringify(project.draft));
      setId(project.id);
      setRevision(project.revision);
      touched.current = true;
      designChosen.current = true;
      setLibrary(false);
      setDetails(!project.draft.briefing);
      setComposition(null);
      setNeedsCompose(false);
      composedCommercial.current = '';
      setSuggested(null);
      setReference(null);
      setNotice('Rascunho aberto.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao abrir.');
    } finally {
      gate.current = false;
      setBusy(false);
    }
  }
  function duplicate() {
    if (needsCompose) {
      setError('Monte a proposta com o pedido atualizado antes de duplicar.');
      return;
    }
    setId(crypto.randomUUID());
    setRevision(0);
    change({ title: draft.title.slice(0, 152) + ' (cópia)', client: '' });
    setSaved('');
    setNotice('Cópia aberta. Revise cliente, escopo e valores.');
    setComposition(null);
    composedCommercial.current = '';
    setDetails(true);
    setTab('brief');
  }
  async function importDraft(selected?: File) {
    if (!selected || !discard()) return;
    try {
      if (selected.size > 1000000)
        throw new Error('Use um arquivo editável de até 1 MB.');
      const next = normalizeZeroDraft(JSON.parse(await selected.text()));
      change(next);
      setId(crypto.randomUUID());
      setRevision(0);
      setSaved('');
      setSuggested(null);
      setReference(null);
      setComposition(null);
      setNeedsCompose(false);
      composedCommercial.current = '';
      setDetails(!next.briefing);
      setNotice('Cópia editável importada.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Arquivo inválido.');
    }
  }
  async function exportHtml() {
    if (missing.length) {
      setError('Preencha: ' + missing.join(', ') + '.');
      return;
    }
    if (gate.current) return;
    gate.current = true;
    setBusy(true);
    setError('');
    try {
      const images: Record<string, string> = {};
      let totalBytes = 0;
      for (const path of zeroImagePaths(draft)) {
        const response = await fetch(path);
        if (!response.ok)
          throw new Error(
            'Uma imagem está indisponível. Escolha outra antes de exportar.',
          );
        const blob = await response.blob();
        if (
          blob.size > 8 * 1024 * 1024 ||
          !['image/png', 'image/jpeg', 'image/webp'].includes(blob.type)
        )
          throw new Error('Imagem inválida.');
        totalBytes += blob.size;
        if (totalBytes > 32 * 1024 * 1024)
          throw new Error(
            'As imagens excedem 32 MB. Use arquivos menores ou menos imagens.',
          );
        images[path] = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      }
      download(
        renderZeroProposal(draft, origin, images[draft.logo] || '', images),
        'proposta-' +
          (draft.client || 'zero')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-zA-Z0-9-]/g, '-')
            .slice(0, 80) +
          '.html',
        'text/html;charset=utf-8',
      );
      setNotice('Proposta exportada.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao exportar.');
    } finally {
      gate.current = false;
      setBusy(false);
    }
  }
  async function uploadPhoto(selected?: File) {
    if (!selected || gate.current) return;
    if (
      !['image/png', 'image/jpeg', 'image/webp'].includes(selected.type) ||
      selected.size > 8 * 1024 * 1024
    ) {
      setError('Use uma imagem JPG, PNG ou WebP de até 8 MB.');
      return;
    }
    gate.current = true;
    setBusy(true);
    setError('');
    try {
      const body = new FormData();
      body.set('file', selected);
      body.set('kind', 'gallery');
      const { asset } = await json<{ asset: VisualAsset }>(
        '/api/agent/assets',
        { method: 'POST', body },
      );
      setPhotos((list) => [asset, ...list]);
      change({ cover: asset.url });
      setNotice('Imagem adicionada à biblioteca e selecionada como capa.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao enviar imagem.');
    } finally {
      gate.current = false;
      setBusy(false);
    }
  }
  async function printProposal() {
    if (gate.current || missing.length) return;
    gate.current = true;
    setBusy(true);
    setError('');
    try {
      const preview = frame.current?.contentWindow;
      if (!preview) throw new Error('A prévia ainda não está pronta.');
      for (const img of Array.from(preview.document.images)) {
        img.loading = 'eager';
        await img.decode();
      }
      preview.focus();
      preview.print();
    } catch {
      setError(
        'Aguarde as imagens da prévia. Se alguma imagem não carregar, escolha outra antes de imprimir.',
      );
    } finally {
      gate.current = false;
      setBusy(false);
    }
  }
  async function fetchReference(url: string): Promise<ZeroReferenceHint> {
    return json('/api/zero/reference', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
  }
  function referenceDraft(current: ZeroDraft, loaded: ZeroReferenceHint) {
    return {
      ...current,
      accent: loaded.colors[0] || current.accent,
      serif: loaded.serif,
      design: loaded.design,
      referenceBrand: loaded.title.split(/[-|]/)[0].trim(),
      referenceContent: loaded.content,
      referenceTemplate: loaded.template,
      referenceStyles: loaded.styles,
      referenceSections: loaded.sections,
    };
  }
  async function readReference() {
    if (gate.current || !draft.referenceUrl.trim()) return;
    gate.current = true;
    setBusy(true);
    setError('');
    try {
      const loaded = await fetchReference(draft.referenceUrl);
      setReference(loaded);
      designChosen.current = true;
      change(referenceDraft(draft, loaded));
      setNeedsCompose(true);
      setNotice(
        `Link conectado. Ao criar, ${loaded.title || 'a proposta'} será usada como base automaticamente.`,
      );
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Não foi possível ler a referência.',
      );
    } finally {
      gate.current = false;
      setBusy(false);
    }
  }
  function demo() {
    if (!discard()) return;
    const next = {
      ...emptyZeroDraft(profile.businessName || 'Fornecedor de demonstração'),
      client: 'Cliente demonstração',
      title: 'Gestão financeira e operação comercial',
      objective:
        'Exemplo fictício para avaliar o novo módulo. Organizar as rotinas financeiras e o acompanhamento comercial em uma proposta única.',
      months: 6,
      validity: '15 dias',
      timeline:
        'Alinhamento inicial: confirmação do escopo, dos responsáveis e dos acessos.\nOrganização: preparação das rotinas financeiras e comerciais definidas no escopo.\nAcompanhamento: início da operação e dos relatórios contratados, em datas a combinar.',
      terms:
        'Condições de pagamento a combinar. Valores e escopo deste exemplo são ilustrativos.',
      exclusions: 'Investimentos em mídia e serviços não descritos no escopo.',
      services: zeroCatalog.slice(0, 2).map((s, i) => ({
        id: crypto.randomUUID(),
        title: s.title,
        description: s.description,
        billing: s.billing,
        quantity: 1,
        unitCents: [280000, 200000][i],
      })),
    } satisfies ZeroDraft;
    change(next);
    designChosen.current = true;
    setNeedsCompose(false);
    composedCommercial.current = '';
    setId(crypto.randomUUID());
    setRevision(0);
    setSaved('');
    setNotice('Exemplo fictício carregado. Nada foi salvo ou publicado.');
  }

  return (
    <div className={styles.zero}>
      <header className={styles.toolbar}>
        <div className={styles.identity}>
          <span className={styles.identityMark}>
            <Zap size={22} />
          </span>
          <div>
            <h1>
              Proposta Zero <small>Sem IA</small>
            </h1>
            <p>
              {revision ? `Rascunho ${revision}` : 'Novo rascunho'} ·{' '}
              {dirty ? 'Alterações não salvas' : 'Sem alterações'}
            </p>
          </div>
        </div>
        <div className={styles.actions}>
          <span className={styles.zeroCost}>
            <Check size={14} /> R$ 0 em IA
          </span>
          <Icon label="Novo rascunho" onClick={newDraft} disabled={busy}>
            <Plus />
          </Icon>
          <Icon
            label="Abrir rascunhos"
            onClick={() => setLibrary(!library)}
            disabled={busy}
          >
            <FolderOpen />
          </Icon>
          <Icon label="Duplicar como base" onClick={duplicate} disabled={busy}>
            <Copy />
          </Icon>
          <Button
            onClick={() => void save()}
            disabled={busy || !draft.title.trim()}
            size="sm"
          >
            <Save /> Salvar
          </Button>
        </div>
      </header>
      <div className={styles.mobileSwitch}>
        <button onClick={() => setPane('edit')} aria-pressed={pane === 'edit'}>
          Conteúdo
        </button>
        <button
          onClick={() => setPane('preview')}
          aria-pressed={pane === 'preview'}
        >
          Proposta
        </button>
      </div>
      {(error || notice) && (
        <div
          className={error ? styles.error : styles.notice}
          role={error ? 'alert' : 'status'}
        >
          {error || notice}
          <button
            title="Fechar aviso"
            aria-label="Fechar aviso"
            onClick={() => {
              setError('');
              setNotice('');
            }}
          >
            <X size={16} />
          </button>
        </div>
      )}
      {library && (
        <section className={styles.library}>
          <div>
            <h2>Rascunhos de teste</h2>
            <Icon label="Fechar rascunhos" onClick={() => setLibrary(false)}>
              <X />
            </Icon>
          </div>
          {!projects.length ? (
            <p>Nenhum rascunho salvo.</p>
          ) : (
            <ul>
              {projects.map((p) => (
                <li key={p.id}>
                  <button disabled={busy} onClick={() => void open(p.id)}>
                    <FileText size={18} />
                    <span>
                      <strong>{p.title}</strong>
                      <small>
                        {p.client || 'Cliente a definir'} ·{' '}
                        {new Date(p.updatedAt).toLocaleDateString('pt-BR')}
                      </small>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
      <div className={styles.workspace}>
        <section className={styles.editor} data-pane={pane}>
          <div
            className={styles.entryMode}
            role="group"
            aria-label="Modo de edição"
          >
            <button onClick={() => setDetails(false)} aria-pressed={!details}>
              <FileText size={16} /> Escrever pedido
            </button>
            <button onClick={() => setDetails(true)} aria-pressed={details}>
              <SlidersHorizontal size={16} /> Editar campos
            </button>
          </div>
          {!details && (
            <fieldset
              className={`${styles.fields} ${styles.composer}`}
              disabled={busy}
            >
              <div className={styles.sectionTitle}>
                <h2>
                  {draft.referenceContent.trim()
                    ? 'O que muda nesta proposta?'
                    : 'Conte o que foi combinado.'}
                </h2>
                <PenLine size={20} aria-hidden="true" />
              </div>
              <div className={styles.promptBox}>
                <textarea
                  aria-label="Pedido da proposta"
                  rows={8}
                  maxLength={60000}
                  placeholder={
                    draft.referenceContent.trim()
                      ? 'Ex.: Troque o cliente para Clínica Aurora. Site por R$ 4.000, pagamento único. A gestão de tráfego será R$ 2.500 por mês durante 6 meses. Mantenha o restante.'
                      : 'Ex.: Proposta para Clínica Aurora. Site com página de serviços e formulário por R$ 4.000, pagamento único. Gestão de tráfego por R$ 2.500 por mês durante 6 meses. Objetivo: aumentar os agendamentos. Não inclui verba de anúncios.'
                  }
                  value={draft.briefing}
                  onChange={(e) => {
                    change({ briefing: e.target.value });
                    setComposition(null);
                    setNeedsCompose(true);
                  }}
                />
                <div className={styles.composeAction}>
                  <Icon
                    label="Importar pedido TXT ou MD"
                    onClick={() => briefFile.current?.click()}
                  >
                    <Upload size={18} />
                  </Icon>
                  <span title="Caracteres do pedido">
                    {draft.briefing.length.toLocaleString('pt-BR')} / 60.000
                  </span>
                  <Button
                    className={styles.composeButton}
                    onClick={() => void compose()}
                  disabled={
                    !draft.briefing.trim() &&
                    !draft.referenceContent.trim() &&
                    !draft.referenceUrl.trim()
                  }
                >
                    {(draft.referenceContent.trim() || draft.referenceUrl.trim()) &&
                    !draft.services.length
                      ? 'Criar usando o link'
                      : draft.services.length
                      ? 'Refazer proposta'
                      : 'Criar proposta'}
                    <ArrowUp size={16} />
                  </Button>
                </div>
              </div>
              <div className={styles.referenceInline}>
                <Link2 size={16} aria-hidden="true" />
                <Input
                  aria-label="Link de referência visual"
                  type="url"
                  maxLength={4096}
                  value={draft.referenceUrl}
                  onChange={(e) => {
                    change({
                      referenceUrl: e.target.value,
                      referenceBrand: '',
                      referenceContent: '',
                      referenceTemplate: '',
                      referenceStyles: '',
                      referenceSections: [],
                    });
                    setReference(null);
                  }}
                  placeholder="Cole o link da proposta base. Ele será aplicado automaticamente ao criar."
                />
                <Icon
                  label="Ler referência visual"
                  onClick={() => void readReference()}
                  disabled={!draft.referenceUrl.trim()}
                >
                  <Palette size={17} />
                </Icon>
              </div>
              {reference && (
                <div className={styles.referenceSummary}>
                  <div>
                    <strong>{reference.title || 'Referência visual lida'}</strong>
                    <span>
                      {reference.sections.length
                        ? reference.sections.slice(0, 4).join(' · ')
                        : 'Cores, tipografia e composição disponíveis'}
                    </span>
                  </div>
                </div>
              )}
              {needsCompose && (
                <p className={styles.pendingBrief} role="status">
                  Texto alterado. Gere novamente para atualizar a proposta.
                </p>
              )}
              <section className={styles.quickDesign}>
                <div className={styles.sectionTitle}>
                  <h3>Modelo visual</h3>
                  <Icon
                    label="Personalizar visual"
                    onClick={() => {
                      setDetails(true);
                      setTab('design');
                    }}
                  >
                    <Palette size={17} />
                  </Icon>
                </div>
                <DesignChoices
                  draft={draft}
                  onChange={(design) => change({ design })}
                />
              </section>
              {(draft.client || draft.services.length > 0) && (
                <section
                  className={styles.composedSummary}
                  aria-label="Resumo da proposta"
                >
                  <span className={styles.summaryLabel}>Prévia do escopo</span>
                  <h3>{draft.client || 'Cliente a definir'}</h3>
                  <ul>
                    {draft.services.map((service) => (
                      <li key={service.id}>
                        <span>{service.title}</span>
                        <strong>
                          {service.unitCents === null
                            ? 'A definir'
                            : zeroMoney(service.unitCents * service.quantity)}
                          {service.billing === 'monthly' ? ' / mês' : ''}
                        </strong>
                      </li>
                    ))}
                  </ul>
                  {(draft.months > 0 || draft.validity) && (
                    <p>
                      {draft.months > 0 ? `${draft.months} meses` : ''}
                      {draft.months > 0 && draft.validity ? ' · ' : ''}
                      {draft.validity ? `Validade: ${draft.validity}` : ''}
                    </p>
                  )}
                </section>
              )}
              {composition && (
                <div className={styles.composeReview} aria-live="polite">
                  {composition.warnings.length > 0 && (
                    <>
                      <h3>Revise estes pontos</h3>
                      <ul>
                        {composition.warnings.map((warning) => (
                          <li key={warning}>{warning}</li>
                        ))}
                      </ul>
                    </>
                  )}
                  {composition.unresolved.length > 0 && (
                    <details open>
                      <summary>
                        {composition.unresolved.length} trecho(s) ainda não
                        viraram item de escopo
                      </summary>
                      <ul>
                        {composition.unresolved.map((part, index) => (
                          <li key={index}>{part}</li>
                        ))}
                      </ul>
                    </details>
                  )}
                </div>
              )}
              <Button
                className={styles.mobilePreview}
                variant="outline"
                onClick={() => setPane('preview')}
                disabled={!draft.services.length}
              >
                <Monitor size={16} /> Ver proposta
              </Button>
            </fieldset>
          )}
          {details && (
            <>
              <nav className={styles.tabs} aria-label="Dados da proposta">
                {(
                  [
                    { key: 'brief', label: 'Briefing' },
                    { key: 'scope', label: 'Serviços' },
                    { key: 'terms', label: 'Condições' },
                    { key: 'design', label: 'Visual' },
                  ] as const
                ).map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setTab(t.key)}
                    aria-pressed={tab === t.key}
                  >
                    {t.label}
                  </button>
                ))}
              </nav>
              <fieldset className={styles.fields} disabled={busy}>
                {tab === 'brief' && (
                  <>
                    <div className={styles.sectionTitle}>
                      <h2>Dados da proposta</h2>
                      <Button variant="ghost" size="sm" onClick={demo}>
                        <LayoutTemplate /> Exemplo
                      </Button>
                    </div>
                    <Field label="Cliente">
                      <Input
                        maxLength={240}
                        value={draft.client}
                        onChange={(e) => change({ client: e.target.value })}
                      />
                    </Field>
                    <Field label="Título">
                      <Input
                        maxLength={160}
                        value={draft.title}
                        onChange={(e) => change({ title: e.target.value })}
                      />
                    </Field>
                    <Field label="Objetivo">
                      <textarea
                        maxLength={8000}
                        rows={4}
                        value={draft.objective}
                        onChange={(e) => change({ objective: e.target.value })}
                      />
                    </Field>
                    <div className={styles.sectionTitle}>
                      <h2>Briefing original</h2>
                      <Icon
                        label="Importar briefing TXT ou MD"
                        onClick={() => briefFile.current?.click()}
                      >
                        <Upload />
                      </Icon>
                    </div>
                    <textarea
                      aria-label="Briefing original"
                      maxLength={60000}
                      rows={7}
                      placeholder={
                        'Cliente:\nProjeto:\nObjetivo:\nPrazo:\nCondições:'
                      }
                      value={draft.briefing}
                      onChange={(e) => {
                        change({ briefing: e.target.value });
                        setSuggested(null);
                      }}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!draft.briefing.trim()}
                      onClick={() =>
                        setSuggested(readZeroBrief(draft.briefing))
                      }
                    >
                      <FileText /> Identificar campos
                    </Button>
                    {suggested?.warnings.map((warning) => (
                      <p key={warning} role="status">
                        {warning}
                      </p>
                    ))}
                    {suggested && (
                      <div className={styles.suggestions}>
                        <h3>Campos identificados</h3>
                        {Object.keys(suggested.fields).length ? (
                          <>
                            <dl>
                              {Object.entries(suggested.fields).map(
                                ([key, value]) => (
                                  <div key={key}>
                                    <dt>
                                      {
                                        {
                                          client: 'Cliente',
                                          title: 'Título',
                                          objective: 'Objetivo',
                                          timeline: 'Prazo',
                                          terms: 'Condições',
                                          exclusions: 'Exclusões',
                                          validity: 'Validade',
                                        }[key]
                                      }
                                    </dt>
                                    <dd>{value}</dd>
                                  </div>
                                ),
                              )}
                            </dl>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                change(suggested.fields);
                                setNeedsCompose(false);
                                setNotice(
                                  'Campos aplicados. Confira os dados e os valores antes de exportar.',
                                );
                              }}
                            >
                              <Check /> Aplicar campos
                            </Button>
                          </>
                        ) : (
                          <p>
                            Nenhum campo rotulado encontrado. O briefing
                            original permanece intacto.
                          </p>
                        )}
                        {!!suggested.suggestions.length && (
                          <>
                            <h3>Serviços relacionados</h3>
                            <div className={styles.catalog}>
                              {suggested.suggestions.map((key) => (
                                <Button
                                  key={key}
                                  variant="outline"
                                  size="sm"
                                  onClick={() => addService(key)}
                                  disabled={draft.services.length >= 24}
                                >
                                  <Plus />
                                  {
                                    zeroCatalog.find((s) => s.key === key)
                                      ?.title
                                  }
                                </Button>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </>
                )}
                {tab === 'scope' && (
                  <>
                    <div className={styles.sectionTitle}>
                      <h2>Serviços e valores</h2>
                      <span>{draft.services.length}/24</span>
                    </div>
                    <details
                      className={styles.catalogDetails}
                      open={!draft.services.length}
                    >
                      <summary>Catálogo de escopos</summary>
                      <div className={styles.catalog}>
                        {zeroCatalog.map((item) => (
                          <button
                            key={item.key}
                            onClick={() => addService(item.key)}
                            disabled={draft.services.length >= 24}
                          >
                            <Plus size={16} />
                            {item.title}
                          </button>
                        ))}
                      </div>
                    </details>
                    {draft.services.map((s, i) => (
                      <article key={s.id} className={styles.service}>
                        <div className={styles.serviceHead}>
                          <strong>{String(i + 1).padStart(2, '0')}</strong>
                          <div>
                            <Icon
                              label="Mover serviço para cima"
                              onClick={() => move(i, -1)}
                              disabled={i === 0}
                            >
                              <ArrowUp />
                            </Icon>
                            <Icon
                              label="Mover serviço para baixo"
                              onClick={() => move(i, 1)}
                              disabled={i === draft.services.length - 1}
                            >
                              <ArrowDown />
                            </Icon>
                            <Icon
                              label="Remover serviço"
                              onClick={() =>
                                change({
                                  services: draft.services.filter(
                                    (item) => item.id !== s.id,
                                  ),
                                })
                              }
                            >
                              <Trash2 />
                            </Icon>
                          </div>
                        </div>
                        <Field label="Serviço">
                          <Input
                            maxLength={160}
                            value={s.title}
                            onChange={(e) =>
                              editService(s.id, { title: e.target.value })
                            }
                          />
                        </Field>
                        <Field label="Entregáveis">
                          <textarea
                            maxLength={4000}
                            rows={4}
                            value={s.description}
                            onChange={(e) =>
                              editService(s.id, { description: e.target.value })
                            }
                          />
                        </Field>
                        <div className={styles.priceFields}>
                          <Field label="Quantidade">
                            <Input
                              type="number"
                              min={1}
                              max={10000}
                              step={1}
                              value={s.quantity}
                              onChange={(e) =>
                                editService(s.id, {
                                  quantity: Math.max(
                                    1,
                                    Math.min(
                                      10000,
                                      Math.floor(Number(e.target.value) || 1),
                                    ),
                                  ),
                                })
                              }
                            />
                          </Field>
                          <Field label="Valor unitário (R$)">
                            <Input
                              type="number"
                              min={0}
                              max={1000000}
                              step="0.01"
                              value={
                                s.unitCents === null ? '' : s.unitCents / 100
                              }
                              placeholder="A definir"
                              onChange={(e) =>
                                editService(s.id, {
                                  unitCents:
                                    e.target.value === ''
                                      ? null
                                      : Math.max(
                                          0,
                                          Math.min(
                                            100000000,
                                            Math.round(
                                              (Number(e.target.value) || 0) *
                                                100,
                                            ),
                                          ),
                                        ),
                                })
                              }
                            />
                          </Field>
                        </div>
                        <Field label="Cobrança">
                          <select
                            value={s.billing}
                            onChange={(e) =>
                              editService(s.id, {
                                billing: e.target
                                  .value as ZeroService['billing'],
                              })
                            }
                          >
                            <option value="monthly">Mensal</option>
                            <option value="once">Pagamento único</option>
                          </select>
                        </Field>
                      </article>
                    ))}
                    <Button
                      variant="outline"
                      onClick={() => addService()}
                      disabled={draft.services.length >= 24}
                    >
                      <Plus /> Serviço personalizado
                    </Button>
                  </>
                )}
                {tab === 'terms' && (
                  <>
                    <h2>Condições comerciais</h2>
                    <div className={styles.priceFields}>
                      <Field label="Vigência (meses)">
                        <Input
                          type="number"
                          min={0}
                          max={120}
                          value={draft.months || ''}
                          placeholder="A definir"
                          onChange={(e) =>
                            change({
                              months: Math.min(
                                120,
                                Math.max(
                                  0,
                                  Math.floor(Number(e.target.value) || 0),
                                ),
                              ),
                            })
                          }
                        />
                      </Field>
                      <Field label="Desconto (%)">
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          step="0.01"
                          value={draft.discountPercent}
                          onChange={(e) =>
                            change({
                              discountPercent: Math.min(
                                100,
                                Math.max(0, Number(e.target.value) || 0),
                              ),
                            })
                          }
                        />
                      </Field>
                    </div>
                    <Field label="Validade da proposta">
                      <Input
                        maxLength={160}
                        value={draft.validity}
                        placeholder="Ex.: 15 dias"
                        onChange={(e) => change({ validity: e.target.value })}
                      />
                    </Field>
                    <Field label="Cronograma">
                      <textarea
                        rows={4}
                        maxLength={4000}
                        value={draft.timeline}
                        onChange={(e) => change({ timeline: e.target.value })}
                      />
                    </Field>
                    <Field label="Pagamento e demais condições">
                      <textarea
                        rows={5}
                        maxLength={6000}
                        value={draft.terms}
                        onChange={(e) => change({ terms: e.target.value })}
                      />
                    </Field>
                    <Field label="Fora do escopo">
                      <textarea
                        rows={4}
                        maxLength={4000}
                        value={draft.exclusions}
                        onChange={(e) => change({ exclusions: e.target.value })}
                      />
                    </Field>
                  </>
                )}
                {tab === 'design' && (
                  <>
                    <h2>Identidade e visual</h2>
                    <Field label="Fornecedor">
                      <Input
                        maxLength={240}
                        value={draft.supplier}
                        onChange={(e) => change({ supplier: e.target.value })}
                      />
                    </Field>
                    <Field label="E-mail">
                      <Input
                        maxLength={240}
                        value={draft.email}
                        onChange={(e) => change({ email: e.target.value })}
                      />
                    </Field>
                    <Field label="Telefone">
                      <Input
                        maxLength={240}
                        value={draft.phone}
                        onChange={(e) => change({ phone: e.target.value })}
                      />
                    </Field>
                    <Field label="Logo da biblioteca">
                      <select
                        value={draft.logo}
                        onChange={(e) => change({ logo: e.target.value })}
                      >
                        <option value="">Somente nome do fornecedor</option>
                        {logos.map((l) => (
                          <option key={l.url} value={l.url}>
                            {l.name}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <DesignChoices
                      draft={draft}
                      onChange={(design) => change({ design })}
                    />
                    <div className={styles.sectionTitle}>
                      <h2>Imagem de capa</h2>
                      <Icon
                        label="Enviar imagem"
                        onClick={() => imageFile.current?.click()}
                      >
                        <Upload />
                      </Icon>
                    </div>
                    <div className={styles.coverChoices}>
                      <button
                        type="button"
                        aria-pressed={draft.cover === 'auto'}
                        onClick={() => change({ cover: 'auto' })}
                      >
                        <img
                          src={zeroCover({ ...draft, cover: 'auto' })}
                          alt=""
                        />
                        <span>Automática</span>
                      </button>
                      {zeroCovers.map((cover) => (
                        <button
                          type="button"
                          key={cover.url}
                          aria-pressed={draft.cover === cover.url}
                          onClick={() => change({ cover: cover.url })}
                        >
                          <img src={cover.url} alt={cover.alt} loading="lazy" />
                          <span>{cover.name}</span>
                        </button>
                      ))}
                    </div>
                    {!!photos.length && (
                      <Field label="Capa da sua biblioteca">
                        <select
                          value={
                            draft.cover.startsWith('/api/assets/')
                              ? draft.cover
                              : ''
                          }
                          onChange={(e) =>
                            change({ cover: e.target.value || 'auto' })
                          }
                        >
                          <option value="">Imagens da biblioteca</option>
                          {photos.map((photo) => (
                            <option key={photo.url} value={photo.url}>
                              {photo.name}
                            </option>
                          ))}
                        </select>
                      </Field>
                    )}
                    <div className={styles.sectionTitle}>
                      <h2>Imagens do projeto</h2>
                      <span>{draft.gallery.length}/6</span>
                    </div>
                    {!!photos.length && (
                      <div className={styles.photoChoices}>
                        {photos.map((photo) => {
                          const selected = draft.gallery.some(
                            (item) => item.url === photo.url,
                          );
                          return (
                            <label key={photo.url}>
                              <img
                                src={photo.url}
                                alt={photo.name}
                                loading="lazy"
                              />
                              <span>
                                <input
                                  type="checkbox"
                                  checked={selected}
                                  disabled={
                                    !selected && draft.gallery.length >= 6
                                  }
                                  onChange={() =>
                                    change({
                                      gallery: selected
                                        ? draft.gallery.filter(
                                            (item) => item.url !== photo.url,
                                          )
                                        : [
                                            ...draft.gallery,
                                            {
                                              url: photo.url,
                                              caption: photo.caption || '',
                                            },
                                          ],
                                    })
                                  }
                                />
                                {photo.name}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                    {!photos.length && (
                      <Button
                        variant="outline"
                        onClick={() => imageFile.current?.click()}
                      >
                        <Upload /> Adicionar imagem
                      </Button>
                    )}
                    {draft.gallery.map((photo, index) => (
                      <Field
                        key={photo.url}
                        label={`Legenda da imagem ${index + 1}`}
                      >
                        <Input
                          value={photo.caption}
                          maxLength={240}
                          onChange={(e) =>
                            change({
                              gallery: draft.gallery.map((item, i) =>
                                i === index
                                  ? { ...item, caption: e.target.value }
                                  : item,
                              ),
                            })
                          }
                        />
                      </Field>
                    ))}
                    <div className={styles.colorRow}>
                      <Field label="Cor principal">
                        <input
                          type="color"
                          value={draft.accent}
                          onChange={(e) => change({ accent: e.target.value })}
                        />
                      </Field>
                      <Field label="Tipografia">
                        <select
                          value={draft.serif ? 'serif' : 'sans'}
                          onChange={(e) =>
                            change({ serif: e.target.value === 'serif' })
                          }
                        >
                          <option value="serif">Editorial, com serifa</option>
                          <option value="sans">Direta, sem serifa</option>
                        </select>
                      </Field>
                    </div>
                    <h2>Referência visual</h2>
                    <Field label="Link público">
                      <Input
                        type="url"
                        maxLength={4096}
                        value={draft.referenceUrl}
                        onChange={(e) => {
                          change({ referenceUrl: e.target.value });
                          setReference(null);
                        }}
                        placeholder="https://"
                      />
                    </Field>
                    <Button
                      variant="outline"
                      onClick={() => void readReference()}
                      disabled={!draft.referenceUrl.trim()}
                    >
                      <Palette /> Conectar proposta base
                    </Button>
                    {reference && (
                      <div className={styles.suggestions}>
                        <h3>{reference.title || 'Referência lida'}</h3>
                        {reference.sections.length > 0 && (
                          <p>{reference.sections.slice(0, 6).join(' · ')}</p>
                        )}
                        <div className={styles.swatches}>
                          {reference.colors.map((color) => (
                            <button
                              key={color}
                              type="button"
                              style={{ background: color }}
                              title={'Usar ' + color}
                              aria-label={'Usar cor ' + color}
                              onClick={() => change({ accent: color })}
                            />
                          ))}
                        </div>
                        {!reference.colors.length && (
                          <p>Nenhuma cor compatível foi encontrada.</p>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => change({ serif: reference.serif })}
                        >
                          Usar tipografia{' '}
                          {reference.serif ? 'com serifa' : 'sem serifa'}
                        </Button>
                        <p>
                          Esta referência já será aplicada como base ao criar a proposta.
                        </p>
                      </div>
                    )}
                  </>
                )}
              </fieldset>
            </>
          )}
          {draft.services.length > 0 && (
            <footer className={styles.editorFooter}>
              <span>
                <strong>{zeroMoney(totals.monthly)}</strong>/mês
              </span>
              <span>
                <strong>{zeroMoney(totals.once)}</strong> único
              </span>
              {totals.pending && <small>Há valores a definir</small>}
            </footer>
          )}
        </section>
        <section
          className={`${styles.preview} ${expanded ? styles.expanded : ''}`}
          data-pane={pane}
        >
          <div className={styles.previewToolbar}>
            <span className={styles.previewLabel}>
              {hasUserProposal ? 'Prévia da proposta' : 'Exemplo visual'}
            </span>
            <div className={styles.devices}>
              <Icon
                label="Prévia para computador"
                onClick={() => setMobile(false)}
                pressed={!mobile}
              >
                <Monitor />
              </Icon>
              <Icon
                label="Prévia para celular"
                onClick={() => setMobile(true)}
                pressed={mobile}
              >
                <Smartphone />
              </Icon>
            </div>
            <div className={styles.previewActions}>
              <Icon
                label={
                  expanded ? 'Sair da tela cheia' : 'Ver proposta em tela cheia'
                }
                onClick={() => setExpanded(!expanded)}
                pressed={expanded}
              >
                {expanded ? <Minimize2 /> : <Maximize2 />}
              </Icon>
              <Icon
                label="Importar cópia editável"
                onClick={() => file.current?.click()}
                disabled={busy}
              >
                <Upload />
              </Icon>
              <Icon
                label="Baixar cópia editável"
                onClick={() =>
                  download(
                    JSON.stringify(draft, null, 2),
                    'proposta-zero.json',
                    'application/json',
                  )
                }
              >
                <FileText />
              </Icon>
              <Icon
                label="Imprimir ou salvar PDF"
                disabled={!!missing.length || busy}
                onClick={() => void printProposal()}
              >
                <Printer />
              </Icon>
              <Icon
                label="Baixar proposta HTML"
                disabled={!!missing.length || busy}
                onClick={() => void exportHtml()}
              >
                <Download />
              </Icon>
            </div>
          </div>
          <div className={styles.canvas} data-mobile={mobile}>
            <iframe
              ref={frame}
              srcDoc={html}
              title="Proposta Zero"
              sandbox="allow-same-origin allow-modals allow-popups allow-popups-to-escape-sandbox"
              referrerPolicy="no-referrer"
            />
          </div>
          <footer className={styles.previewFooter}>
            {!hasUserProposal ? (
              <span>Exemplo visual do Proposta Zero</span>
            ) : missing.length ? (
              <span>Pendente: {missing.join(' · ')}</span>
            ) : (
              <span>
                <Check size={14} /> Pronta para revisão e exportação
              </span>
            )}
            <span>
              {busy ? (
                <>
                  <Loader2 size={14} className={styles.spin} /> Processando
                </>
              ) : (
                'Nenhuma chamada de IA'
              )}
            </span>
          </footer>
        </section>
      </div>
      <input
        ref={imageFile}
        hidden
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={(e) => {
          void uploadPhoto(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
      <input
        ref={file}
        hidden
        type="file"
        accept=".json,application/json"
        onChange={(e) => {
          void importDraft(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
      <input
        ref={briefFile}
        hidden
        type="file"
        accept=".txt,.md,text/plain,text/markdown"
        onChange={async (e) => {
          const selected = e.target.files?.[0];
          e.target.value = '';
          if (!selected) return;
          if (selected.size > 240000) {
            setError('Envie um briefing de até 60.000 caracteres.');
            return;
          }
          const text = await selected.text();
          if (text.length > 60000) {
            setError('O briefing excede 60.000 caracteres.');
            return;
          }
          change({ briefing: text });
          setSuggested(readZeroBrief(text));
          setComposition(null);
          setNeedsCompose(true);
          setDetails(false);
        }}
      />
    </div>
  );
}
