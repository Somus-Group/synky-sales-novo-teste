import { env } from 'cloudflare:workers';
import {
  studioContext,
  studioProject,
  publicProject,
  studioFailure,
} from '@/db/studio';
import { referenceUrl, StudioError, type StudioSummary } from '@/lib/studio';

export async function GET() {
  try {
    const { db, workspaceId } = await studioContext();
    const projects = await db
      .prepare(
        'SELECT id, title, mode, revision, updated_at AS updatedAt FROM studio_projects WHERE workspace_id = ? ORDER BY updated_at DESC LIMIT 100',
      )
      .bind(workspaceId)
      .all<StudioSummary>();
    return Response.json({
      projects: projects.results,
      aiReady: Boolean(
        (env as unknown as { OPENAI_API_KEY?: string }).OPENAI_API_KEY,
      ),
    });
  } catch (error) {
    return studioFailure(error);
  }
}

export async function POST(request: Request) {
  let uploadedKey = '';
  const bucket = (env as unknown as { FILES?: R2Bucket }).FILES;
  try {
    const { db, workspaceId } = await studioContext();
    if (Number(request.headers.get('content-length')) > 9 * 1024 * 1024)
      throw new StudioError('O arquivo deve ter no máximo 8 MB.', 413);
    const form = await request.formData();
    const mode = form.get('mode');
    const title =
      String(form.get('title') || '')
        .trim()
        .slice(0, 120) || 'Nova proposta';
    let briefing = String(form.get('briefing') || '').trim();
    const reference = referenceUrl(String(form.get('referenceUrl') || ''));
    const file = form.get('file');
    if (mode !== 'briefing' && mode !== 'free')
      throw new StudioError('Escolha como começar o projeto.');
    if (briefing.length > 40000)
      throw new StudioError('O briefing deve ter até 40.000 caracteres.');
    if (
      mode === 'briefing' &&
      !briefing &&
      !(file instanceof File && file.size)
    )
      throw new StudioError('Cole ou anexe o briefing do cliente.');
    const id = crypto.randomUUID();
    let fileName = '';
    if (file instanceof File && file.size) {
      if (file.size > 8 * 1024 * 1024)
        throw new StudioError('O arquivo deve ter no máximo 8 MB.', 413);
      if (!/\.(pdf|txt|md)$/i.test(file.name))
        throw new StudioError('Envie um arquivo PDF, TXT ou Markdown.');
      fileName = file.name.slice(0, 180);
      if (/\.pdf$/i.test(file.name)) {
        const bytes = await file.arrayBuffer();
        if (!new TextDecoder().decode(bytes.slice(0, 5)).startsWith('%PDF-'))
          throw new StudioError('O arquivo não é um PDF válido.');
        if (!bucket)
          throw new StudioError(
            'O armazenamento de arquivos está indisponível. Cole o briefing no campo de texto.',
            503,
          );
        uploadedKey = `studio/${workspaceId}/${id}/briefing.pdf`;
        await bucket.put(uploadedKey, bytes, {
          httpMetadata: { contentType: 'application/pdf' },
        });
      } else {
        const text = await file.text();
        if (!text.trim()) throw new StudioError('O arquivo está vazio.');
        briefing = [briefing, text].filter(Boolean).join('\n\n');
        if (briefing.length > 40000)
          throw new StudioError(
            'O briefing e o arquivo juntos devem ter até 40.000 caracteres.',
          );
      }
    }
    const now = Date.now();
    await db
      .prepare(
        'INSERT INTO studio_projects (id, workspace_id, title, mode, briefing, reference_url, file_key, file_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      )
      .bind(
        id,
        workspaceId,
        title,
        mode,
        briefing,
        reference,
        uploadedKey,
        fileName,
        now,
        now,
      )
      .run();
    uploadedKey = '';
    return Response.json(
      {
        project: publicProject(await studioProject(id, workspaceId)),
        versions: [],
      },
      { status: 201 },
    );
  } catch (error) {
    if (uploadedKey && bucket) await bucket.delete(uploadedKey).catch(() => {});
    return studioFailure(error);
  }
}
