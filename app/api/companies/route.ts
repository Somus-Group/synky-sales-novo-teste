import { getChatGPTUser } from '@/app/chatgpt-auth';
import { createPipelineCompanyForUser, listPipelineCompaniesForUser, renamePipelineCompanyForUser } from '@/db/workspace';

export async function GET() {
  try {
    const user = await getChatGPTUser();
    if (!user) return Response.json({ error: 'Autenticação necessária.' }, { status: 401 });
    return Response.json({ companies: await listPipelineCompaniesForUser(user) });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Falha ao carregar empresas.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getChatGPTUser();
    if (!user) return Response.json({ error: 'Autenticação necessária.' }, { status: 401 });
    const payload = await request.json() as { name?: string };
    const name = payload.name?.trim() || '';
    if (!name) return Response.json({ error: 'Informe o nome da empresa.' }, { status: 400 });
    return Response.json({ company: await createPipelineCompanyForUser(user, name) }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Falha ao criar empresa.' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await getChatGPTUser();
    if (!user) return Response.json({ error: 'Autenticação necessária.' }, { status: 401 });
    const payload = await request.json() as { id?: string; name?: string };
    const id = payload.id?.trim() || '';
    const name = payload.name?.trim() || '';
    if (!id || !name) return Response.json({ error: 'Informe o nome da empresa.' }, { status: 400 });
    return Response.json({ company: await renamePipelineCompanyForUser(user, id, name) });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Falha ao atualizar a empresa.' }, { status: 500 });
  }
}
