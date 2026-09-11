'use client';

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Check,
  CheckCheck,
  ChevronDown,
  ExternalLink,
  FileText,
  FlaskConical,
  FolderOpen,
  History,
  Link2,
  Loader2,
  Maximize2,
  MessageSquare,
  Minimize2,
  Monitor,
  Paperclip,
  Plus,
  RotateCcw,
  Smartphone,
  Sparkles,
  Square,
  Tablet,
  X,
} from 'lucide-react';
import {
  studioPreviewDocument,
  type StudioMode,
  type StudioProject,
  type StudioSummary,
  type StudioVersion,
} from '@/lib/studio';
import styles from './studio-lab.module.css';

type ProjectResponse = { project: StudioProject; versions: StudioVersion[] };
async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, options);
  let body: T & { error?: string };
  try {
    body = (await response.json()) as T & { error?: string };
  } catch {
    throw new Error('A conexão falhou. Tente novamente.');
  }
  if (!response.ok) throw new Error(body.error || 'Não foi possível concluir.');
  return body;
}
const updated = (timestamp: number) =>
  new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(timestamp);

export function StudioLab() {
  const [projects, setProjects] = useState<StudioSummary[]>([]);
  const [project, setProject] = useState<StudioProject | null>(null);
  const [versions, setVersions] = useState<StudioVersion[]>([]);
  const [aiReady, setAiReady] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [library, setLibrary] = useState(false);
  const [mode, setMode] = useState<StudioMode>('briefing');
  const [title, setTitle] = useState('');
  const [briefing, setBriefing] = useState('');
  const [reference, setReference] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [prompt, setPrompt] = useState('');
  const [pendingPrompt, setPendingPrompt] = useState('');
  const [tab, setTab] = useState<'chat' | 'context' | 'history'>('chat');
  const [mobilePane, setMobilePane] = useState<'chat' | 'preview'>('chat');
  const [device, setDevice] = useState<'desktop' | 'tablet' | 'mobile'>(
    'desktop',
  );
  const [expanded, setExpanded] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);
  const [historical, setHistorical] = useState<{
    html: string;
    title: string;
    revision: number;
  } | null>(null);
  const request = useRef<AbortController | null>(null);
  const messagesEnd = useRef<HTMLDivElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const composer = useRef<HTMLTextAreaElement>(null);
  const opener = useRef<HTMLButtonElement>(null);
  const libraryDialog = useRef<HTMLDialogElement>(null);
  const busyRef = useRef(false);

  async function loadProjects() {
    try {
      const result = await api<{ projects: StudioSummary[]; aiReady: boolean }>(
        '/api/studio',
      );
      setProjects(result.projects);
      setAiReady(result.aiReady);
      setError('');
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Não foi possível carregar os projetos.',
      );
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void loadProjects();
    return () => request.current?.abort();
  }, []);
  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ block: 'end', behavior: 'smooth' });
  }, [project?.messages.length, pendingPrompt]);
  useEffect(() => {
    if (library) libraryDialog.current?.showModal();
    else libraryDialog.current?.close();
  }, [library]);
  useEffect(() => {
    if (!expanded) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setExpanded(false);
    };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [expanded]);

  function accept(result: ProjectResponse) {
    setProject(result.project);
    setVersions(result.versions);
    setHistorical(null);
    setProjects((previous) =>
      [
        result.project,
        ...previous.filter((item) => item.id !== result.project.id),
      ].sort((a, b) => b.updatedAt - a.updatedAt),
    );
  }
  async function openProject(id: string) {
    if (busyRef.current) return;
    setLoading(true);
    setError('');
    try {
      accept(await api<ProjectResponse>(`/api/studio/${id}`));
      setLibrary(false);
      setTab('chat');
      setPrompt('');
      setPendingPrompt('');
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Não foi possível abrir.',
      );
    } finally {
      setLoading(false);
    }
  }
  function newProject() {
    if (busyRef.current) return;
    setProject(null);
    setVersions([]);
    setHistorical(null);
    setPrompt('');
    setError('');
    setTab('chat');
    setMobilePane('chat');
    setLibrary(false);
    setTitle('');
    setBriefing('');
    setReference('');
    setFile(null);
  }
  function choosePrompt(nextPrompt: string) {
    if (busy) return;
    setPrompt(nextPrompt);
    setTab('chat');
    window.setTimeout(() => composer.current?.focus(), 0);
  }
  async function create(event: FormEvent) {
    event.preventDefault();
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError('');
    try {
      const body = new FormData();
      body.set('mode', mode);
      body.set('title', title);
      body.set('briefing', briefing);
      body.set('referenceUrl', reference);
      if (file) body.set('file', file);
      const result = await api<ProjectResponse>('/api/studio', {
        method: 'POST',
        body,
      });
      accept(result);
      setTab('chat');
      setPrompt(
        briefing || file
          ? 'Crie a primeira versão da proposta-site a partir do briefing e das referências deste projeto.'
          : '',
      );
      composer.current?.focus();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Não foi possível criar o projeto.',
      );
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }
  async function send(event: FormEvent) {
    event.preventDefault();
    if (!project || !prompt.trim() || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError('');
    setTab('chat');
    setHistorical(null);
    const text = prompt.trim();
    setPendingPrompt(text);
    setPrompt('');
    request.current = new AbortController();
    try {
      accept(
        await api<ProjectResponse>(`/api/studio/${project.id}/message`, {
          method: 'POST',
          signal: request.current.signal,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: text, revision: project.revision }),
        }),
      );
      setAiReady(true);
    } catch (cause) {
      setPrompt(text);
      setError(
        cause instanceof Error && cause.name === 'AbortError'
          ? 'Pedido interrompido. A última versão salva continua disponível.'
          : cause instanceof Error
            ? cause.message
            : 'Não foi possível concluir.',
      );
    } finally {
      setPendingPrompt('');
      setBusy(false);
      busyRef.current = false;
      request.current = null;
    }
  }
  async function viewVersion(revision: number) {
    if (!project || busyRef.current) return;
    try {
      const result = await api<{ version: NonNullable<typeof historical> }>(
        `/api/studio/${project.id}?version=${revision}`,
      );
      setHistorical(result.version);
      setMobilePane('preview');
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Não foi possível abrir esta versão.',
      );
    }
  }
  async function restore() {
    if (!project || !historical || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError('');
    try {
      accept(
        await api<ProjectResponse>(`/api/studio/${project.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            restore: historical.revision,
            revision: project.revision,
          }),
        }),
      );
      setTab('chat');
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Não foi possível restaurar.',
      );
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  const html = historical?.html ?? project?.html ?? '';
  return (
    <div className={styles.studio}>
      <header className={styles.header}>
        <div className={styles.identity}>
          <span className={styles.studioMark}>
            <FlaskConical size={19} />
          </span>
          <div>
            <h1>
              Estúdio <strong>Lab</strong>
            </h1>
            <span className={styles.experiment}>Experimental</span>
          </div>
        </div>
        <span className={styles.divider} />
        <button
          ref={opener}
          className={styles.projectPicker}
          onClick={() => {
            setLibrary(true);
            void loadProjects();
          }}
          disabled={busy}
        >
          <span>{project?.title || 'Novo projeto'}</span>
          <ChevronDown size={15} />
        </button>
        <div className={styles.headerActions}>
          {project && (
            <span className={styles.saveStatus}>
              <CheckCheck size={14} />
              Salvo
            </span>
          )}
          <button
            className={styles.secondary}
            onClick={newProject}
            disabled={busy}
          >
            <Plus size={16} />
            <span>Novo projeto</span>
          </button>
        </div>
      </header>

      {aiReady === false && (
        <div className={styles.connection}>
          <span className={styles.statusDot} />
          <span>
            A IA ainda não está conectada. Você já pode preparar e salvar seus
            projetos.
          </span>
          <button
            onClick={() => void loadProjects()}
            title="Verificar conexão"
            aria-label="Verificar conexão"
          >
            <RotateCcw size={15} />
          </button>
        </div>
      )}
      <div
        className={styles.mobileTabs}
        role="tablist"
        aria-label="Área do estúdio"
      >
        <button
          role="tab"
          aria-selected={mobilePane === 'chat'}
          onClick={() => setMobilePane('chat')}
        >
          <MessageSquare size={15} />
          Conversa
        </button>
        <button
          role="tab"
          aria-selected={mobilePane === 'preview'}
          onClick={() => setMobilePane('preview')}
        >
          <Monitor size={15} />
          Prévia
        </button>
      </div>

      <div className={styles.workspace} data-pane={mobilePane}>
        <section
          className={styles.conversation}
          aria-label="Conversa e briefing"
        >
          {!project ? (
            <form className={styles.setup} onSubmit={create}>
              <div className={styles.sectionTitle}>
                <span className={styles.eyebrow}>01 · Ponto de partida</span>
                <h2>O que vamos criar?</h2>
                <p>
                  Comece com o contexto certo. O Estúdio organiza a proposta e
                  deixa a conversa cuidar do restante.
                </p>
              </div>
              <div
                className={styles.modeSelector}
                role="group"
                aria-label="Como começar"
              >
                <button
                  type="button"
                  aria-pressed={mode === 'briefing'}
                  onClick={() => setMode('briefing')}
                >
                  <FileText size={17} />
                  <span>
                    <strong>Com briefing</strong>
                    <small>Parta das informações do cliente</small>
                  </span>
                </button>
                <button
                  type="button"
                  aria-pressed={mode === 'free'}
                  onClick={() => setMode('free')}
                >
                  <Sparkles size={17} />
                  <span>
                    <strong>Criação livre</strong>
                    <small>Comece por uma ideia ou direção</small>
                  </span>
                </button>
              </div>
              <div className={styles.formStack}>
                <label className={styles.field}>
                  Nome do projeto
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Proposta para o cliente"
                    maxLength={120}
                  />
                </label>
                <label className={styles.field}>
                  {mode === 'briefing'
                    ? 'Briefing do cliente'
                    : 'Contexto inicial'}
                  {mode === 'free' && (
                    <span className={styles.optional}>Opcional</span>
                  )}
                  <textarea
                    value={briefing}
                    onChange={(e) => setBriefing(e.target.value)}
                    placeholder={
                      mode === 'briefing'
                        ? 'Cole o briefing, o escopo e o que o cliente precisa…'
                        : 'Uma ideia, um serviço, uma direção visual…'
                    }
                    rows={6}
                    maxLength={40000}
                    required={mode === 'briefing' && !file}
                  />
                </label>
              </div>
              <div className={styles.attachmentRow}>
                <input
                  ref={fileInput}
                  type="file"
                  accept=".pdf,.txt,.md"
                  hidden
                  onChange={(e) => {
                    const selected = e.target.files?.[0];
                    if (selected && selected.size > 8 * 1024 * 1024)
                      setError('Envie um arquivo de até 8 MB.');
                    else {
                      setFile(selected || null);
                      setError('');
                    }
                    e.target.value = '';
                  }}
                />
                {file ? (
                  <span className={styles.attachment}>
                    <FileText size={14} />
                    <span>{file.name}</span>
                    <IconButton
                      label="Remover anexo"
                      onClick={() => setFile(null)}
                    >
                      <X size={14} />
                    </IconButton>
                  </span>
                ) : (
                  <button
                    type="button"
                    className={styles.attachButton}
                    onClick={() => fileInput.current?.click()}
                  >
                    <Paperclip size={15} />
                    Anexar briefing
                  </button>
                )}
                <small>PDF, TXT, MD · até 8 MB</small>
              </div>
              <label className={`${styles.field} ${styles.referenceField}`}>
                Proposta de referência
                <span className={styles.optional}>Opcional</span>
                <span className={styles.urlField}>
                  <Link2 size={16} />
                  <input
                    type="url"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    placeholder="https://sua-proposta.com"
                    maxLength={2000}
                  />
                </span>
              </label>
              {error && <ErrorMessage>{error}</ErrorMessage>}
              <button
                type="submit"
                className={styles.primary}
                disabled={busy || loading}
              >
                {busy ? (
                  <Loader2 size={17} className={styles.spin} />
                ) : (
                  <ArrowRight size={17} />
                )}
                Criar workspace
              </button>
              {projects.length > 0 && (
                <button
                  type="button"
                  className={styles.textButton}
                  onClick={() => setLibrary(true)}
                >
                  <FolderOpen size={15} />
                  Continuar um projeto
                </button>
              )}
              {loading && (
                <p className={styles.loading}>
                  <Loader2 size={16} className={styles.spin} />
                  Carregando projetos
                </p>
              )}
            </form>
          ) : (
            <>
              <div
                className={styles.panelTabs}
                role="tablist"
                aria-label="Conteúdo do projeto"
              >
                {(
                  [
                    { id: 'chat', label: 'Editar com IA', icon: MessageSquare },
                    { id: 'context', label: 'Briefing', icon: FileText },
                    { id: 'history', label: 'Versões', icon: History },
                  ] as const
                ).map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    role="tab"
                    aria-selected={tab === id}
                    onClick={() => setTab(id)}
                  >
                    <Icon size={15} />
                    {label}
                  </button>
                ))}
              </div>
              {tab === 'chat' && (
                <div
                  className={styles.messages}
                  role="log"
                  aria-label="Mensagens do projeto"
                >
                  <div className={styles.welcome}>
                    <span className={styles.assistantMark}>
                      <Sparkles size={17} />
                    </span>
                    <h2>
                      {project.html
                        ? 'Seu projeto, em evolução.'
                        : 'Vamos dar forma à proposta.'}
                    </h2>
                    <p>
                      {project.mode === 'briefing'
                        ? 'O briefing está salvo. Qual direção você quer para a primeira versão?'
                        : 'O que você quer criar? Conte sua ideia ou peça a primeira versão.'}
                    </p>
                    <span className={styles.chatPromise}>
                      <CheckCheck size={13} />
                      Cada resposta cria uma versão e atualiza a prévia ao lado.
                    </span>
                    <div className={styles.promptSuggestions}>
                      {(project.html
                        ? [
                            'Deixe o visual mais sofisticado e use mais azul.',
                            'Melhore a seção de investimento e os diferenciais.',
                            'Deixe o texto mais direto e persuasivo.',
                          ]
                        : [
                            'Crie a primeira versão da proposta com base neste projeto.',
                            'Crie uma proposta moderna, elegante e com destaque para o azul.',
                            'Estruture a proposta com contexto, solução e investimento.',
                          ]
                      ).map((suggestion) => (
                        <button
                          key={suggestion}
                          type="button"
                          onClick={() => choosePrompt(suggestion)}
                          disabled={busy || project.busy}
                        >
                          <Sparkles size={13} />
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                  {project.messages.map((message, index) => (
                    <article
                      key={`${message.at}-${index}`}
                      className={
                        message.role === 'user'
                          ? styles.userMessage
                          : styles.assistantMessage
                      }
                    >
                      <span className={styles.messageBy}>
                        {message.role === 'user' ? (
                          'Você'
                        ) : (
                          <>
                            <Sparkles size={13} />
                            Estúdio
                          </>
                        )}
                      </span>
                      <p>{message.text}</p>
                      {message.revision && (
                        <button
                          className={styles.versionChip}
                          onClick={() => void viewVersion(message.revision!)}
                          disabled={busy}
                        >
                          <Check size={13} />
                          Versão {message.revision}
                          <ArrowRight size={13} />
                        </button>
                      )}
                      {!!message.sources?.length && (
                        <div className={styles.sources}>
                          {message.sources.map((url) => (
                            <a
                              key={url}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              Referência consultada
                              <ExternalLink size={12} />
                            </a>
                          ))}
                        </div>
                      )}
                    </article>
                  ))}
                  {pendingPrompt && (
                    <>
                      <article className={styles.userMessage}>
                        <span className={styles.messageBy}>Você</span>
                        <p>{pendingPrompt}</p>
                      </article>
                      <div className={styles.working}>
                        <Loader2 size={16} className={styles.spin} />
                        <span>Criando sua próxima versão…</span>
                      </div>
                    </>
                  )}
                  {project.busy && !busy && (
                    <div className={styles.working}>
                      <Loader2 size={16} className={styles.spin} />
                      <span>Há um pedido em andamento.</span>
                      <button onClick={() => void openProject(project.id)}>
                        Atualizar
                      </button>
                    </div>
                  )}
                  <div ref={messagesEnd} />
                </div>
              )}
              {tab === 'context' && (
                <div className={styles.context}>
                  <span className={styles.eyebrow}>Contexto do projeto</span>
                  <h2>{project.title}</h2>
                  <dl>
                    <dt>Modo de criação</dt>
                    <dd>
                      {project.mode === 'briefing'
                        ? 'Com briefing'
                        : 'Criação livre'}
                    </dd>
                    <dt>Briefing original</dt>
                    <dd className={styles.briefText}>
                      {project.briefing || 'Nenhum texto anexado.'}
                    </dd>
                    {project.fileName && (
                      <>
                        <dt>Arquivo</dt>
                        <dd>
                          <Paperclip size={15} />
                          {project.fileName}
                        </dd>
                      </>
                    )}
                    {project.referenceUrl && (
                      <>
                        <dt>Link de referência</dt>
                        <dd>
                          <a
                            href={project.referenceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {project.referenceUrl}
                          </a>
                        </dd>
                      </>
                    )}
                  </dl>
                  <button
                    className={styles.secondary}
                    onClick={() => {
                      setTab('chat');
                      composer.current?.focus();
                    }}
                  >
                    <MessageSquare size={15} />
                    Complementar na conversa
                  </button>
                </div>
              )}
              {tab === 'history' && (
                <div className={styles.history}>
                  <span className={styles.eyebrow}>Histórico do projeto</span>
                  <h2>
                    {versions.length}{' '}
                    {versions.length === 1 ? 'versão salva' : 'versões salvas'}
                  </h2>
                  {versions.length ? (
                    versions.map((version) => (
                      <button
                        key={version.revision}
                        className={styles.historyItem}
                        onClick={() => void viewVersion(version.revision)}
                        disabled={busy}
                      >
                        <span className={styles.historyNumber}>
                          {version.revision}
                        </span>
                        <span>
                          <strong>
                            Versão {version.revision}
                            {version.revision === project.revision && (
                              <em>Atual</em>
                            )}
                          </strong>
                          <time>{updated(version.createdAt)}</time>
                          <span className={styles.historySummary}>
                            {version.summary}
                          </span>
                        </span>
                        <ArrowRight size={15} />
                      </button>
                    ))
                  ) : (
                    <p className={styles.muted}>
                      A primeira versão aparecerá aqui após a criação.
                    </p>
                  )}
                </div>
              )}
              <form className={styles.composerArea} onSubmit={send}>
                {error && <ErrorMessage>{error}</ErrorMessage>}
                <div className={styles.composer}>
                  <textarea
                    ref={composer}
                    aria-label="Pedido para a proposta"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder={
                      project.html
                        ? 'O que você quer mudar nesta versão?'
                        : 'Descreva a proposta que você quer criar…'
                    }
                    maxLength={8000}
                    rows={3}
                    disabled={busy}
                    onKeyDown={(e) => {
                      if (
                        e.key === 'Enter' &&
                        !e.shiftKey &&
                        !e.nativeEvent.isComposing
                      ) {
                        e.preventDefault();
                        e.currentTarget.form?.requestSubmit();
                      }
                    }}
                  />
                  <div className={styles.composerFooter}>
                      <span>
                        <Sparkles size={13} />
                        {project.html
                          ? `Versão ${project.revision} · enviar para atualizar`
                          : 'Primeira versão · enviar para criar'}
                    </span>
                    {busy ? (
                      <IconButton
                        label="Interromper pedido"
                        onClick={() => request.current?.abort()}
                      >
                        <Square size={15} />
                      </IconButton>
                    ) : (
                      <button
                        type="submit"
                        aria-label="Enviar pedido"
                        title="Enviar pedido"
                        className={styles.send}
                        disabled={!prompt.trim() || project.busy}
                      >
                        <ArrowUp size={18} />
                      </button>
                    )}
                  </div>
                </div>
              </form>
            </>
          )}
        </section>

        <section
          className={`${styles.preview} ${expanded ? styles.expanded : ''}`}
          aria-label="Prévia da proposta"
        >
          <div className={styles.previewToolbar}>
            <span className={styles.previewLabel}>
              <span className={styles.previewDot} />
              {busy ? 'Atualizando prévia…' : 'Prévia'}
              {historical && <small>v{historical.revision}</small>}
            </span>
            <div
              className={styles.deviceControls}
              role="group"
              aria-label="Tamanho da prévia"
            >
              {(
                [
                  { id: 'desktop', label: 'Computador', icon: Monitor },
                  { id: 'tablet', label: 'Tablet', icon: Tablet },
                  { id: 'mobile', label: 'Celular', icon: Smartphone },
                ] as const
              ).map(({ id, label, icon: Icon }) => (
                <IconButton
                  key={id}
                  label={label}
                  pressed={device === id}
                  onClick={() => setDevice(id)}
                >
                  <Icon size={16} />
                </IconButton>
              ))}
            </div>
            <div className={styles.previewActions}>
              <IconButton
                label="Atualizar prévia"
                disabled={!html}
                onClick={() => setPreviewKey((key) => key + 1)}
              >
                <RotateCcw size={15} />
              </IconButton>
              {project?.html && (
                <a
                  href={`/studio/${project.id}`}
                  title="Abrir prévia em outra aba"
                  aria-label="Abrir prévia em outra aba"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink size={15} />
                </a>
              )}
              <IconButton
                label={expanded ? 'Sair da tela cheia' : 'Expandir prévia'}
                onClick={() => setExpanded(!expanded)}
              >
                {expanded ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
              </IconButton>
            </div>
          </div>
          {historical && (
            <div className={styles.restoreBar}>
              <button onClick={() => setHistorical(null)}>
                <ArrowLeft size={14} />
                Versão atual
              </button>
              <button
                disabled={busy || historical.revision === project?.revision}
                onClick={() => void restore()}
              >
                <History size={14} />
                Restaurar v{historical.revision}
              </button>
            </div>
          )}
          <div className={styles.previewStage} data-device={device}>
            {html ? (
              <iframe
                key={`${previewKey}-${historical?.revision ?? project?.revision}`}
                title="Proposta-site"
                sandbox=""
                referrerPolicy="no-referrer"
                srcDoc={studioPreviewDocument(html)}
                className={styles.previewFrame}
              />
            ) : (
              <div className={styles.emptyPreview}>
                <div className={styles.emptyBrand}>
                  <img src="/synky-sales-logo.webp" alt="Synky Sales" />
                </div>
                <div className={styles.proposalStarter}>
                  <div className={styles.starterKicker}>
                    <span /> Proposta digital
                  </div>
                  <h2>
                    {busy && pendingPrompt
                      ? 'Sua proposta está ganhando forma.'
                      : 'Uma proposta que parece feita para o cliente.'}
                  </h2>
                  <p>
                    {project
                      ? 'Conte sua ideia na conversa e veja cada decisão ganhar uma página.'
                      : 'Traga um briefing ou comece por uma ideia. A estrutura nasce aqui.'}
                  </p>
                  <div className={styles.starterSections} aria-hidden="true">
                    <span>Contexto</span>
                    <span>Solução</span>
                    <span>Investimento</span>
                  </div>
                </div>
                <div className={styles.emptyTag}>
                  <span />
                  {project ? 'Workspace pronto para criar' : 'Novo workspace'}
                </div>
              </div>
            )}
          </div>
          <footer className={styles.previewFooter}>
            <span>
              {html
                ? `${historical ? 'Histórico' : 'Proposta-site'} · Versão ${historical?.revision ?? project?.revision}`
                : 'Estúdio Lab'}
            </span>
            <span>
              {busy
                ? 'Processando pedido'
                : project
                  ? 'Projeto privado'
                  : 'Experimental'}
            </span>
          </footer>
        </section>
      </div>

      <dialog
        ref={libraryDialog}
        className={styles.library}
        onCancel={() => setLibrary(false)}
        onClose={() => {
          setLibrary(false);
          opener.current?.focus();
        }}
      >
        <div className={styles.libraryHeader}>
          <div>
            <span className={styles.eyebrow}>Estúdio Lab</span>
            <h2>Seus projetos</h2>
          </div>
          <IconButton label="Fechar projetos" onClick={() => setLibrary(false)}>
            <X size={18} />
          </IconButton>
        </div>
        <button className={styles.primary} onClick={newProject}>
          <Plus size={16} />
          Novo projeto
        </button>
        {loading ? (
          <p className={styles.loading}>Carregando…</p>
        ) : projects.length ? (
          <div className={styles.projectList}>
            {projects.map((item) => (
              <button key={item.id} onClick={() => void openProject(item.id)}>
                <span className={styles.projectIcon}>
                  {item.mode === 'briefing' ? (
                    <FileText size={19} />
                  ) : (
                    <Sparkles size={19} />
                  )}
                </span>
                <span>
                  <strong>{item.title}</strong>
                  <small>
                    {item.revision ? `Versão ${item.revision}` : 'Rascunho'} ·{' '}
                    {updated(item.updatedAt)}
                  </small>
                </span>
                <ArrowRight size={16} />
              </button>
            ))}
          </div>
        ) : (
          <p className={styles.muted}>
            Você ainda não tem projetos no estúdio.
          </p>
        )}
        {error && <ErrorMessage>{error}</ErrorMessage>}
      </dialog>
    </div>
  );
}

function IconButton({
  label,
  children,
  onClick,
  disabled,
  pressed,
}: {
  label: string;
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  pressed?: boolean;
}) {
  return (
    <button
      type="button"
      className={styles.iconButton}
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
function ErrorMessage({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className={styles.error}>
      {children}
    </p>
  );
}
