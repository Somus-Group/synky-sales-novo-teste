import { getD1 } from '@/db';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import { getWorkspaceForUser } from '@/db/workspace';
import {
  StudioError,
  type StudioProject,
  type StudioMessage,
  type StudioVersion,
} from '@/lib/studio';

type ProjectRow = Omit<StudioProject, 'messages' | 'busy'> & {
  workspaceId: string;
  fileKey: string;
  messagesJson: string;
  lockToken: string;
  lockedUntil: number;
};
const fields = `id, workspace_id AS workspaceId, title, mode, briefing, reference_url AS referenceUrl,
  file_key AS fileKey, file_name AS fileName, html, revision, messages_json AS messagesJson,
  lock_token AS lockToken, locked_until AS lockedUntil, created_at AS createdAt, updated_at AS updatedAt`;

export async function studioContext() {
  const user = await getChatGPTUser();
  if (!user)
    throw new StudioError('Entre na sua conta para abrir o estúdio.', 401);
  return { user, workspaceId: await getWorkspaceForUser(user), db: getD1() };
}

export async function studioProject(id: string, workspaceId: string) {
  const row = await getD1()
    .prepare(
      `SELECT ${fields} FROM studio_projects WHERE id = ? AND workspace_id = ?`,
    )
    .bind(id, workspaceId)
    .first<ProjectRow>();
  if (!row) throw new StudioError('Projeto não encontrado.', 404);
  return row;
}

export function publicProject(row: ProjectRow): StudioProject {
  const {
    workspaceId: _workspaceId,
    fileKey: _fileKey,
    lockToken: _token,
    lockedUntil,
    messagesJson,
    ...project
  } = row;
  return {
    ...project,
    messages: JSON.parse(messagesJson),
    busy: lockedUntil > Date.now(),
  };
}

export async function studioVersions(id: string) {
  return (
    await getD1()
      .prepare(
        'SELECT revision, title, summary, created_at AS createdAt FROM studio_versions WHERE project_id = ? ORDER BY revision DESC',
      )
      .bind(id)
      .all<StudioVersion>()
  ).results;
}

export async function lockStudioProject(row: ProjectRow, revision: number) {
  const token = crypto.randomUUID();
  const result = await getD1()
    .prepare(
      'UPDATE studio_projects SET lock_token = ?, locked_until = ? WHERE id = ? AND workspace_id = ? AND revision = ? AND locked_until < ? AND updated_at = ?',
    )
    .bind(
      token,
      Date.now() + 300000,
      row.id,
      row.workspaceId,
      revision,
      Date.now(),
      row.updatedAt,
    )
    .run();
  if (!result.meta.changes)
    throw new StudioError(
      'Este projeto foi atualizado ou está gerando em outra janela. Reabra-o antes de continuar.',
      409,
    );
  return token;
}

export async function unlockStudioProject(id: string, token: string) {
  await getD1()
    .prepare(
      'UPDATE studio_projects SET lock_token = ?, locked_until = 0 WHERE id = ? AND lock_token = ?',
    )
    .bind('', id, token)
    .run();
}

export async function saveStudioVersion(
  row: ProjectRow,
  token: string,
  title: string,
  html: string,
  messages: StudioMessage[],
  summary: string,
) {
  const revision = row.revision + 1;
  const now = Math.max(Date.now(), row.updatedAt + 1);
  const db = getD1();
  // Conditional insert and update share a D1 transaction, including lock ownership.
  const results = await db.batch([
    db
      .prepare(`INSERT INTO studio_versions (id, project_id, revision, title, html, summary, created_at)
      SELECT ?, id, ?, ?, ?, ?, ? FROM studio_projects WHERE id = ? AND lock_token = ? AND revision = ?`)
      .bind(
        crypto.randomUUID(),
        revision,
        title,
        html,
        summary,
        now,
        row.id,
        token,
        row.revision,
      ),
    db
      .prepare(`UPDATE studio_projects SET title = ?, html = ?, messages_json = ?, revision = ?, updated_at = ?, lock_token = '', locked_until = 0
      WHERE id = ? AND lock_token = ? AND revision = ?`)
      .bind(
        title,
        html,
        JSON.stringify(messages),
        revision,
        now,
        row.id,
        token,
        row.revision,
      ),
  ]);
  if (!results[1].meta.changes)
    throw new StudioError(
      'O projeto mudou em outra janela. Reabra-o para continuar.',
      409,
    );
}

export function studioFailure(error: unknown) {
  if (error instanceof StudioError)
    return Response.json(
      { error: error.message, code: error.code },
      { status: error.status },
    );
  console.error(
    'Studio request failed',
    error instanceof Error ? error.message : 'Unknown error',
  );
  return Response.json(
    {
      error:
        'Não foi possível concluir. Seu projeto foi preservado; tente novamente.',
    },
    { status: 500 },
  );
}
