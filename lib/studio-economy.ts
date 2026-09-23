import {
  StudioError,
  type StudioAiUsage,
  type StudioMessage,
} from '@/lib/studio';

// USD per million tokens, standard API pricing checked 2026-09-23.
// Unknown models fail closed instead of silently assuming a cheap rate.
const rates: Record<string, { input: number; cached: number; output: number }> =
  {
    'gpt-5-nano': { input: 0.05, cached: 0.005, output: 0.4 },
    'gpt-5-mini': { input: 0.25, cached: 0.025, output: 2 },
    'gpt-5.5': { input: 5, cached: 0.5, output: 30 },
  };
export const studioSpendLimits = { economy: 0.05, premium: 0.6 };
export const studioMicroSpendLimits: Record<StudioTask, number> = {
  create: 0.01,
  patch: 0.004,
  chat: 0.002,
};
export const studioWebSpendLimit = 0.02;

export type StudioTask = 'create' | 'patch' | 'chat';
export type StudioQuality = 'local' | 'micro' | 'economy' | 'premium';
export function studioTask(
  message: string,
  hasHtml: boolean,
  intent: string,
  newReference: boolean,
): StudioTask {
  if (
    intent === 'plan' ||
    /^(qual|quais|quanto|quando|como|onde|por que|o que)\b[\s\S]*\?\s*$/i.test(
      message,
    )
  )
    return 'chat';
  if (
    !hasHtml ||
    newReference ||
    /\b(refa[çc]a|recrie|redesenhe|reconstrua)\s+(?:toda?\s+)?(?:a\s+)?(?:proposta|p[aá]gina|layout|design)|\b(?:novo|nova)\s+(?:layout|design|proposta)\b/i.test(
      message,
    )
  )
    return 'create';
  return 'patch';
}

export function studioModel(
  task: StudioTask,
  quality: Exclude<StudioQuality, 'local'>,
  configuration: {
    STUDIO_ECONOMY_AI_MODEL?: string;
    STUDIO_DESIGN_AI_MODEL?: string;
  },
) {
  const model =
    quality === 'premium' && task !== 'chat'
      ? configuration.STUDIO_DESIGN_AI_MODEL || 'gpt-5.5'
      : quality === 'micro'
        ? 'gpt-5-nano'
      : configuration.STUDIO_ECONOMY_AI_MODEL || 'gpt-5-mini';
  if (!rates[model])
    throw new StudioError(
      'O modelo configurado ainda não tem tarifa cadastrada para o controle de gastos.',
      503,
      'unknown_model_price',
    );
  return model;
}

export function studioOutputBudget(
  model: string,
  task: StudioTask,
  quality: Exclude<StudioQuality, 'local'>,
  text: string,
  images: number,
  pdf: boolean,
  structured = false,
) {
  const rate = rates[model];
  if (!rate) throw new StudioError('Tarifa do modelo indisponível.', 503);
  // Text bytes are a conservative bound; image/PDF allowances are estimates,
  // never represented to the user as an exact provider billing ceiling.
  const inputAllowance =
    new TextEncoder().encode(text).length + images * 4000 + (pdf ? 40000 : 0);
  const available =
    (structured && quality === 'economy'
      ? studioWebSpendLimit
      : quality === 'micro'
        ? studioMicroSpendLimits[task]
        : studioSpendLimits[quality]) -
    (inputAllowance * rate.input) / 1e6;
  const max =
    task === 'chat'
      ? 1800
      : task === 'patch'
        ? 4000
        : structured
          ? 6000
          : 14000;
  const tokens = Math.min(max, Math.floor((available * 1e6) / rate.output));
  if (tokens < (task === 'create' ? (structured ? 3000 : 6000) : 1200))
    throw new StudioError(
      'O conteúdo ultrapassa o orçamento estimado deste pedido. Selecione um trecho menor ou reduza os anexos antes de enviar.',
      422,
      'ai_request_budget',
    );
  return tokens;
}

export function studioUsage(
  model: string,
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    input_tokens_details?: { cached_tokens?: number };
  },
): StudioAiUsage {
  const number = (n: unknown) =>
    typeof n === 'number' && Number.isFinite(n) && n >= 0 ? n : 0;
  const inputTokens = number(usage?.input_tokens);
  const outputTokens = number(usage?.output_tokens);
  const cachedTokens = Math.min(
    inputTokens,
    number(usage?.input_tokens_details?.cached_tokens),
  );
  const rate = rates[model];
  return {
    model,
    inputTokens,
    outputTokens,
    cachedTokens,
    estimatedUsd:
      rate &&
      typeof usage?.input_tokens === 'number' &&
      typeof usage?.output_tokens === 'number'
        ? ((inputTokens - cachedTokens) * rate.input +
            cachedTokens * rate.cached +
            outputTokens * rate.output) /
          1e6
        : null,
  };
}

export function economicalConversation(
  messages: StudioMessage[],
  briefing: string,
) {
  // The current document is authoritative for applied edits. Keep the original
  // request plus recent dialogue, without repeatedly shipping full audits/plans.
  const recent = messages.slice(-4);
  const first = messages.find((m) => m.role === 'user');
  const selected =
    first && !recent.includes(first) && first.text !== briefing
      ? [first, ...recent]
      : recent;
  return selected
    .filter(
      (m, i) =>
        m.text !== briefing &&
        selected.findIndex(
          (other) => other.role === m.role && other.text === m.text,
        ) === i,
    )
    .map(({ role, text, intent }) => ({ role, text, intent }));
}

export async function studioDigest(value: string) {
  const bytes = new Uint8Array(
    await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)),
  );
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}
