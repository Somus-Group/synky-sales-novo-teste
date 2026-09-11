'use client';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type PointerEvent,
  type ReactNode,
} from 'react';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowLeft,
  ArrowUp,
  Check,
  CheckCheck,
  CircleAlert,
  ScanLine,
  PanelsTopLeft,
  ChevronDown,
  Code2,
  Download,
  ExternalLink,
  FileText,
  FolderOpen,
  History,
  ImagePlus,
  Link2,
  ListChecks,
  Loader2,
  Maximize2,
  MessageSquare,
  Mic,
  Minimize2,
  Monitor,
  MousePointer2,
  Paperclip,
  Plus,
  RotateCcw,
  Search,
  Send,
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
  type StudioVisualEdit,
} from '@/lib/studio';
import { studioTemplates, type StudioTemplateId } from '@/lib/studio-templates';
import {
  StudioCanvas,
  type StudioSelection,
  type StudioCanvasReport,
} from './studio-canvas';
import styles from './studio-lab.module.css';
type ProjectResponse = { project: StudioProject; versions: StudioVersion[] };
type ContextDraft = {
  title: string;
  briefing: string;
  referenceUrl: string;
  templateId: StudioTemplateId;
};
type VoiceRecognitionResult = {
  0: { transcript: string };
  isFinal: boolean;
};
type VoiceRecognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: { results: ArrayLike<VoiceRecognitionResult> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
};
type VoiceRecognitionConstructor = new () => VoiceRecognition;
const emptyContext: ContextDraft = {
  title: '',
  briefing: '',
  referenceUrl: '',
  templateId: 'commercial',
};
async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, options);
  const body = await response
    .json()
    .catch(() => ({ error: 'A conexão falhou. Tente novamente.' }));
  if (!response.ok)
    throw new Error(
      (body as { error?: string }).error || 'Não foi possível concluir.',
    );
  return body as T;
}
const updated = (value: number) =>
  new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(value);
