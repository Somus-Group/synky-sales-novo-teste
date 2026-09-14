import { getD1 } from '@/db';
import { StudioError, type StudioAiUsage } from '@/lib/studio';

export async function reserveStudioCall(
  projectId: string,
  workspaceId: string,
  requestKey: string,
  model: string,
  reserve: number,
  dailyLimit: number,
) {
  const db = getD1();
  const existing = await db
    .prepare(
      'SELECT status FROM studio_ai_requests WHERE project_id = ? AND workspace_id = ? AND request_key = ?',
    )
    .bind(projectId, workspaceId, requestKey)
    .first<{ status: string }>();
  if (existing)
    throw new StudioError(
      'Este pedido já foi processado ou está em andamento. Reabra a proposta para conferir o resultado; ele não será cobrado novamente por este envio.',
      409,
      'ai_duplicate_request',
    );
  const id = crypto.randomUUID();
  const now = Date.now();
  const day = Math.floor(now / 86400000) * 86400000;
  // Reservation and balance check are one statement, including concurrent projects.
  const result = await db
    .prepare(`INSERT INTO studio_ai_requests (id, project_id, workspace_id, request_key, model, reserved_usd, created_at)
    SELECT ?, ?, ?, ?, ?, ?, ? WHERE COALESCE((SELECT SUM(COALESCE(cost_usd, reserved_usd)) FROM studio_ai_requests WHERE workspace_id = ? AND created_at >= ?), 0) + ? <= ?`)
    .bind(
      id,
      projectId,
      workspaceId,
      requestKey,
      model,
      reserve,
      now,
      workspaceId,
      day,
      reserve,
      dailyLimit,
    )
    .run();
  if (!result.meta.changes)
    throw new StudioError(
      'O estúdio atingiu o limite diário de IA deste espaço. Edições visuais continuam disponíveis sem consumir a API.',
      429,
      'ai_daily_budget',
    );
  return id;
}

export async function finishStudioCall(
  id: string,
  status: string,
  usage?: StudioAiUsage,
) {
  await getD1()
    .prepare(
      'UPDATE studio_ai_requests SET status = ?, cost_usd = ?, input_tokens = ?, cached_tokens = ?, output_tokens = ? WHERE id = ?',
    )
    .bind(
      status,
      usage?.estimatedUsd ?? null,
      usage?.inputTokens ?? 0,
      usage?.cachedTokens ?? 0,
      usage?.outputTokens ?? 0,
      id,
    )
    .run();
}

export async function studioProjectUsage(
  projectId: string,
  workspaceId: string,
) {
  const row = await getD1()
    .prepare(`SELECT COUNT(*) AS calls, COALESCE(SUM(cost_usd), 0) AS estimatedUsd,
    COALESCE(SUM(CASE WHEN cost_usd IS NULL THEN 1 ELSE 0 END), 0) AS unconfirmed
    FROM studio_ai_requests WHERE project_id = ? AND workspace_id = ?`)
    .bind(projectId, workspaceId)
    .first<{ calls: number; estimatedUsd: number; unconfirmed: number }>();
  return row || { calls: 0, estimatedUsd: 0, unconfirmed: 0 };
}
