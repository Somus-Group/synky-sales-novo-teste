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
import {
  StudioError,
  referenceUrl,
  studioVisualInput,
  type StudioMessage,
} from '@/lib/studio';
import { editStudioHtml } from '@/lib/studio-html';

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
      action?: 'context' | 'visual';
      updatedAt?: number;
      title?: string;
      briefing?: string;
      referenceUrl?: string;
      edit?: unknown;
    };
    if (payload.action === 'context' || payload.action === 'visual') {
      if (
        !Number.isInteger(payload.revision) ||
        payload.updatedAt !== project.updatedAt
      )
        throw new StudioError(
          'O projeto foi atualizado. Reabra-o antes de salvar.',
          409,
        );
      token = await lockStudioProject(project, payload.revision!);
      if (payload.action === 'context') {
        if (
          typeof payload.title !== 'string' ||
          !payload.title.trim() ||
          payload.title.length > 120 ||
          typeof payload.briefing !== 'string' ||
          payload.briefing.length > 40000 ||
          typeof payload.referenceUrl !== 'string'
        )
          throw new StudioError(
            'Preencha o nome e um briefing de até 40.000 caracteres.',
          );
        const reference = referenceUrl(payload.referenceUrl);
        const saved = await db
          .prepare(
            "UPDATE studio_projects SET title = ?, briefing = ?, reference_url = ?, updated_at = ?, lock_token = '', locked_until = 0 WHERE id = ? AND lock_token = ? AND updated_at = ?",
          )
          .bind(
            payload.title.trim(),
            payload.briefing.trim(),
            reference,
            Math.max(Date.now(), project.updatedAt + 1),
            id,
            token,
            payload.updatedAt,
          )
          .run();
        if (!saved.meta.changes)
          throw new StudioError(
            'O projeto mudou em outra janela. Reabra-o.',
            409,
          );
      } else {
        const edit = studioVisualInput(payload.edit);
        const html = await editStudioHtml(project.html, edit);
        const messages: StudioMessage[] = JSON.parse(project.messagesJson);
        const summary = `Edição visual em ${edit.tag.toUpperCase()}.`;
        messages.push({
          role: 'assistant',
          text: summary,
          at: Date.now(),
          revision: project.revision + 1,
          usage: {
            model: 'none',
            inputTokens: 0,
            cachedTokens: 0,
            outputTokens: 0,
            estimatedUsd: 0,
          },
        });
        await saveStudioVersion(
          project,
          token,
          project.title,
          html,
          messages,
          summary,
        );
      }
      return Response.json({
        project: publicProject(await studioProject(id, workspaceId)),
        versions: await studioVersions(id),
      });
    }
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
      usage: {
        model: 'none',
        inputTokens: 0,
        cachedTokens: 0,
        outputTokens: 0,
        estimatedUsd: 0,
      },
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
