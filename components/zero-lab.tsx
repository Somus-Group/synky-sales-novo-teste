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
  Loader2,
  Monitor,
  Palette,
  Plus,
  Printer,
  Save,
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
  renderZeroProposal,
  zeroCatalog,
  zeroMoney,
  zeroReadiness,
  zeroTotals,
  type ZeroDraft,
  type ZeroSaved,
  type ZeroService,
  type ZeroSummary,
} from '@/lib/zero-proposal';
import type { AgentProfile } from './somus-app';
import styles from './zero-lab.module.css';

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
}: {
  label: string;
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
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
    >
      {children}
    </Button>
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
  const [tab, setTab] = useState<'brief' | 'scope' | 'terms' | 'design'>(
    'brief',
  );
  const [projects, setProjects] = useState<ZeroSummary[]>([]);
  const [library, setLibrary] = useState(false);
  const [logos, setLogos] = useState<Array<{ url: string; name: string }>>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [mobile, setMobile] = useState(false);
  const [pane, setPane] = useState<'edit' | 'preview'>('edit');
  const [origin, setOrigin] = useState('');
  const [suggested, setSuggested] = useState<ReturnType<
    typeof readZeroBrief
  > | null>(null);
  const [reference, setReference] = useState<{
    title: string;
    colors: string[];
    serif: boolean;
  } | null>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const file = useRef<HTMLInputElement>(null);
  const briefFile = useRef<HTMLInputElement>(null);
  const gate = useRef(false);
  const touched = useRef(false);
  const draftText = JSON.stringify(draft);
  const dirty = touched.current && draftText !== saved;
  const totals = zeroTotals(draft);
  const missing = zeroReadiness(draft);
  const html = useMemo(
    () => renderZeroProposal(draft, origin),
    [draft, origin],
  );
  useEffect(() => {
    onDirtyChange(dirty);
  }, [dirty, onDirtyChange]);

  useEffect(() => {
    setOrigin(window.location.origin);
    void json<{ projects: ZeroSummary[] }>('/api/zero')
      .then((r) => setProjects(r.projects))
      .catch((e) => setError(e.message));
    void json<{ assets: Array<{ kind: string; url: string; name: string }> }>(
      '/api/agent/assets',
    )
      .then((r) => setLogos(r.assets.filter((a) => a.kind === 'logo')))
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
    setDraft((d) => ({ ...d, ...next }));
    setNotice('');
  }
  function editService(serviceId: string, next: Partial<ZeroService>) {
    touched.current = true;
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
    setSuggested(null);
    setReference(null);
    setError('');
    setNotice('');
    setTab('brief');
  }
  async function save() {
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
      setLibrary(false);
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
    setId(crypto.randomUUID());
    setRevision(0);
    change({ title: draft.title.slice(0, 152) + ' (cópia)', client: '' });
    setSaved('');
    setNotice('Cópia aberta. Revise cliente, escopo e valores.');
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
      let logo = '';
      if (draft.logo) {
        const response = await fetch(draft.logo);
        if (!response.ok)
          throw new Error(
            'A logo está indisponível. Remova-a ou escolha outra antes de exportar.',
          );
        const blob = await response.blob();
        if (
          blob.size > 8 * 1024 * 1024 ||
          !['image/png', 'image/jpeg', 'image/webp'].includes(blob.type)
        )
          throw new Error('Logo inválida.');
        logo = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      }
      download(
        renderZeroProposal(draft, origin, logo),
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
  async function readReference() {
    if (gate.current || !draft.referenceUrl.trim()) return;
    gate.current = true;
    setBusy(true);
    setError('');
    try {
      setReference(
        await json('/api/zero/reference', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: draft.referenceUrl }),
        }),
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
        'Início a combinar após aprovação do escopo e disponibilização dos acessos.',
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
    setId(crypto.randomUUID());
    setRevision(0);
    setSaved('');
    setNotice('Exemplo fictício carregado. Nada foi salvo ou publicado.');
  }

  return (
    <div className={styles.zero}>
      <header className={styles.toolbar}>
        <div className={styles.identity}>
          <Zap size={22} />
          <div>
            <h1>
              Proposta Zero <small>Teste</small>
            </h1>
            <p>
              {revision ? `Rascunho ${revision}` : 'Novo rascunho'} ·{' '}
              {dirty ? 'Alterações não salvas' : 'Sem alterações'}
            </p>
          </div>
        </div>
        <div className={styles.actions}>
          <span className={styles.zeroCost}>R$ 0 em IA</span>
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
                  maxLength={24000}
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
                  onClick={() => setSuggested(readZeroBrief(draft.briefing))}
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
                        Nenhum campo rotulado encontrado. O briefing original
                        permanece intacto.
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
                              {zeroCatalog.find((s) => s.key === key)?.title}
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
                          value={s.unitCents === null ? '' : s.unitCents / 100}
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
                                          (Number(e.target.value) || 0) * 100,
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
                            billing: e.target.value as ZeroService['billing'],
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
                <h2>Identidade e composição</h2>
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
                <div className={styles.designChoices} aria-label="Composição">
                  {(
                    [
                      { key: 'editorial', label: 'Editorial' },
                      { key: 'contrast', label: 'Contraste' },
                      { key: 'compact', label: 'Objetiva' },
                    ] as const
                  ).map((d) => (
                    <button
                      key={d.key}
                      aria-pressed={draft.design === d.key}
                      onClick={() => change({ design: d.key })}
                    >
                      <LayoutTemplate size={20} />
                      {d.label}
                    </button>
                  ))}
                </div>
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
                  <Palette /> Ler cores e tipografia
                </Button>
                {reference && (
                  <div className={styles.suggestions}>
                    <h3>{reference.title || 'Referência lida'}</h3>
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
                  </div>
                )}
              </>
            )}
          </fieldset>
          <footer className={styles.editorFooter}>
            <span>
              <strong>{zeroMoney(totals.monthly)}</strong>/mês
            </span>
            <span>
              <strong>{zeroMoney(totals.once)}</strong> único
            </span>
            {totals.pending && <small>Há valores a definir</small>}
          </footer>
        </section>
        <section className={styles.preview} data-pane={pane}>
          <div className={styles.previewToolbar}>
            <div className={styles.devices}>
              <Icon
                label="Prévia para computador"
                onClick={() => setMobile(false)}
              >
                <Monitor />
              </Icon>
              <Icon label="Prévia para celular" onClick={() => setMobile(true)}>
                <Smartphone />
              </Icon>
            </div>
            <span>Prévia privada · Sem IA</span>
            <div>
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
                onClick={() => {
                  frame.current?.contentWindow?.focus();
                  frame.current?.contentWindow?.print();
                }}
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
              sandbox="allow-same-origin allow-modals"
              referrerPolicy="no-referrer"
            />
          </div>
          <footer className={styles.previewFooter}>
            {missing.length ? (
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
          if (selected.size > 96000) {
            setError('Envie um briefing de até 24.000 caracteres.');
            return;
          }
          const text = await selected.text();
          if (text.length > 24000) {
            setError('O briefing excede 24.000 caracteres.');
            return;
          }
          change({ briefing: text });
          setSuggested(readZeroBrief(text));
        }}
      />
    </div>
  );
}
