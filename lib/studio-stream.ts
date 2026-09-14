export const studioStages = [
  { id: 'reading', label: 'Lendo briefing e referência' },
  { id: 'designing', label: 'Organizando conteúdo e direção visual' },
  { id: 'generating', label: 'Construindo a proposta' },
  { id: 'reviewing', label: 'Conferindo conteúdo e apresentação' },
  { id: 'repairing', label: 'Ajustando os pontos da revisão' },
  { id: 'saving', label: 'Salvando a nova versão' },
] as const;
export type StudioStage = (typeof studioStages)[number]['id'];

export async function readStudioStream<T>(
  response: Response,
  progress: (stage: StudioStage) => void,
): Promise<T> {
  if (!response.headers.get('content-type')?.includes('application/x-ndjson')) {
    const result = (await response.json()) as T & { error?: string };
    if (!response.ok)
      throw new Error(result.error || 'Não foi possível concluir.');
    return result;
  }
  const reader = response.body?.getReader();
  if (!reader)
    throw new Error(
      'A conexão foi interrompida. Reabra o projeto para conferir a versão salva.',
    );
  const decoder = new TextDecoder();
  let buffer = '';
  try {
    while (true) {
      const { value, done } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      if (done && buffer.trim()) {
        lines.push(buffer);
        buffer = '';
      }
      for (const line of lines) {
        if (!line.trim()) continue;
        const event = JSON.parse(line);
        if (event.type === 'error')
          throw new Error(event.error || 'Não foi possível concluir.');
        if (event.type === 'complete') return event.result as T;
        if (
          event.type === 'progress' &&
          studioStages.some((s) => s.id === event.stage)
        )
          progress(event.stage);
      }
      if (done) break;
    }
    throw new Error(
      'A conexão foi interrompida. Reabra o projeto para conferir a versão salva.',
    );
  } finally {
    await reader.cancel().catch(() => {});
  }
}
