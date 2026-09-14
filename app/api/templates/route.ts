import { getD1 } from '@/db';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import { getWorkspaceForUser } from '@/db/workspace';
import { limitedBody, normalizeImportedTemplate } from '@/lib/imported-template';
import { getCollectionDesign } from '@/lib/proposal-collection';

export async function GET() {
  try {
    const user = await getChatGPTUser();
    if (!user) return Response.json({ error: 'Entre na sua conta.' }, { status: 401 });
    const workspace = await getWorkspaceForUser(user);
    const rows = await getD1().prepare('SELECT id, name, niche, template, content_json AS contentJson FROM imported_templates WHERE workspace_id = ? ORDER BY updated_at DESC LIMIT 100').bind(workspace).all<{ id: string; name: string; niche: string; template: string; contentJson: string }>();
    return Response.json({ templates: rows.results.map(({ contentJson, ...row }) => ({ ...row, content: JSON.parse(contentJson) })) });
  } catch { return Response.json({ error: 'Não foi possível carregar os modelos importados.' }, { status: 503 }); }
}

export async function POST(request: Request) {
  try {
    const user = await getChatGPTUser();
    if (!user) return Response.json({ error: 'Entre na sua conta.' }, { status: 401 });
    const workspace = await getWorkspaceForUser(user);
    const item = normalizeImportedTemplate(JSON.parse(new TextDecoder().decode(await limitedBody(request, 160000))));
    if (!item || !/^[0-9a-f-]{36}$/i.test(item.id) || !getCollectionDesign(item.template)) return Response.json({ error: 'Revise os campos do modelo e escolha um layout válido.' }, { status: 400 });
    const db = getD1();
    const existing = await db.prepare('SELECT workspace_id AS workspace FROM imported_templates WHERE id = ?').bind(item.id).first<{ workspace: string }>();
    if (existing && existing.workspace !== workspace) return Response.json({ error: 'Modelo não encontrado.' }, { status: 404 });
    await db.prepare('INSERT INTO imported_templates (id, workspace_id, name, niche, template, content_json, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET name = excluded.name, niche = excluded.niche, template = excluded.template, content_json = excluded.content_json, updated_at = excluded.updated_at WHERE imported_templates.workspace_id = excluded.workspace_id')
      .bind(item.id, workspace, item.name, item.niche, item.template, JSON.stringify(item.content), Date.now()).run();
    return Response.json({ template: item });
  } catch (error) {
    if (error instanceof SyntaxError || error instanceof Error && error.message === 'empty') return Response.json({ error: 'Arquivo de modelo inválido.' }, { status: 400 });
    if (error instanceof Error && error.message === 'size') return Response.json({ error: 'O conteúdo excede o limite permitido.' }, { status: 413 });
    return Response.json({ error: 'Não foi possível salvar. Seu conteúdo permanece aberto para tentar novamente.' }, { status: 503 });
  }
}
