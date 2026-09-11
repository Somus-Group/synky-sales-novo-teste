import { getD1 } from '@/db';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import { getPipelineCompanyForUser } from '@/db/workspace';

const stageIds = ['Novo contato', 'Diagnóstico', 'Proposta enviada', 'Negociação'] as const;

export type PipelineLabels = {
  title: string;
  description: string;
  newOpportunity: string;
  period: string;
  metrics: { pipeline: string; forecast: string; ticket: string; negotiation: string };
  stages: Record<(typeof stageIds)[number], string>;
};

export const defaultPipelineLabels: PipelineLabels = {
  title: 'Pipeline comercial',
  description: 'Edite, filtre e mova oportunidades entre etapas. Os valores se atualizam em tempo real.',
  newOpportunity: 'Nova oportunidade',
  period: 'Período de entrada',
  metrics: { pipeline: 'Pipeline filtrado', forecast: 'Previsão ponderada', ticket: 'Ticket médio', negotiation: 'Em negociação' },
  stages: { 'Novo contato': 'Novo contato', Diagnóstico: 'Diagnóstico', 'Proposta enviada': 'Proposta enviada', Negociação: 'Negociação' },
};

function cleanText(value: unknown, fallback: string, limit = 100) {
  const text = typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, limit) : '';
  return text || fallback;
}

function parseLabels(value?: string): PipelineLabels {
  try {
    const source = JSON.parse(value || '{}') as Partial<PipelineLabels>;
    const sourceMetrics: Partial<PipelineLabels['metrics']> = source.metrics || {};
    const sourceStages: Partial<PipelineLabels['stages']> = source.stages || {};
    return {
      title: cleanText(source.title, defaultPipelineLabels.title),
      description: cleanText(source.description, defaultPipelineLabels.description, 240),
      newOpportunity: cleanText(source.newOpportunity, defaultPipelineLabels.newOpportunity),
      period: cleanText(source.period, defaultPipelineLabels.period),
      metrics: {
        pipeline: cleanText(sourceMetrics.pipeline, defaultPipelineLabels.metrics.pipeline),
        forecast: cleanText(sourceMetrics.forecast, defaultPipelineLabels.metrics.forecast),
        ticket: cleanText(sourceMetrics.ticket, defaultPipelineLabels.metrics.ticket),
        negotiation: cleanText(sourceMetrics.negotiation, defaultPipelineLabels.metrics.negotiation),
      },
      stages: Object.fromEntries(stageIds.map((stage) => [stage, cleanText(sourceStages[stage], defaultPipelineLabels.stages[stage])])) as PipelineLabels['stages'],
    };
  } catch {
    return defaultPipelineLabels;
  }
}

async function getSettings(companyId: string) {
  const db = getD1();
  const existing = await db.prepare('SELECT labels_json AS labelsJson FROM pipeline_settings WHERE company_id = ? LIMIT 1').bind(companyId).first<{ labelsJson: string }>();
  if (existing) return parseLabels(existing.labelsJson);
  const labels = defaultPipelineLabels;
  await db.prepare('INSERT OR IGNORE INTO pipeline_settings (company_id, labels_json, updated_at) VALUES (?, ?, ?)').bind(companyId, JSON.stringify(labels), Date.now()).run();
  return labels;
}

export async function GET(request: Request) {
  try {
    const user = await getChatGPTUser();
    if (!user) return Response.json({ error: 'Autenticação necessária.' }, { status: 401 });
    const { company } = await getPipelineCompanyForUser(user, request.headers.get('x-company-id'));
    return Response.json({ labels: await getSettings(company.id) });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Falha ao carregar a configuração.' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await getChatGPTUser();
    if (!user) return Response.json({ error: 'Autenticação necessária.' }, { status: 401 });
    const { company } = await getPipelineCompanyForUser(user, request.headers.get('x-company-id'));
    const payload = await request.json() as { labels?: unknown };
    const labels = parseLabels(JSON.stringify(payload.labels));
    await getD1().prepare('INSERT INTO pipeline_settings (company_id, labels_json, updated_at) VALUES (?, ?, ?) ON CONFLICT(company_id) DO UPDATE SET labels_json = excluded.labels_json, updated_at = excluded.updated_at')
      .bind(company.id, JSON.stringify(labels), Date.now()).run();
    return Response.json({ labels });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Falha ao salvar a configuração.' }, { status: 500 });
  }
}
