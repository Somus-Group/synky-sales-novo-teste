import { StudioError } from '@/lib/studio';

export type StudioMedia = {
  id: string;
  label: string;
  kind: 'logo' | 'image';
  source: 'reference' | 'library' | 'attachment' | 'previous';
  dataUrl: string;
};
export function imageDataUrl(bytes: Uint8Array, mime: string) {
  const matches =
    mime === 'image/png'
      ? bytes[0] === 137 &&
        bytes[1] === 80 &&
        bytes[2] === 78 &&
        bytes[3] === 71
      : mime === 'image/jpeg'
        ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
        : mime === 'image/webp'
          ? new TextDecoder().decode(bytes.slice(0, 4)) === 'RIFF' &&
            new TextDecoder().decode(bytes.slice(8, 12)) === 'WEBP'
          : mime === 'image/gif'
            ? new TextDecoder().decode(bytes.slice(0, 6)).startsWith('GIF8')
            : false;
  if (!matches || bytes.length > 350000) return null;
  let binary = '';
  for (let index = 0; index < bytes.length; index += 16384)
    binary += String.fromCharCode(...bytes.subarray(index, index + 16384));
  return `data:${mime};base64,${btoa(binary)}`;
}

export async function prepareStudioMedia(
  db: D1Database,
  bucket: R2Bucket | undefined,
  workspaceId: string,
  reference: StudioMedia[],
  html: string,
) {
  const assets: StudioMedia[] = [];
  const rows = await db
    .prepare(
      "SELECT kind, name, caption, object_key AS objectKey, content_type AS contentType, size_bytes AS sizeBytes FROM brand_assets WHERE workspace_id = ? ORDER BY CASE kind WHEN 'logo' THEN 0 ELSE 1 END, id DESC LIMIT 5",
    )
    .bind(workspaceId)
    .all<{
      kind: string;
      name: string;
      caption: string;
      objectKey: string;
      contentType: string;
      sizeBytes: number;
    }>();
  const warnings: string[] = [];
  for (const row of rows.results) {
    if (row.sizeBytes > 350000) {
      warnings.push(
        `A imagem ${row.name} precisa de uma versão menor para entrar na proposta.`,
      );
      continue;
    }
    const object = await bucket?.get(row.objectKey);
    const dataUrl = object
      ? imageDataUrl(
          new Uint8Array(await object.arrayBuffer()),
          row.contentType,
        )
      : null;
    if (dataUrl)
      assets.push({
        id: `library-${assets.length + 1}`,
        label: row.caption || row.name,
        kind: row.kind === 'logo' ? 'logo' : 'image',
        source: 'library',
        dataUrl,
      });
    else if (row.kind === 'logo')
      warnings.push(
        `A logo ${row.name} não está disponível em PNG, JPG ou WebP. Anexe uma nova imagem.`,
      );
  }
  assets.push(...reference);
  // Keep old embedded images available without sending long base64 strings as text to the model.
  const currentHtml = await new HTMLRewriter()
    .on('img', {
      element(element) {
        const src = element.getAttribute('src') || '';
        if (!/^data:image\/(png|jpeg|webp|gif);base64,/i.test(src)) return;
        let asset = assets.find((item) => item.dataUrl === src);
        if (!asset && src.length < 470000) {
          asset = {
            id: `previous-${assets.length + 1}`,
            label: element.getAttribute('alt') || 'Imagem da versão anterior',
            kind:
              element.getAttribute('data-studio-role') === 'logo'
                ? 'logo'
                : 'image',
            source: 'previous',
            dataUrl: src,
          };
          assets.push(asset);
        }
        if (asset) element.setAttribute('src', `studio-asset:${asset.id}`);
      },
    })
    .transform(new Response(html))
    .text();
  let total = 0;
  const selected = assets
    .filter((asset) => {
      if (total + asset.dataUrl.length > 650000) {
        warnings.push(`A imagem ${asset.label} excedeu o limite desta versão.`);
        return false;
      }
      total += asset.dataUrl.length;
      return true;
    })
    .slice(0, 8);
  return { assets: selected, currentHtml, warnings };
}

export async function embedStudioMedia(html: string, assets: StudioMedia[]) {
  const used: StudioMedia[] = [];
  const unresolved: string[] = [];
  const result = await new HTMLRewriter()
    .on('img', {
      element(element) {
        const src = element.getAttribute('src') || '';
        const asset = assets.find(
          (item) => src === `studio-asset:${item.id}` || src === item.dataUrl,
        );
        if (!asset) {
          unresolved.push(
            element.getAttribute('alt') || src || 'Imagem sem endereço',
          );
          element.remove();
          return;
        }
        element.setAttribute('src', asset.dataUrl);
        element.setAttribute('data-studio-asset', asset.id);
        element.setAttribute('data-studio-role', asset.kind);
        element.setAttribute('alt', asset.label);
        element.setAttribute('decoding', 'async');
        if (asset.kind === 'logo') {
          element.setAttribute(
            'style',
            `${element.getAttribute('style') || ''};object-fit:contain;max-width:220px;max-height:72px;width:auto;height:auto;min-width:100px;opacity:1`,
          );
          element.setAttribute('loading', 'eager');
        }
        if (!used.some((item) => item.id === asset.id)) used.push(asset);
      },
    })
    .transform(new Response(html))
    .text();
  if (result.length > 1100000)
    throw new StudioError(
      'As imagens deixaram esta versão muito grande. Use arquivos menores.',
      422,
    );
  return { html: result, used, unresolved };
}
