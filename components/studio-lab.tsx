'use client';

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent,
  type ReactNode,
  type CSSProperties,
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
  const [imageAttachment, setImageAttachment] = useState<File | null>(null);
  const [draggingImage, setDraggingImage] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [pendingPrompt, setPendingPrompt] = useState('');
  const [tab, setTab] = useState<'chat' | 'context' | 'history'>('chat');
  const [mobilePane, setMobilePane] = useState<'chat' | 'preview'>('chat');
  const [device, setDevice] = useState<'desktop' | 'tablet' | 'mobile'>(
    'desktop',
  );
  const [chatWidth, setChatWidth] = useState(410);
  const [expanded, setExpanded] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);
  const [historical, setHistorical] = useState<{
    html: string;
    title: string;
    revision: number;
  } | null>(null);
  const request = useRef<AbortController | null>(null);
  const messagesEnd = useRef<HTMLDivElement>(null);
  const imageInput = useRef<HTMLInputElement>(null);
  const composer = useRef<HTMLTextAreaElement>(null);
  const opener = useRef<HTMLButtonElement>(null);
  const workspace = useRef<HTMLDivElement>(null);
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
    setImageAttachment(null);
  }
  function choosePrompt(nextPrompt: string) {
    if (busy) return;
    setPrompt(nextPrompt);
    setTab('chat');
    window.setTimeout(() => composer.current?.focus(), 0);
  }
  function attachImage(next: File | null | undefined) {
    if (!next) return;
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(next.type)) {
      setError('Envie uma imagem PNG, JPG, WebP ou GIF.');
      return;
    }
    if (next.size > 4 * 1024 * 1024) {
      setError('A imagem deve ter no máximo 4 MB.');
      return;
    }
    setImageAttachment(next);
    setError('');
  }
  async function imagePayload(file: File | null) {
    if (!file) return undefined;
    const data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error('Não foi possível ler a imagem.'));
      reader.readAsDataURL(file);
    });
    return { name: file.name.slice(0, 180), mime: file.type, data };
  }
  function resizeConversation(clientX: number) {
    const bounds = workspace.current?.getBoundingClientRect();
    if (!bounds) return;
    const minimum = 300;
    const maximum = Math.max(minimum, Math.min(580, bounds.width - 340));
    setChatWidth(Math.round(Math.min(maximum, Math.max(minimum, clientX - bounds.left))));
  }
  function startResize(event: PointerEvent<HTMLDivElement>) {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    resizeConversation(event.clientX);
  }
  function moveResize(event: PointerEvent<HTMLDivElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      resizeConversation(event.clientX);
    }
  }
  function keyResize(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const bounds = workspace.current?.getBoundingClientRect();
    if (!bounds) return;
    resizeConversation(
      bounds.left + chatWidth + (event.key === 'ArrowLeft' ? -24 : 24),
    );
  }
  async function send(event: FormEvent) {
    event.preventDefault();
    if (!prompt.trim() || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError('');
    setTab('chat');
    setHistorical(null);
    const text = prompt.trim();
    const attachment = imageAttachment;
    setPendingPrompt(text);
    setPrompt('');
    setImageAttachment(null);
    request.current = new AbortController();
    try {
      let activeProject = project;
      if (!activeProject) {
        const body = new FormData();
        body.set('mode', 'free');
        body.set('title', text.slice(0, 72));
        const created = await api<ProjectResponse>('/api/studio', {
          method: 'POST',
          signal: request.current.signal,
          body,
        });
        accept(created);
        activeProject = created.project;
        setTab('chat');
      }
      accept(
        await api<ProjectResponse>(`/api/studio/${activeProject.id}/message`, {
          method: 'POST',
          signal: request.current.signal,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: text,
            revision: activeProject.revision,
            image: await imagePayload(attachment),
          }),
        }),
      );
      setAiReady(true);
    } catch (cause) {
      setPrompt(text);
      setImageAttachment(attachment);
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
              Salvo agora
            </span>
          )}
          {project && (
            <button
              className={styles.versionAction}
              onClick={() => setTab('history')}
              disabled={busy}
            >
              <History size={16} />
              <span>Versões</span>
            </button>
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

      <div
        ref={workspace}
        className={styles.workspace}
        data-pane={mobilePane}
        style={{ '--studio-chat-width': `${chatWidth}px` } as CSSProperties}
      >
        <section
          className={styles.conversation}
          aria-label="Conversa e briefing"
        >
          <input
            ref={imageInput}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            hidden
            onChange={(event) => {
              attachImage(event.target.files?.[0]);
              event.target.value = '';
            }}
          />
          {!project ? (
            <form
              className={`${styles.startChat} ${draggingImage ? styles.dragging : ''}`}
              onSubmit={send}
              onDragOver={(event) => {
                event.preventDefault();
                setDraggingImage(true);
              }}
              onDragLeave={() => setDraggingImage(false)}
              onDrop={(event) => {
                event.preventDefault();
                setDraggingImage(false);
                attachImage(event.dataTransfer.files?.[0]);
              }}
            >
              <div className={styles.startChatIntro}>
                <span className={styles.eyebrow}>CRIAÇÃO POR CONVERSA</span>
                <span className={styles.assistantMark}>
                  <Sparkles size={18} />
                </span>
                <h2>O que você quer criar?</h2>
                <p>
                  Descreva a proposta, envie uma referência visual e acompanhe
                  as mudanças na prévia ao lado.
                </p>
              </div>
              <div className={styles.startComposer}>
                {imageAttachment && (
                  <span className={styles.imageAttachment}>
                    <Paperclip size={14} />
                    <span>{imageAttachment.name}</span>
                    <button
                      type="button"
                      onClick={() => setImageAttachment(null)}
                      aria-label="Remover imagem"
                    >
                      <X size={14} />
                    </button>
                  </span>
                )}
                <textarea
                  ref={composer}
                  aria-label="Pedido para criar uma proposta"
                  value={prompt}
                  onChange={(event) => setPrompt(event.target.value)}
                  placeholder="Descreva a proposta que você quer criar…"
                  rows={5}
                  maxLength={8000}
                  disabled={busy}
                />
                <div className={styles.startComposerFooter}>
                  <button
                    type="button"
                    className={styles.addImage}
                    onClick={() => imageInput.current?.click()}
                    disabled={busy}
                    aria-label="Adicionar imagem"
                    title="Adicionar imagem"
                  >
                    <Plus size={18} />
                  </button>
                  <span>Arraste uma imagem ou clique em +</span>
                  <button
                    type="submit"
                    className={styles.send}
                    disabled={!prompt.trim() || busy || loading}
                    aria-label="Criar proposta"
                  >
                    {busy ? <Loader2 size={17} className={styles.spin} /> : <ArrowUp size={18} />}
                  </button>
                </div>
              </div>
              {error && <ErrorMessage>{error}</ErrorMessage>}
              {projects.length > 0 && (
                <button
                  type="button"
                  className={styles.textButton}
                  onClick={() => setLibrary(true)}
                >
                  <FolderOpen size={15} />
                  Abrir um projeto existente
                </button>
              )}
            </form>
          ) : (
            <>
              <div className={styles.conversationHeader}>
                <span className={styles.conversationIcon}>
                  <MessageSquare size={17} />
                </span>
                <span>
                  <strong>Conversa</strong>
                  <small>{project.title}</small>
                </span>
              </div>
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
                      {message.attachment && (
                        <span className={styles.messageAttachment}>
                          <Paperclip size={13} />
                          {message.attachment.name}
                        </span>
                      )}
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
              <form
                className={`${styles.composerArea} ${draggingImage ? styles.dragging : ''}`}
                onSubmit={send}
                onDragOver={(event) => {
                  event.preventDefault();
                  setDraggingImage(true);
                }}
                onDragLeave={() => setDraggingImage(false)}
                onDrop={(event) => {
                  event.preventDefault();
                  setDraggingImage(false);
                  attachImage(event.dataTransfer.files?.[0]);
                }}
              >
                {error && <ErrorMessage>{error}</ErrorMessage>}
                <div className={styles.composer}>
                  {imageAttachment && (
                    <span className={styles.imageAttachment}>
                      <Paperclip size={14} />
                      <span>{imageAttachment.name}</span>
                      <button
                        type="button"
                        onClick={() => setImageAttachment(null)}
                        aria-label="Remover imagem"
                      >
                        <X size={14} />
                      </button>
                    </span>
                  )}
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
                    <button
                      type="button"
                      className={styles.addImage}
                      onClick={() => imageInput.current?.click()}
                      disabled={busy}
                      aria-label="Adicionar imagem"
                      title="Adicionar imagem"
                    >
                      <Plus size={17} />
                    </button>
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

        <div
          className={styles.resizeHandle}
          role="separator"
          aria-orientation="vertical"
          aria-label="Redimensionar conversa e prévia"
          aria-valuemin={300}
          aria-valuemax={580}
          aria-valuenow={chatWidth}
          tabIndex={0}
          onPointerDown={startResize}
          onPointerMove={moveResize}
          onKeyDown={keyResize}
        >
          <span />
        </div>

        <section
          className={`${styles.preview} ${expanded ? styles.expanded : ''}`}
          aria-label="Prévia da proposta"
        >
          <div className={styles.previewToolbar}>
            <span className={styles.previewLabel}>
              <span className={styles.previewDot} />
              {busy ? 'Atualizando prévia…' : 'Prévia atualizada'}
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
                onClick={() => {
                  setExpanded(!expanded);
                  if (!expanded)
                    window.setTimeout(() => composer.current?.focus(), 0);
                }}
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
          {project && (
            <div className={styles.versionRail}>
              <div className={styles.versionRailTitle}>
                <strong>Versão {historical?.revision ?? project.revision}</strong>
                <span>{historical ? 'Visualizando histórico' : 'Atualizada agora'}</span>
              </div>
              <div className={styles.versionRailItems}>
                {versions.slice(0, 3).map((version) => (
                  <button
                    key={version.revision}
                    className={version.revision === (historical?.revision ?? project.revision) ? styles.versionRailItemActive : styles.versionRailItem}
                    onClick={() => void viewVersion(version.revision)}
                    disabled={busy}
                    aria-label={`Abrir versão ${version.revision}`}
                  >
                    v{version.revision}
                  </button>
                ))}
              </div>
              <button className={styles.versionRailAction} onClick={() => setTab('history')}>
                <History size={15} />
                Ver versões
              </button>
            </div>
          )}
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
          {expanded && (
            <form className={styles.floatingComposer} onSubmit={send}>
              <button
                type="button"
                className={styles.floatingAttach}
                onClick={() => imageInput.current?.click()}
                disabled={busy}
                aria-label="Adicionar imagem"
                title="Adicionar imagem"
              >
                <Plus size={17} />
              </button>
              <textarea
                ref={composer}
                aria-label="Pedido rápido para a prévia"
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder={
                  project?.html
                    ? 'Peça uma alteração na prévia…'
                    : 'Descreva o que você quer criar…'
                }
                rows={1}
                maxLength={8000}
                disabled={busy}
                onKeyDown={(event) => {
                  if (
                    event.key === 'Enter' &&
                    !event.shiftKey &&
                    !event.nativeEvent.isComposing
                  ) {
                    event.preventDefault();
                    event.currentTarget.form?.requestSubmit();
                  }
                }}
              />
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
                  className={styles.floatingSend}
                  disabled={!prompt.trim() || project?.busy}
                  aria-label="Enviar pedido"
                >
                  <ArrowUp size={17} />
                </button>
              )}
            </form>
          )}
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
