import {
  studioContext,
  studioProject,
  publicProject,
  studioVersions,
  studioFailure,
  lockStudioProject,
  unlockStudioProject,
  saveStudioVersion,
} from '@/db/studio';
import { StudioError, type StudioMessage } from '@/lib/studio';

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Context) {
  try {
    const { db, workspaceId } = await studioContext();
    const { id } = await context.params;
    const project = await studioProject(id, workspaceId);
    const version = new URL(request.url).searchParams.get('version');
    if (version !== null) {
      const result = await db
        .prepare(
          'SELECT html, title, revision FROM studio_versions WHERE project_id = ? AND revision = ?',
        )
        .bind(id, Number(version))
        .first();
      if (!result) throw new StudioError('Versão não encontrada.', 404);
      return Response.json({ version: result });
    }
    return Response.json({
      project: publicProject(project),
      versions: await studioVersions(id),
    });
  } catch (error) {
    return studioFailure(error);
  }
}

export async function PATCH(request: Request, context: Context) {
  let token = '';
  const { id } = await context.params;
  try {
    const { db, workspaceId } = await studioContext();
    const project = await studioProject(id, workspaceId);
    const payload = (await request.json()) as {
      restore?: number;
      revision?: number;
    };
    if (
      !Number.isInteger(payload.restore) ||
      !Number.isInteger(payload.revision)
    )
      throw new StudioError('Escolha uma versão para restaurar.');
    const version = await db
      .prepare(
        'SELECT title, html FROM studio_versions WHERE project_id = ? AND revision = ?',
      )
      .bind(id, payload.restore!)
      .first<{ title: string; html: string }>();
    if (!version) throw new StudioError('Versão não encontrada.', 404);
    token = await lockStudioProject(project, payload.revision!);
    const messages: StudioMessage[] = JSON.parse(project.messagesJson);
    const summary = `Versão ${payload.restore} restaurada.`;
    messages.push({
      role: 'assistant',
      text: summary,
      at: Date.now(),
      revision: project.revision + 1,
    });
    await saveStudioVersion(
      project,
      token,
      version.title,
      version.html,
      messages,
      summary,
    );
    return Response.json({
      project: publicProject(await studioProject(id, workspaceId)),
      versions: await studioVersions(id),
    });
  } catch (error) {
    return studioFailure(error);
  } finally {
    if (token) await unlockStudioProject(id, token);
  }
}
