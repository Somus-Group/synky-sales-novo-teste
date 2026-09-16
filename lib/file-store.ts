import { env } from 'cloudflare:workers';

type FileMetadata = Record<string, string>;
type FilePutOptions = {
  contentType?: string;
  metadata?: FileMetadata;
};

type FileObject = {
  body: ReadableStream | null;
  etag?: string;
  contentType?: string;
  arrayBuffer(): Promise<ArrayBuffer>;
};

export type FileStore = R2Bucket | KVNamespace;

export function getFileStore(message = 'Armazenamento de arquivos indisponível.') {
  const store = (env as unknown as { FILES?: FileStore }).FILES;
  if (!store) throw new Error(message);
  return store;
}

export function maybeFileStore() {
  return (env as unknown as { FILES?: FileStore }).FILES;
}

export async function putFile(
  store: FileStore,
  key: string,
  value: ArrayBuffer | Uint8Array | string,
  options: FilePutOptions = {},
) {
  if (isKv(store)) {
    await store.put(key, value, {
      metadata: {
        ...(options.metadata || {}),
        ...(options.contentType ? { contentType: options.contentType } : {}),
      },
    });
    return;
  }
  await store.put(key, value, {
    httpMetadata: options.contentType
      ? { contentType: options.contentType }
      : undefined,
    customMetadata: options.metadata,
  });
}

export async function getFile(
  store: FileStore | undefined,
  key: string,
): Promise<FileObject | null> {
  if (!store) return null;
  if (isKv(store)) {
    const result = await store.getWithMetadata<FileMetadata>(key, {
      type: 'arrayBuffer',
    });
    if (!result.value) return null;
    const body = new Response(result.value).body;
    return {
      body,
      contentType: result.metadata?.contentType,
      async arrayBuffer() {
        return result.value as ArrayBuffer;
      },
    };
  }
  const object = await store.get(key);
  if (!object) return null;
  return {
    body: object.body,
    etag: object.httpEtag,
    contentType: object.httpMetadata?.contentType,
    arrayBuffer: () => object.arrayBuffer(),
  };
}

export async function deleteFile(store: FileStore | undefined, key: string) {
  if (!store) return;
  await store.delete(key);
}

function isKv(store: FileStore): store is KVNamespace {
  return 'getWithMetadata' in store;
}
