import { getD1 } from '@/db';
import { getFile, maybeFileStore } from '@/lib/file-store';

export async function GET(_request: Request, context: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await context.params;
    if (!/^[0-9a-f-]{36}$/i.test(token)) return new Response('Imagem não encontrada.', { status: 404 });
    const asset = await getD1().prepare('SELECT object_key AS objectKey, content_type AS contentType FROM brand_assets WHERE public_token = ? LIMIT 1').bind(token).first<{ objectKey: string; contentType: string }>();
    if (!asset) return new Response('Imagem não encontrada.', { status: 404 });
    const store = maybeFileStore();
    if (!store) return new Response('Biblioteca indisponível.', { status: 503 });
    const object = await getFile(store, asset.objectKey);
    if (!object) return new Response('Imagem não encontrada.', { status: 404 });
    const headers = new Headers({ 'Content-Type': object.contentType || asset.contentType, 'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400' });
    if (object.etag) headers.set('ETag', object.etag);
    return new Response(object.body, { headers });
  } catch {
    return new Response('Falha ao carregar a imagem.', { status: 500 });
  }
}
