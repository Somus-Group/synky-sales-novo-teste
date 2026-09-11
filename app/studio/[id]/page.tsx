import { requireChatGPTUser } from '@/app/chatgpt-auth';
import { getWorkspaceForUser } from '@/db/workspace';
import { studioProject } from '@/db/studio';
import { studioPreviewDocument, StudioError } from '@/lib/studio';
import { notFound } from 'next/navigation';

export const metadata = {
  title: 'Prévia privada | Estúdio Lab',
  robots: { index: false, follow: false },
};

export default async function StudioPreview({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireChatGPTUser(`/studio/${id}`);
  const workspaceId = await getWorkspaceForUser(user);
  let project;
  try {
    project = await studioProject(id, workspaceId);
  } catch (error) {
    if (error instanceof StudioError && error.status === 404) notFound();
    throw error;
  }
  if (!project.html)
    return (
      <main style={{ padding: 32 }}>
        Este projeto ainda não tem uma versão criada.
      </main>
    );
  return (
    <iframe
      title={project.title}
      sandbox=""
      referrerPolicy="no-referrer"
      srcDoc={studioPreviewDocument(project.html)}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        border: 0,
        background: 'white',
      }}
    />
  );
}
