import { getD1 } from '@/db';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import { getWorkspaceForUser } from '@/db/workspace';
import { limitedBody } from '@/lib/imported-template';
import { normalizeZeroDraft, zeroImagePaths } from '@/lib/zero-proposal';

const uuid = /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i;
export async function GET(request: Request) {
  try {
    const user = await getChatGPTUser();
    if (!user)
      return Response.json({ error: 'Entre na sua conta.' }, { status: 401 });
    const workspace = await getWorkspaceForUser(user);
    const id = new URL(request.url).searchParams.get('id');
    const db = getD1();
    if (id) {
      if (!uuid.test(id))
        return Response.json({ error: 'Rascunho inválido.' }, { status: 400 });
      const row = await db
        .prepare(
          'SELECT id, revision, updated_at AS updatedAt, content_json AS contentJson FROM zero_projects WHERE id = ? AND workspace_id = ?',
        )
        .bind(id, workspace)
        .first<{
          id: string;
          revision: number;
          updatedAt: number;
          contentJson: string;
        }>();
      if (!row)
        return Response.json(
          { error: 'Rascunho não encontrado.' },
          { status: 404 },
        );
      return Response.json({
        project: {
          id: row.id,
          revision: row.revision,
          updatedAt: row.updatedAt,
          draft: normalizeZeroDraft(JSON.parse(row.contentJson)),
        },
      });
    }
    const rows = await db
      .prepare(
        'SELECT id, title, client, revision, updated_at AS updatedAt FROM zero_projects WHERE workspace_id = ? ORDER BY updated_at DESC LIMIT 100',
      )
      .bind(workspace)
      .all();
    return Response.json({ projects: rows.results });
  } catch {
    return Response.json(
      { error: 'Não foi possível carregar os rascunhos.' },
      { status: 503 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getChatGPTUser();
    if (!user)
      return Response.json({ error: 'Entre na sua conta.' }, { status: 401 });
    const workspace = await getWorkspaceForUser(user);
    let payload: { id: string; revision: number; draft: unknown };
    let draft;
    try {
      payload = JSON.parse(
        new TextDecoder().decode(await limitedBody(request, 1000000)),
      );
      if (
        !payload ||
        !uuid.test(payload.id) ||
        !Number.isInteger(payload.revision) ||
        payload.revision < 0
      )
        throw new Error('Reabra o rascunho para salvar.');
      draft = normalizeZeroDraft(payload.draft);
      if (!draft.title) throw new Error('Informe o título da proposta.');
    } catch (error) {
      return Response.json(
        {
          error:
            error instanceof Error && !(error instanceof SyntaxError)
              ? error.message
              : 'Dados inválidos.',
        },
        { status: 400 },
      );
    }
    const db = getD1();
    if (draft.logo) {
      const token = draft.logo.split('/').at(-1)!;
      const asset = await db
        .prepare(
          'SELECT id FROM brand_assets WHERE public_token = ? AND workspace_id = ? AND kind = ?',
        )
        .bind(token, workspace, 'logo')
        .first();
      if (!asset)
        return Response.json(
          { error: 'Escolha uma logo do seu espaço.' },
          { status: 400 },
        );
    }
    for (const path of zeroImagePaths(draft).filter(
      (path) => path.startsWith('/api/assets/') && path !== draft.logo,
    )) {
      const asset = await db
        .prepare(
          'SELECT id FROM brand_assets WHERE public_token = ? AND workspace_id = ? AND kind IN (?, ?)',
        )
        .bind(path.split('/').at(-1)!, workspace, 'gallery', 'portfolio')
        .first();
      if (!asset)
        return Response.json(
          { error: 'Escolha imagens da biblioteca do seu espaço.' },
          { status: 400 },
        );
    }
    const now = Date.now();
    const result =
      payload.revision === 0
        ? await db
            .prepare(
              'INSERT INTO zero_projects (id, workspace_id, title, client, content_json, revision, updated_at) VALUES (?, ?, ?, ?, ?, 1, ?) ON CONFLICT(id) DO NOTHING',
            )
            .bind(
              payload.id,
              workspace,
              draft.title,
              draft.client,
              JSON.stringify(draft),
              now,
            )
            .run()
        : await db
            .prepare(
              'UPDATE zero_projects SET title = ?, client = ?, content_json = ?, revision = revision + 1, updated_at = ? WHERE id = ? AND workspace_id = ? AND revision = ?',
            )
            .bind(
              draft.title,
              draft.client,
              JSON.stringify(draft),
              now,
              payload.id,
              workspace,
              payload.revision,
            )
            .run();
    if (!result.meta.changes)
      return Response.json(
        {
          error:
            'Este rascunho mudou em outra janela. Baixe sua cópia editável antes de reabrir o salvo para comparar.',
        },
        { status: 409 },
      );
    return Response.json({
      project: {
        id: payload.id,
        revision: payload.revision + 1,
        updatedAt: now,
        draft,
      },
    });
  } catch {
    return Response.json(
      { error: 'Não foi possível salvar. Suas alterações continuam abertas.' },
      { status: 503 },
    );
  }
}