export function StudioLab() {
  const [projects, setProjects] = useState<StudioSummary[]>([]);
  const [project, setProject] = useState<StudioProject | null>(null);
  const [versions, setVersions] = useState<StudioVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [aiReady, setAiReady] = useState<boolean | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [prompt, setPrompt] = useState('');
  const [pending, setPending] = useState('');
  const [intent, setIntent] = useState<'edit' | 'plan'>('edit');
  const [mode, setMode] = useState<StudioMode>('free');
  const [draft, setDraft] = useState<ContextDraft>(emptyContext);
  const [briefFile, setBriefFile] = useState<File | null>(null);
  const [attachment, setAttachment] = useState<File | null>(null);
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [tab, setTab] = useState<'chat' | 'context' | 'history' | 'review'>(
    'chat',
  );
  const [canvasReport, setCanvasReport] = useState<StudioCanvasReport | null>(
    null,
  );
  const [mobilePane, setMobilePane] = useState<'chat' | 'preview'>('chat');
  const [device, setDevice] = useState<'desktop' | 'tablet' | 'mobile'>(
    'desktop',
  );
  const [previewMode, setPreviewMode] = useState<'preview' | 'code'>('preview');
  const [selecting, setSelecting] = useState(false);
  const [selection, setSelection] = useState<StudioSelection | null>(null);
  const [visualEdit, setVisualEdit] = useState<Partial<StudioVisualEdit>>({});
  const [historical, setHistorical] = useState<{
    html: string;
    title: string;
    revision: number;
  } | null>(null);
  const [previewKey, setPreviewKey] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [chatWidth, setChatWidth] = useState(368);
  const [library, setLibrary] = useState(false);
  const [search, setSearch] = useState('');
  const [dragging, setDragging] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const gate = useRef(false);
  const request = useRef<AbortController | null>(null);
  const composer = useRef<HTMLTextAreaElement>(null);
  const messagesEnd = useRef<HTMLDivElement>(null);
  const imageInput = useRef<HTMLInputElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const workspace = useRef<HTMLDivElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const recognition = useRef<VoiceRecognition | null>(null);
  const dirty =
    !!project &&
    (draft.title !== project.title ||
      draft.briefing !== project.briefing ||
      draft.referenceUrl !== project.referenceUrl ||
      draft.templateId !== project.templateId);
  const blocked = busy || loading || !!project?.busy;
  const html = historical?.html ?? project?.html ?? '';
  const review = [...(project?.messages || [])]
    .reverse()
    .find((message) => message.review)?.review;
  const logo = canvasReport?.images.find((item) => item.logo);
  const revisionLabel = historical?.revision ?? project?.revision ?? 0;
  const selectedTemplate =
    studioTemplates.find((item) => item.id === draft.templateId) ||
    studioTemplates[0];
  const reportCanvas = useCallback(
    (value: StudioCanvasReport) => setCanvasReport(value),
    [],
  );
  async function loadProjects() {
    try {
      const result = await api<{ projects: StudioSummary[]; aiReady: boolean }>(
        '/api/studio',
      );
      setProjects(result.projects);
      setAiReady(result.aiReady);
    } catch (cause) {
      setError(errorText(cause));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void loadProjects().then(() => {
      const id = sessionStorage.getItem('synky.studio.activeProject');
      if (id) void openProject(id);
    });
    return () => {
      request.current?.abort();
      recognition.current?.abort();
    };
  }, []);
  useEffect(() => {
    const browser = window as typeof window & {
      SpeechRecognition?: VoiceRecognitionConstructor;
      webkitSpeechRecognition?: VoiceRecognitionConstructor;
    };
    setVoiceSupported(Boolean(browser.SpeechRecognition || browser.webkitSpeechRecognition));
  }, []);
  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ block: 'end', behavior: 'smooth' });
  }, [project?.messages.length, pending, tab]);
  useEffect(() => {
    if (library) dialog.current?.showModal();
    else dialog.current?.close();
  }, [library]);
  useEffect(() => {
    if (!attachment) {
      setAttachmentUrl('');
      return;
    }
    const url = URL.createObjectURL(attachment);
    setAttachmentUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [attachment]);
  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setExpanded(false);
        setSelecting(false);
        setSelection(null);
      }
    };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, []);
  function accept(result: ProjectResponse) {
    setCanvasReport(null);
    sessionStorage.setItem('synky.studio.activeProject', result.project.id);
    setProject(result.project);
    setVersions(result.versions);
    setHistorical(null);
    setDraft({
      title: result.project.title,
      briefing: result.project.briefing,
      referenceUrl: result.project.referenceUrl,
      templateId: result.project.templateId,
    });
    setSelection(null);
    setVisualEdit({});
    setProjects((previous) =>
      [
        result.project,
        ...previous.filter((item) => item.id !== result.project.id),
      ].sort((a, b) => b.updatedAt - a.updatedAt),
    );
  }
  async function openProject(id: string) {
    if (gate.current) return;
    gate.current = true;
    setLoading(true);
    setError('');
    setNotice('');
    try {
      accept(await api<ProjectResponse>(`/api/studio/${id}`));
      setLibrary(false);
      setTab('chat');
      setPrompt('');
      setPending('');
      setAttachment(null);
      setBriefFile(null);
      setSelecting(false);
    } catch (cause) {
      setError(errorText(cause));
    } finally {
      setLoading(false);
      gate.current = false;
    }
  }
  function newProject() {
    if (gate.current) return;
    if (dirty) {
      setTab('context');
      setError('Salve ou descarte as alterações do contexto antes de sair.');
      return;
    }
    sessionStorage.removeItem('synky.studio.activeProject');
    setProject(null);
    setCanvasReport(null);
    setVersions([]);
    setHistorical(null);
    setPrompt('');
    setError('');
    setNotice('');
    setDraft(emptyContext);
    setMode('free');
    setAttachment(null);
    setBriefFile(null);
    setTab('chat');
    setMobilePane('chat');
    setLibrary(false);
    setSelection(null);
    setSelecting(false);
  }
  function attachImage(file?: File) {
    if (!file) return;
    if (
      !['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(
        file.type,
      ) ||
      file.size > 4 * 1024 * 1024
    ) {
      setError('Envie uma imagem PNG, JPG, WebP ou GIF de até 4 MB.');
      return;
    }
    setAttachment(file);
    setError('');
  }
  async function imagePayload(file: File | null) {
    if (!file) return undefined;
    let data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () =>
        reject(new Error('Não foi possível ler a imagem.'));
      reader.readAsDataURL(file);
    });
    let mime = file.type;
    if (data.length > 400000) {
      const bitmap = await createImageBitmap(file);
      const canvas = document.createElement('canvas');
      const ratio = Math.min(1, 1200 / Math.max(bitmap.width, bitmap.height));
      canvas.width = Math.round(bitmap.width * ratio);
      canvas.height = Math.round(bitmap.height * ratio);
      canvas
        .getContext('2d')!
        .drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      bitmap.close();
      data = canvas.toDataURL('image/webp', 0.82);
      mime = 'image/webp';
      if (data.length > 450000) {
        data = canvas.toDataURL('image/webp', 0.55);
      }
      if (data.length > 450000)
        throw new Error(
          'Esta imagem ainda ficou muito grande. Envie uma versão menor da logo.',
        );
    }
    return { name: file.name.slice(0, 180), mime, data };
  }
  async function createProject(text: string, signal?: AbortSignal) {
    const body = new FormData();
    body.set('mode', mode);
    body.set(
      'title',
      draft.title.trim() || text.slice(0, 72) || 'Nova proposta',
    );
    body.set('briefing', draft.briefing);
    body.set('referenceUrl', draft.referenceUrl);
    body.set('templateId', draft.templateId);
    if (briefFile) body.set('file', briefFile);
    const created = await api<ProjectResponse>('/api/studio', {
      method: 'POST',
      body,
      signal,
    });
    accept(created);
    setBriefFile(null);
    return created.project;
  }
  async function saveContext() {
    if (gate.current) return;
    gate.current = true;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      if (!project) await createProject('');
      else
        accept(
          await api<ProjectResponse>(`/api/studio/${project.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'context',
              revision: project.revision,
              updatedAt: project.updatedAt,
              ...draft,
            }),
          }),
        );
      setNotice('Contexto salvo.');
    } catch (cause) {
      setError(errorText(cause));
    } finally {
      gate.current = false;
      setBusy(false);
    }
  }
  async function send(
    event?: FormEvent,
    override?: string,
    nextIntent = intent,
  ) {
    event?.preventDefault();
    const text = (override ?? prompt).trim();
    if (!text || gate.current || project?.busy) return;
    if (dirty) {
      setTab('context');
      setError('Salve o contexto para usá-lo no próximo pedido.');
      return;
    }
    gate.current = true;
    setBusy(true);
    setError('');
    setNotice('');
    setPending(text);
    setPrompt('');
    setTab('chat');
    setHistorical(null);
    const image = attachment;
    setAttachment(null);
    request.current = new AbortController();
    try {
      const active =
        project || (await createProject(text, request.current.signal));
      accept(
        await api<ProjectResponse>(`/api/studio/${active.id}/message`, {
          method: 'POST',
          signal: request.current.signal,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: text,
            revision: active.revision,
            intent: nextIntent,
            selection: selection
              ? JSON.stringify({
                  tag: selection.tag,
                  text: selection.text,
                  index: selection.index,
                })
              : undefined,
            image: await imagePayload(image),
          }),
        }),
      );
      setAiReady(true);
    } catch (cause) {
      setPrompt(text);
      setAttachment(image);
      setError(
        cause instanceof Error && cause.name === 'AbortError'
          ? 'Pedido interrompido. Reabra o projeto para conferir a última versão salva.'
          : errorText(cause),
      );
    } finally {
      setPending('');
      setBusy(false);
      gate.current = false;
      request.current = null;
    }
  }
  async function viewVersion(revision: number) {
    if (!project || gate.current) return;
    try {
      if (revision === project.revision) setHistorical(null);
      else
        setHistorical(
          (
            await api<{ version: NonNullable<typeof historical> }>(
              `/api/studio/${project.id}?version=${revision}`,
            )
          ).version,
        );
      setMobilePane('preview');
      setSelecting(false);
      setSelection(null);
    } catch (cause) {
      setError(errorText(cause));
    }
  }
  async function restore() {
    if (!project || !historical || gate.current) return;
    if (dirty) {
      setTab('context');
      setError('Salve ou descarte o contexto antes de restaurar.');
      return;
    }
    gate.current = true;
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
      setNotice('Versão restaurada.');
    } catch (cause) {
      setError(errorText(cause));
    } finally {
      setBusy(false);
      gate.current = false;
    }
  }
  const selectElement = useCallback((value: StudioSelection) => {
    setSelection(value);
    setVisualEdit({});
    setMobilePane('chat');
    setExpanded(false);
  }, []);
  async function saveVisual() {
    if (!project || !selection || gate.current) return;
    if (dirty) {
      setTab('context');
      setError('Salve ou descarte o contexto antes da edição visual.');
      return;
    }
    gate.current = true;
    setBusy(true);
    setError('');
    try {
      accept(
        await api<ProjectResponse>(`/api/studio/${project.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'visual',
            revision: project.revision,
            updatedAt: project.updatedAt,
            edit: { index: selection.index, tag: selection.tag, ...visualEdit },
          }),
        }),
      );
      setNotice('Edição visual salva.');
    } catch (cause) {
      setError(errorText(cause));
    } finally {
      gate.current = false;
      setBusy(false);
    }
  }
  function resize(clientX: number) {
    const bounds = workspace.current?.getBoundingClientRect();
    if (bounds)
      setChatWidth(
        Math.round(
          Math.min(
            Math.max(300, Math.min(560, bounds.width - 320)),
            Math.max(300, clientX - bounds.left),
          ),
        ),
      );
  }
  function startResize(event: PointerEvent<HTMLDivElement>) {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    resize(event.clientX);
  }
  function download() {
    const url = URL.createObjectURL(
      new Blob([studioPreviewDocument(html)], { type: 'text/html' }),
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = `proposta-v${historical?.revision ?? project?.revision ?? 0}.html`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function choosePrompt(text: string) {
    setPrompt(text);
    setTab('chat');
    composer.current?.focus();
  }
  function toggleVoiceInput() {
    if (listening) {
      recognition.current?.stop();
      return;
    }
    const browser = window as typeof window & {
      SpeechRecognition?: VoiceRecognitionConstructor;
      webkitSpeechRecognition?: VoiceRecognitionConstructor;
    };
    const Recognition = browser.SpeechRecognition || browser.webkitSpeechRecognition;
    if (!Recognition) {
      setError('O ditado por voz não está disponível neste navegador. Use uma versão recente do Chrome, Edge ou Safari.');
      return;
    }
    const initialPrompt = prompt.trimEnd();
    const voice = new Recognition();
    recognition.current = voice;
    voice.lang = 'pt-BR';
    voice.interimResults = true;
    voice.continuous = false;
    voice.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0]?.transcript || '')
        .join('')
        .trim();
      setPrompt(initialPrompt ? `${initialPrompt} ${transcript}`.trim() : transcript);
    };
    voice.onerror = (event) => {
      if (event.error === 'aborted') return;
      setError(event.error === 'not-allowed' ? 'Permita o uso do microfone para ditar sua mensagem.' : 'Não foi possível transcrever o áudio. Tente novamente.');
    };
    voice.onend = () => {
      setListening(false);
      recognition.current = null;
    };
    try {
      voice.start();
      setError('');
      setListening(true);
      setNotice('Ouvindo você. Fale normalmente; a transcrição aparecerá no campo.');
    } catch {
      setError('Não foi possível iniciar o ditado. Tente novamente.');
    }
  }
  return (
    <div className={styles.studio}>
      <header className={styles.header}>
        <div className={styles.identity}>
          <span className={styles.studioSymbol}>
            <PanelsTopLeft size={20} />
          </span>
          <strong>
            Estúdio <span>Lab</span>
          </strong>
        </div>
        <button
          className={styles.projectPicker}
          disabled={blocked || dirty}
          onClick={() => {
            setLibrary(true);
            void loadProjects();
          }}
        >
          <span>{project?.title || 'Novo projeto'}</span>
          <ChevronDown size={15} />
        </button>
        <span className={styles.saveStatus}>
          {busy ? (
            <>
              <Loader2 className={styles.spin} size={14} />
              Trabalhando
            </>
          ) : dirty ? (
            'Alterações pendentes'
          ) : project ? (
            <>
              <CheckCheck size={15} />
              Salvo
            </>
          ) : (
            'Rascunho'
          )}
        </span>
        <button
          className={styles.secondary}
          onClick={newProject}
          disabled={blocked}
        >
          <Plus size={16} />
          <span>Novo projeto</span>
        </button>
      </header>
      {aiReady === false && (
        <div className={styles.connection}>
          <span>
            A IA está indisponível neste ambiente. Seus rascunhos podem ser
            salvos.
          </span>
          <IconButton
            label="Verificar conexão"
            onClick={() => void loadProjects()}
          >
            <RotateCcw size={15} />
          </IconButton>
        </div>
      )}
      <div className={styles.mobileTabs}>
        <button
          aria-pressed={mobilePane === 'chat'}
          onClick={() => setMobilePane('chat')}
        >
          <MessageSquare size={16} />
          Conversa
        </button>
        <button
          aria-pressed={mobilePane === 'preview'}
          onClick={() => setMobilePane('preview')}
        >
          <Monitor size={16} />
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
          aria-label="Conversa e contexto"
        >
          <nav className={styles.panelTabs} aria-label="Conteúdo do projeto">
            {(
              [
                { id: 'chat', label: 'Conversa', icon: MessageSquare },
                { id: 'context', label: 'Contexto', icon: FileText },
                { id: 'review', label: 'Revisão', icon: ScanLine },
                { id: 'history', label: 'Versões', icon: History },
              ] as const
            ).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                aria-current={tab === id ? 'page' : undefined}
                onClick={() => setTab(id)}
              >
                <Icon size={15} />
                {label}
                {id === 'review' && !!review?.missing.length && (
                  <span className={styles.reviewCount}>
                    {review.missing.length}
                  </span>
                )}
                {id === 'context' && dirty && (
                  <span className={styles.unsavedDot} />
                )}
              </button>
            ))}
          </nav>
          {tab === 'chat' && (
            <div
              className={styles.messages}
              role="log"
              aria-label="Mensagens do projeto"
            >
              {!project?.messages.length && (
                <div className={styles.welcome}>
                  <span className={styles.assistantMark}>
                    <Sparkles size={20} />
                  </span>
                  <h2>
                    {project
                      ? 'Vamos criar a primeira versão.'
                      : 'O que vamos criar hoje?'}
                  </h2>
                  <p>
                    {project?.briefing
                      ? 'Briefing pronto para usar.'
                      : 'Sua próxima proposta começa com uma ideia.'}
                  </p>
                  <div className={styles.starterModes}>
                    <button
                      aria-pressed={mode === 'free'}
                      disabled={!!project}
                      onClick={() => setMode('free')}
                    >
                      <Sparkles size={17} />
                      Criação livre
                    </button>
                    <button
                      aria-pressed={mode === 'briefing'}
                      onClick={() => {
                        if (!project) setMode('briefing');
                        setTab('context');
                      }}
                    >
                      <FileText size={17} />
                      Com briefing
                    </button>
                    {!project && (
                      <button
                        type="button"
                        onClick={() => setTab('context')}
                      >
                        <PanelsTopLeft size={17} />
                        Escolher template
                      </button>
                    )}
                  </div>
                  <div className={styles.suggestions}>
                    {[
                      'Crie uma proposta de marketing com escopo e investimento.',
                      'Quero uma proposta de consultoria, clara e objetiva.',
                      'Vamos planejar a apresentação para meu cliente.',
                    ].map((text) => (
                      <button key={text} onClick={() => choosePrompt(text)}>
                        {text}
                        <ArrowUp size={14} />
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {project?.messages.map((message, index) => (
                <article
                  className={
                    message.role === 'user'
                      ? styles.userMessage
                      : styles.assistantMessage
                  }
                  key={`${message.at}-${index}`}
                >
                  <span className={styles.messageBy}>
                    {message.role === 'user' ? (
                      'Você'
                    ) : (
                      <>
                        <Sparkles size={14} />
                        Estúdio
                      </>
                    )}
                    {message.intent === 'plan' && <small>Planejamento</small>}
                  </span>
                  {message.text.length > 420 && message.role === 'user' ? (
                    <details className={styles.messageDetails}>
                      <summary>{message.text.slice(0, 130)}…</summary>
                      <p>{message.text}</p>
                    </details>
                  ) : (
                    <p>{message.text}</p>
                  )}
                  {message.attachment && (
                    <span className={styles.attachmentTag}>
                      <Paperclip size={13} />
                      {message.attachment.name}
                    </span>
                  )}
                  {!!message.revision && (
                    <button
                      className={styles.versionChip}
                      disabled={blocked}
                      onClick={() => void viewVersion(message.revision!)}
                    >
                      <Check size={14} />
                      <span>
                        Versão {message.revision}
                        {message.review && (
                          <small>
                            {message.review.logo
                              ? 'Logo incluída'
                              : 'Proposta atualizada'}{' '}
                            · {message.review.headings.length} seções
                          </small>
                        )}
                      </span>
                      <ExternalLink size={13} />
                    </button>
                  )}
                  {message.role === 'assistant' &&
                    message.intent === 'plan' &&
                    index === project.messages.length - 1 && (
                      <button
                        className={styles.applyPlan}
                        disabled={blocked}
                        onClick={() => {
                          setIntent('edit');
                          void send(
                            undefined,
                            'Aplique o plano da sua última resposta na proposta.',
                            'edit',
                          );
                        }}
                      >
                        <Sparkles size={14} />
                        Aplicar plano
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
                          title={message.reference?.title || url}
                        >
                          <Link2 size={12} />
                          {message.reference
                            ? 'Modelo lido e aplicado'
                            : 'Referência consultada'}
                        </a>
                      ))}
                    </div>
                  )}
                </article>
              ))}
              {pending && (
                <>
                  <article className={styles.userMessage}>
                    <span className={styles.messageBy}>Você</span>
                    <p>{pending}</p>
                  </article>
                  <div className={styles.working}>
                    <Loader2 className={styles.spin} size={17} />
                    <span>
                      {draft.referenceUrl
                        ? 'Lendo o modelo e preparando sua proposta…'
                        : intent === 'plan'
                          ? 'Preparando o plano…'
                          : 'Criando sua próxima versão…'}
                    </span>
                  </div>
                </>
              )}
              {project?.busy && !busy && (
                <div className={styles.working}>
                  <Loader2 className={styles.spin} size={16} />
                  Pedido em andamento
                  <IconButton
                    label="Atualizar projeto"
                    onClick={() => void openProject(project.id)}
                  >
                    <RotateCcw size={15} />
                  </IconButton>
                </div>
              )}
              <div ref={messagesEnd} />
            </div>
          )}
          {tab === 'context' && (
            <form
              className={styles.context}
              onSubmit={(event) => {
                event.preventDefault();
                void saveContext();
              }}
            >
              <div className={styles.sectionHeading}>
                <h2>Contexto do projeto</h2>
                <span>{project ? 'Salvo no projeto' : 'Opcional'}</span>
              </div>
              <div className={styles.brandRow}>
                <div className={styles.brandPreview}>
                  {logo ? (
                    <img src={logo.src} alt={logo.alt} />
                  ) : (
                    <ImagePlus size={24} />
                  )}
                </div>
                <div>
                  <strong>Logo da proposta</strong>
                  <span>
                    {logo
                      ? logo.alt
                      : draft.referenceUrl
                        ? 'Importação pelo modelo'
                        : 'Nenhuma logo adicionada'}
                  </span>
                </div>
                <IconButton
                  label="Adicionar ou trocar logo"
                  disabled={blocked}
                  onClick={() => {
                    setPrompt(
                      'Use a imagem anexada como logo no cabeçalho da proposta, sem recortar. Preserve o restante.',
                    );
                    setTab('chat');
                    imageInput.current?.click();
                  }}
                >
                  <ImagePlus size={18} />
                </IconButton>
              </div>
              {!project && (
                <fieldset className={styles.templatePicker}>
                  <legend>Template da proposta</legend>
                  <div>
                    {studioTemplates.map((template) => (
                      <button
                        key={template.id}
                        type="button"
                        aria-pressed={draft.templateId === template.id}
                        disabled={blocked}
                        onClick={() =>
                          setDraft({ ...draft, templateId: template.id })
                        }
                      >
                        <span
                          className={styles.templateSwatch}
                          style={
                            { '--template-accent': template.accent } as CSSProperties
                          }
                        />
                        <span>
                          <strong>{template.name}</strong>
                          <small>{template.description}</small>
                          <em>Ideal para: {template.bestFor}</em>
                        </span>
                      </button>
                    ))}
                  </div>
                  <aside
                    className={styles.templatePreview}
                    style={
                      {
                        '--template-accent': selectedTemplate.accent,
                        '--template-surface': selectedTemplate.surface,
                      } as CSSProperties
                    }
                  >
                    <span>Selecionado</span>
                    <strong>{selectedTemplate.name}</strong>
                    <p>{selectedTemplate.description}</p>
                    <dl>
                      <div>
                        <dt>Ideal para</dt>
                        <dd>{selectedTemplate.bestFor}</dd>
                      </div>
                      <div>
                        <dt>Estrutura</dt>
                        <dd>{selectedTemplate.structure}</dd>
                      </div>
                    </dl>
                  </aside>
                </fieldset>
              )}
              <label>
                Nome do projeto
                <input
                  value={draft.title}
                  maxLength={120}
                  placeholder="Proposta para o cliente"
                  required={!!project}
                  disabled={blocked}
                  onChange={(event) =>
                    setDraft({ ...draft, title: event.target.value })
                  }
                />
              </label>
              <label>
                Apresentação de referência
                <span className={styles.optional}>Opcional</span>
                <div className={styles.urlInput}>
                  <Link2 size={16} />
                  <input
                    type="url"
                    value={draft.referenceUrl}
                    placeholder="https://sua-apresentacao.com"
                    maxLength={4000}
                    disabled={blocked}
                    onChange={(event) =>
                      setDraft({ ...draft, referenceUrl: event.target.value })
                    }
                  />
                  {draft.referenceUrl && (
                    <IconButton
                      label="Remover referência"
                      disabled={blocked}
                      onClick={() => setDraft({ ...draft, referenceUrl: '' })}
                    >
                      <X size={14} />
                    </IconButton>
                  )}
                </div>
              </label>
              <label>
                Briefing do cliente
                <textarea
                  value={draft.briefing}
                  rows={9}
                  maxLength={40000}
                  placeholder="Objetivo, cliente, escopo, prazos e investimento…"
                  disabled={blocked}
                  onChange={(event) =>
                    setDraft({ ...draft, briefing: event.target.value })
                  }
                />
              </label>
              {!project && (
                <>
                  <input
                    ref={fileInput}
                    type="file"
                    accept=".pdf,.txt,.md"
                    hidden
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file && file.size <= 8 * 1024 * 1024) {
                        setBriefFile(file);
                        setMode('briefing');
                      } else if (file)
                        setError('O briefing deve ter até 8 MB.');
                      event.target.value = '';
                    }}
                  />
                  <button
                    type="button"
                    className={styles.uploadBrief}
                    disabled={blocked}
                    onClick={() => fileInput.current?.click()}
                  >
                    <Paperclip size={18} />
                    <span>
                      Anexar briefing<small>PDF, TXT ou MD · até 8 MB</small>
                    </span>
                    <Plus size={16} />
                  </button>
                </>
              )}
              {(briefFile || project?.fileName) && (
                <div className={styles.attachmentTag}>
                  <FileText size={15} />
                  <span>{briefFile?.name || project?.fileName}</span>
                  {briefFile && (
                    <IconButton
                      label="Remover briefing"
                      onClick={() => setBriefFile(null)}
                    >
                      <X size={14} />
                    </IconButton>
                  )}
                </div>
              )}
              <div className={styles.contextActions}>
                {dirty && (
                  <button
                    type="button"
                    className={styles.secondary}
                    onClick={() => {
                      setDraft({
                        title: project!.title,
                        briefing: project!.briefing,
                        referenceUrl: project!.referenceUrl,
                        templateId: project!.templateId,
                      });
                      setError('');
                    }}
                  >
                    Descartar
                  </button>
                )}
                <button
                  className={styles.primary}
                  disabled={blocked || (!!project && !dirty)}
                >
                  <Check size={16} />
                  {project ? 'Salvar contexto' : 'Salvar rascunho'}
                </button>
              </div>
            </form>
          )}
          {tab === 'review' && (
            <div className={styles.reviewPanel}>
              <div className={styles.sectionHeading}>
                <h2>Revisão da proposta</h2>
                <span>
                  {revisionLabel ? `Versão ${revisionLabel}` : 'Sem versão'}
                </span>
              </div>
              {html ? (
                <>
                  <div className={styles.reviewChecks}>
                    <div>
                      <FileText size={17} />
                      <span>Seções</span>
                      <strong>
                        {canvasReport?.headings.length ??
                          review?.headings.length ??
                          0}
                      </strong>
                    </div>
                    <div>
                      <ImagePlus size={17} />
                      <span>Imagens</span>
                      <strong>
                        {canvasReport?.images.length ?? review?.imageCount ?? 0}
                      </strong>
                    </div>
                    <div>
                      {logo ? <Check size={17} /> : <CircleAlert size={17} />}
                      <span>Logo</span>
                      <strong>{logo ? 'Incluída' : 'Não incluída'}</strong>
                    </div>
                  </div>
                  {!!canvasReport?.brokenImages && (
                    <p className={styles.reviewWarning}>
                      {canvasReport.brokenImages} imagem(ns) não carregou(aram).
                    </p>
                  )}
                  {canvasReport?.overflow && (
                    <p className={styles.reviewWarning}>
                      Há conteúdo ultrapassando a largura desta prévia.
                    </p>
                  )}
                  {!!review?.missing.length && !historical && (
                    <section className={styles.missingInfo}>
                      <h3>
                        <CircleAlert size={17} /> Informações a definir
                      </h3>
                      {review.missing.map((item) => (
                        <button
                          key={item}
                          onClick={() =>
                            choosePrompt(
                              `Complete a proposta com esta informação: ${item}: `,
                            )
                          }
                        >
                          {item}
                          <Plus size={15} />
                        </button>
                      ))}
                    </section>
                  )}
                  {!!review?.warnings.length &&
                    review.warnings.map((item) => (
                      <p key={item} className={styles.reviewWarning}>
                        {item}
                      </p>
                    ))}
                  <h3 className={styles.outlineTitle}>Na apresentação</h3>
                  <ol className={styles.pageOutline}>
                    {(canvasReport?.headings || review?.headings || []).map(
                      (heading, index) => (
                        <li key={`${index}-${heading}`}>
                          <span>{String(index + 1).padStart(2, '0')}</span>
                          {heading}
                        </li>
                      ),
                    )}
                  </ol>
                  <button
                    className={styles.secondary}
                    disabled={blocked || !!historical}
                    onClick={() =>
                      void send(
                        undefined,
                        'Revise e complete esta proposta. Corrija imagens ausentes, a logo, seções vazias, contraste, espaçamentos e links. Preserve todos os fatos. Liste informações ainda não fornecidas na revisão, sem inventá-las.',
                        'edit',
                      )
                    }
                  >
                    <Sparkles size={16} />
                    Revisar com IA
                  </button>
                </>
              ) : (
                <p className={styles.emptyText}>
                  A revisão ficará disponível com a primeira versão.
                </p>
              )}
            </div>
          )}
          {tab === 'history' && (
            <div className={styles.history}>
              <div className={styles.sectionHeading}>
                <h2>Histórico</h2>
                <span>{versions.length} versões</span>
              </div>
              {versions.length ? (
                versions.map((version) => (
                  <button
                    className={styles.historyItem}
                    key={version.revision}
                    onClick={() => void viewVersion(version.revision)}
                    disabled={blocked}
                  >
                    <span className={styles.historyNumber}>
                      {version.revision}
                    </span>
                    <span>
                      <strong>
                        Versão {version.revision}
                        {version.revision === project?.revision && (
                          <em>Atual</em>
                        )}
                      </strong>
                      <time>{updated(version.createdAt)}</time>
                      <p>{version.summary}</p>
                    </span>
                  </button>
                ))
              ) : (
                <p className={styles.emptyText}>Nenhuma versão criada ainda.</p>
              )}
            </div>
          )}
          {selection && (
            <div className={styles.inspector}>
              <div className={styles.inspectorTitle}>
                <MousePointer2 size={15} />
                <strong>{selection.tag.toUpperCase()}</strong>
                <span>Selecionado</span>
                <IconButton
                  label="Limpar seleção"
                  disabled={busy}
                  onClick={() => {
                    setSelection(null);
                    setVisualEdit({});
                    setSelecting(false);
                  }}
                >
                  <X size={14} />
                </IconButton>
              </div>
              {selection.editableText && (
                <label>
                  Texto
                  <textarea
                    aria-label="Texto do elemento"
                    rows={2}
                    maxLength={2000}
                    value={visualEdit.text ?? selection.text}
                    disabled={blocked}
                    onChange={(event) =>
                      setVisualEdit({ ...visualEdit, text: event.target.value })
                    }
                  />
                </label>
              )}
              <div className={styles.visualControls}>
                <label>
                  Texto
                  <input
                    aria-label="Cor do texto"
                    type="color"
                    disabled={blocked}
                    value={visualEdit.color ?? selection.color}
                    onChange={(event) =>
                      setVisualEdit({
                        ...visualEdit,
                        color: event.target.value,
                      })
                    }
                  />
                </label>
                <label>
                  Fundo
                  <input
                    aria-label="Cor de fundo"
                    type="color"
                    disabled={blocked}
                    value={visualEdit.background ?? selection.background}
                    onChange={(event) =>
                      setVisualEdit({
                        ...visualEdit,
                        background: event.target.value,
                      })
                    }
                  />
                </label>
                <label>
                  Tamanho
                  <input
                    aria-label="Tamanho do texto"
                    type="number"
                    min={8}
                    max={160}
                    disabled={blocked}
                    value={visualEdit.fontSize ?? selection.fontSize}
                    onChange={(event) =>
                      setVisualEdit({
                        ...visualEdit,
                        fontSize: Number(event.target.value),
                      })
                    }
                  />
                </label>
                <div className={styles.alignControls}>
                  {(
                    [
                      {
                        value: 'left',
                        icon: AlignLeft,
                        label: 'Alinhar à esquerda',
                      },
                      {
                        value: 'center',
                        icon: AlignCenter,
                        label: 'Centralizar',
                      },
                      {
                        value: 'right',
                        icon: AlignRight,
                        label: 'Alinhar à direita',
                      },
                    ] as const
                  ).map(({ value, icon: Icon, label }) => (
                    <IconButton
                      key={value}
                      label={label}
                      disabled={blocked}
                      pressed={(visualEdit.align ?? selection.align) === value}
                      onClick={() =>
                        setVisualEdit({ ...visualEdit, align: value })
                      }
                    >
                      <Icon size={15} />
                    </IconButton>
                  ))}
                </div>
              </div>
              <div className={styles.contextActions}>
                <button
                  className={styles.secondary}
                  disabled={blocked}
                  onClick={() => {
                    setTab('chat');
                    composer.current?.focus();
                  }}
                >
                  <Sparkles size={14} />
                  Pedir à IA
                </button>
                <button
                  className={styles.primary}
                  disabled={blocked || !Object.keys(visualEdit).length}
                  onClick={() => void saveVisual()}
                >
                  <Check size={14} />
                  Salvar edição
                </button>
              </div>
            </div>
          )}
          <div className={styles.feedback} aria-live="polite">
            {error && (
              <div role="alert" className={styles.error}>
                {error}
                {project && (
                  <button
                    disabled={busy}
                    onClick={() => void openProject(project.id)}
                  >
                    Reabrir projeto
                  </button>
                )}
              </div>
            )}
            {notice && !error && (
              <div className={styles.notice}>
                <Check size={14} />
                {notice}
              </div>
            )}
          </div>
          <form
            className={`${styles.composerArea} ${dragging ? styles.dragging : ''}`}
            onSubmit={(event) => void send(event)}
            onDragOver={(event) => {
              event.preventDefault();
              if (!blocked) setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              if (!blocked) attachImage(event.dataTransfer.files?.[0]);
            }}
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
            <div className={styles.composer}>
              {(attachment || draft.referenceUrl || selection) && (
                <div className={styles.composerAttachments}>
                  {attachment && (
                    <span className={styles.attachmentTag}>
                      {attachmentUrl && (
                        <img src={attachmentUrl} alt="Imagem anexada" />
                      )}
                      <span>{attachment.name}</span>
                      <IconButton
                        label="Remover imagem"
                        disabled={busy}
                        onClick={() => setAttachment(null)}
                      >
                        <X size={13} />
                      </IconButton>
                    </span>
                  )}
                  {draft.referenceUrl && (
                    <button
                      type="button"
                      className={styles.referenceTag}
                      onClick={() => setTab('context')}
                    >
                      <Link2 size={13} />
                      Referência{dirty && ' · pendente'}
                    </button>
                  )}
                  {selection && (
                    <span className={styles.referenceTag}>
                      <MousePointer2 size={13} />
                      {selection.tag.toUpperCase()}
                    </span>
                  )}
                </div>
              )}
              {listening && (
                <p className={styles.voiceStatus} aria-live="polite">
                  <span />Ouvindo… toque no microfone para parar.
                </p>
              )}
              <textarea
                ref={composer}
                aria-label="Pedido para a proposta"
                value={prompt}
                rows={3}
                maxLength={8000}
                disabled={busy || loading}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder={
                  intent === 'plan'
                    ? 'O que você quer planejar?'
                    : project?.html
                      ? 'O que você quer mudar?'
                      : 'Descreva a proposta que você quer criar…'
                }
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
              <div className={styles.composerFooter}>
                <div
                  className={styles.intentSwitch}
                  aria-label="Modo da conversa"
                >
                  <button
                    type="button"
                    title="Criar e editar"
                    aria-pressed={intent === 'edit'}
                    disabled={blocked}
                    onClick={() => setIntent('edit')}
                  >
                    <Sparkles size={14} />
                    <span>Criar</span>
                  </button>
                  <button
                    type="button"
                    title="Planejar sem alterar a proposta"
                    aria-pressed={intent === 'plan'}
                    disabled={blocked}
                    onClick={() => setIntent('plan')}
                  >
                    <ListChecks size={14} />
                    <span>Planejar</span>
                  </button>
                </div>
                <IconButton
                  label="Anexar imagem"
                  disabled={blocked}
                  onClick={() => imageInput.current?.click()}
                >
                  <ImagePlus size={17} />
                </IconButton>
                <IconButton
                  label="Adicionar link de apresentação"
                  disabled={blocked}
                  pressed={!!draft.referenceUrl}
                  onClick={() => setTab('context')}
                >
                  <Link2 size={17} />
                </IconButton>
                <IconButton
                  label={listening ? 'Parar ditado por voz' : voiceSupported ? 'Ditar mensagem por voz' : 'Ditado por voz indisponível neste navegador'}
                  disabled={blocked || !voiceSupported}
                  pressed={listening}
                  onClick={toggleVoiceInput}
                >
                  {listening ? <Square size={15} /> : <Mic size={17} />}
                </IconButton>
                {busy && request.current ? (
                  <IconButton
                    label="Interromper pedido"
                    onClick={() => request.current?.abort()}
                  >
                    <Square size={16} />
                  </IconButton>
                ) : (
                  <button
                    className={styles.send}
                    aria-label="Enviar pedido"
                    title="Enviar pedido"
                    disabled={!prompt.trim() || blocked}
                    type="submit"
                  >
                    <ArrowUp size={18} />
                  </button>
                )}
              </div>
            </div>
          </form>
        </section>
        <div
          className={styles.resizeHandle}
          role="separator"
          aria-orientation="vertical"
          aria-label="Redimensionar conversa"
          aria-valuemin={300}
          aria-valuemax={560}
          aria-valuenow={chatWidth}
          tabIndex={0}
          onPointerDown={startResize}
          onPointerMove={(event) => {
            if (event.currentTarget.hasPointerCapture(event.pointerId))
              resize(event.clientX);
          }}
          onKeyDown={(event) => {
            if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
              event.preventDefault();
              const bounds = workspace.current?.getBoundingClientRect();
              if (bounds)
                resize(
                  bounds.left +
                    chatWidth +
                    (event.key === 'ArrowLeft' ? -24 : 24),
                );
            }
          }}
        />
        <section
          className={`${styles.preview} ${expanded ? styles.expanded : ''}`}
          aria-label="Prévia da proposta"
        >
          <div className={styles.previewToolbar}>
            <div className={styles.viewSwitch}>
              <IconButton
                label="Prévia"
                pressed={previewMode === 'preview'}
                onClick={() => setPreviewMode('preview')}
              >
                <Monitor size={16} />
              </IconButton>
              <IconButton
                label="Código HTML"
                pressed={previewMode === 'code'}
                disabled={!html}
                onClick={() => setPreviewMode('code')}
              >
                <Code2 size={16} />
              </IconButton>
            </div>
            <div className={styles.deviceControls}>
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
              {html && (
                <button
                  className={styles.editToolbar}
                  aria-pressed={selecting}
                  disabled={blocked || !!historical}
                  onClick={() => {
                    setSelecting(!selecting);
                    setSelection(null);
                    setVisualEdit({});
                  }}
                >
                  <MousePointer2 size={16} />
                  <span>{selecting ? 'Selecionando' : 'Editar visual'}</span>
                </button>
              )}
              <IconButton
                label="Baixar proposta HTML"
                disabled={!html}
                onClick={download}
              >
                <Download size={16} />
              </IconButton>
              {project?.html && (
                <a
                  href={`/studio/${project.id}`}
                  aria-label="Abrir prévia em outra aba"
                  title="Abrir prévia em outra aba"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink size={16} />
                </a>
              )}
              <IconButton
                label={expanded ? 'Sair da tela cheia' : 'Expandir prévia'}
                onClick={() => setExpanded(!expanded)}
              >
                {expanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              </IconButton>
            </div>
          </div>
          {historical && (
            <div className={styles.restoreBar}>
              <button onClick={() => setHistorical(null)}>
                <ArrowLeft size={14} />
                Versão atual
              </button>
              <span>Versão {historical.revision}</span>
              <button disabled={blocked} onClick={() => void restore()}>
                <History size={14} />
                Restaurar
              </button>
            </div>
          )}
          <div className={styles.previewStage} data-device={device}>
            {html ? (
              previewMode === 'code' ? (
                <pre className={styles.code}>
                  <code>{html}</code>
                </pre>
              ) : (
                <StudioCanvas
                  key={`${project?.id}-${previewKey}-${historical?.revision ?? project?.revision}`}
                  html={html}
                  selecting={selecting && !blocked && !historical}
                  onSelect={selectElement}
                  className={styles.previewFrame}
                  deviceWidth={
                    device === 'desktop'
                      ? 1280
                      : device === 'tablet'
                        ? 768
                        : 390
                  }
                  onReport={reportCanvas}
                />
              )
            ) : (
              <div className={styles.emptyPreview}>
                <img
                  src="/synky-sales-logo-transparent.png"
                  alt="Synky Sales"
                />
                <h2>
                  {pending ? 'Preparando sua proposta' : 'Sua proposta, aqui'}
                </h2>
                <p>
                  {pending
                    ? 'A primeira versão aparecerá quando estiver pronta.'
                    : 'Nenhuma versão criada ainda.'}
                </p>
                {pending && <Loader2 size={20} className={styles.spin} />}
              </div>
            )}
          </div>
          <footer className={styles.previewFooter}>
            <span>
              {historical
                ? `Histórico · v${historical.revision}`
                : project?.revision
                  ? `Versão ${project.revision}`
                  : 'Sem versão'}
            </span>
            <span className={styles.footerStatus}>
              {busy ? (
                <>
                  <Loader2 size={12} className={styles.spin} />
                  Processando
                </>
              ) : (
                'Prévia privada'
              )}
            </span>
            <span className={styles.canvasSize}>
              {device === 'desktop'
                ? '1280'
                : device === 'tablet'
                  ? '768'
                  : '390'}{' '}
              px
            </span>
            <IconButton
              label="Recarregar prévia"
              disabled={busy}
              onClick={() => setPreviewKey((value) => value + 1)}
            >
              <RotateCcw size={14} />
            </IconButton>
            {project && (
              <button
                onClick={() => {
                  setTab('history');
                  setMobilePane('chat');
                }}
              >
                <History size={13} />
                Histórico
              </button>
            )}
          </footer>
          {expanded && (
            <form
              className={styles.floatingComposer}
              onSubmit={(event) => void send(event)}
            >
              <IconButton
                label="Voltar à conversa"
                onClick={() => {
                  setExpanded(false);
                  setMobilePane('chat');
                }}
              >
                <MessageSquare size={17} />
              </IconButton>
              <input
                aria-label="Pedido rápido"
                placeholder="Peça uma alteração…"
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                disabled={busy}
                maxLength={8000}
              />
              <button
                className={styles.send}
                disabled={blocked || !prompt.trim()}
                aria-label="Enviar pedido rápido"
              >
                <Send size={16} />
              </button>
            </form>
          )}
        </section>
      </div>
      <dialog
        ref={dialog}
        className={styles.libraryDialog}
        onCancel={() => setLibrary(false)}
        onClose={() => setLibrary(false)}
      >
        <div className={styles.libraryHeading}>
          <h2>Seus projetos</h2>
          <IconButton label="Fechar projetos" onClick={() => setLibrary(false)}>
            <X size={18} />
          </IconButton>
        </div>
        <label className={styles.librarySearch}>
          <Search size={17} />
          <input
            aria-label="Buscar projetos"
            placeholder="Buscar projeto"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <div className={styles.libraryList}>
          {projects
            .filter((item) =>
              item.title
                .toLocaleLowerCase()
                .includes(search.toLocaleLowerCase()),
            )
            .map((item) => (
              <button
                key={item.id}
                disabled={loading || busy}
                onClick={() => void openProject(item.id)}
              >
                <span className={styles.projectIcon}>
                  <FolderOpen size={19} />
                </span>
                <span>
                  <strong>{item.title}</strong>
                  <small>
                    {updated(item.updatedAt)} ·{' '}
                    {item.revision ? `v${item.revision}` : 'Rascunho'}
                  </small>
                </span>
                {item.id === project?.id && <Check size={17} />}
              </button>
            ))}
          {!projects.filter((item) =>
            item.title.toLocaleLowerCase().includes(search.toLocaleLowerCase()),
          ).length && (
            <p className={styles.emptyText}>Nenhum projeto encontrado.</p>
          )}
        </div>
        <button
          className={styles.primary}
          disabled={blocked}
          onClick={newProject}
        >
          <Plus size={16} />
          Novo projeto
        </button>
      </dialog>
    </div>
  );
}
function errorText(cause: unknown) {
  return cause instanceof Error
    ? cause.message
    : 'Não foi possível concluir. Tente novamente.';
}
function IconButton({
  label,
  onClick,
  children,
  disabled,
  pressed,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
  disabled?: boolean;
  pressed?: boolean;
}) {
  return (
    <button
      type="button"
      className={styles.iconButton}
      title={label}
      aria-label={label}
      aria-pressed={pressed}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
