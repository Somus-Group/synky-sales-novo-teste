export type StudioMode = 'briefing' | 'free';
export type StudioMessage = {
  role: 'user' | 'assistant';
  text: string;
  revision?: number;
  at: number;
  sources?: string[];
  attachment?: { name: string; mime: string };
};
export type StudioProject = {
  id: string;
  title: string;
  mode: StudioMode;
  briefing: string;
  referenceUrl: string;
  fileName: string;
  html: string;
  revision: number;
  messages: StudioMessage[];
  createdAt: number;
  updatedAt: number;
  busy: boolean;
};
export type StudioSummary = Pick<
  StudioProject,
  'id' | 'title' | 'mode' | 'revision' | 'updatedAt'
>;
export type StudioVersion = {
  revision: number;
  title: string;
  summary: string;
  createdAt: number;
};

export class StudioError extends Error {
  constructor(
    message: string,
    public status = 400,
    public code = '',
  ) {
    super(message);
  }
}

export function referenceUrl(value: string) {
  if (!value.trim()) return '';
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    throw new StudioError('Informe um link completo, começando com https://.');
  }
  const host = url.hostname.toLowerCase();
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.port ||
    !host.includes('.') ||
    /(^\[|^[\d.]+$|(^|\.)(localhost|local|internal|test|invalid)$)/.test(host)
  ) {
    throw new StudioError('Use o link HTTPS de uma proposta pública.');
  }
  url.hash = '';
  return url.href;
}

export function studioInput(value: unknown) {
  if (!value || typeof value !== 'object')
    throw new StudioError('Informe o pedido de alteração.');
  const p = value as Record<string, unknown>;
  if (
    typeof p.message !== 'string' ||
    !p.message.trim() ||
    p.message.length > 8000
  )
    throw new StudioError('Escreva um pedido de até 8.000 caracteres.');
  if (!Number.isInteger(p.revision) || (p.revision as number) < 0)
    throw new StudioError('Reabra o projeto para atualizar a versão.');
  let image:
    | { name: string; mime: string; data: string }
    | undefined;
  if (p.image !== undefined) {
    if (!p.image || typeof p.image !== 'object')
      throw new StudioError('A imagem anexada é inválida.');
    const item = p.image as Record<string, unknown>;
    const mime = String(item.mime || '');
    const name = String(item.name || '').trim().slice(0, 180);
    const data = String(item.data || '');
    const validMime = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    const prefix = `data:${mime};base64,`;
    if (
      !name ||
      !validMime.includes(mime) ||
      !data.startsWith(prefix) ||
      data.length > 5_600_000 ||
      !/^[A-Za-z0-9+/]+={0,2}$/.test(data.slice(prefix.length))
    )
      throw new StudioError(
        'Envie uma imagem PNG, JPG, WebP ou GIF de até 4 MB.',
      );
    image = { name, mime, data };
  }
  return { message: p.message.trim(), revision: p.revision as number, image };
}

export const studioOutputSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['message', 'title', 'html', 'reference_status'],
  properties: {
    message: { type: 'string' },
    title: { type: 'string' },
    html: { type: 'string' },
    reference_status: {
      type: 'string',
      enum: ['used', 'unavailable', 'not_requested'],
    },
  },
};

export function parseStudioOutput(text: string) {
  let p: Record<string, unknown>;
  try {
    p = JSON.parse(text);
  } catch {
    throw new StudioError(
      'A IA retornou uma resposta incompleta. Tente novamente.',
      502,
    );
  }
  if (
    !p ||
    typeof p.message !== 'string' ||
    !p.message.trim() ||
    p.message.length > 8000 ||
    typeof p.title !== 'string' ||
    !p.title.trim() ||
    p.title.length > 120 ||
    typeof p.html !== 'string' ||
    p.html.length > 160000 ||
    !['used', 'unavailable', 'not_requested'].includes(
      p.reference_status as string,
    ) ||
    (p.html && (!/<body[\s>]/i.test(p.html) || !/<\/html\s*>/i.test(p.html)))
  ) {
    throw new StudioError(
      'A IA não concluiu uma versão válida. A anterior foi preservada.',
      502,
    );
  }
  return p as {
    message: string;
    title: string;
    html: string;
    reference_status: string;
  };
}

// Preview content has an opaque origin and cannot run scripts or access the app.
// The policy is placed first so model-provided markup cannot relax it.
export function studioPreviewDocument(html: string) {
  const policy =
    "default-src 'none'; script-src 'none'; style-src 'unsafe-inline'; img-src https://images.unsplash.com data:; font-src data:; connect-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'";
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${policy}"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="referrer" content="no-referrer"><style>html{color-scheme:light}body{margin:0}*{box-sizing:border-box}img{max-width:100%}</style></head><body>${html}</body></html>`;
}
