import { referenceUrl, StudioError } from '@/lib/studio';
import { extractReactReference } from '@/lib/studio-reference-react';

export type StudioReference = {
  url: string;
  title: string;
  method: 'html' | 'react-source';
  text: string;
  structure: string;
  styles: string;
};
const unavailable = (message: string) =>
  new StudioError(message, 422, 'reference_unavailable');
const compact = (text: string) => text.replace(/\s+/g, ' ').trim();

export function isPublicAddress(address: string) {
  if (address.includes(':'))
    return (
      /^[23][0-9a-f]{3}:/i.test(address) &&
      !/^(2001:(0:|db8:|10:)|2002:)/i.test(address)
    );
  const bytes = address.split('.').map(Number);
  if (
    bytes.length !== 4 ||
    bytes.some((value) => !Number.isInteger(value) || value < 0 || value > 255)
  )
    return false;
  const [a, b] = bytes;
  return !(
    a === 0 ||
    a === 10 ||
    a === 127 ||
    a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && (b === 168 || b === 0)) ||
    (a === 198 && (b === 18 || b === 19 || b === 51)) ||
    (a === 203 && b === 0)
  );
}

async function boundedText(response: Response, limit: number) {
  if (Number(response.headers.get('content-length')) > limit) {
    await response.body?.cancel();
    throw unavailable(
      'A página de referência é muito grande. Envie um link direto para a proposta.',
    );
  }
  const reader = response.body?.getReader();
  if (!reader) return '';
  const decoder = new TextDecoder();
  let text = '';
  let bytes = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > limit)
        throw unavailable(
          'A referência excedeu o tamanho de leitura. Envie uma página menor.',
        );
      text += decoder.decode(chunk.value, { stream: true });
    }
    return text + decoder.decode();
  } finally {
    await reader.cancel().catch(() => {});
  }
}

export async function readStudioReference(
  value: string,
  parentSignal?: AbortSignal,
): Promise<StudioReference> {
  const url = referenceUrl(value);
  const signal = AbortSignal.any([
    ...(parentSignal ? [parentSignal] : []),
    AbortSignal.timeout(25000),
  ]);
  const checked = new Set<string>();
  let downloaded = 0;
  async function publicHost(host: string) {
    if (checked.has(host)) return;
    let addresses: string[] = [];
    for (const type of ['A', 'AAAA']) {
      const dns = await fetch(
        `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(host)}&type=${type}`,
        {
          headers: { Accept: 'application/dns-json' },
          signal,
        },
      );
      if (!dns.ok)
        throw unavailable(
          'Não foi possível verificar o endereço da referência. Tente novamente.',
        );
      const result = JSON.parse(await boundedText(dns, 32000)) as {
        Answer?: Array<{ type: number; data: string }>;
      };
      addresses = addresses.concat(
        (result.Answer || [])
          .filter((answer) => answer.type === 1 || answer.type === 28)
          .map((answer) => answer.data),
      );
    }
    if (
      !addresses.length ||
      addresses.some((address) => !isPublicAddress(address))
    )
      throw unavailable(
        'A referência precisa estar em um endereço público da internet.',
      );
    checked.add(host);
  }
  async function download(
    address: string,
    kind: 'page' | 'style' | 'script',
    limit: number,
  ) {
    let current = referenceUrl(address);
    for (let redirect = 0; redirect <= 4; redirect++) {
      await publicHost(new URL(current).hostname);
      const response = await fetch(current, {
        redirect: 'manual',
        signal,
        headers: {
          Accept:
            kind === 'page'
              ? 'text/html,application/xhtml+xml'
              : kind === 'style'
                ? 'text/css'
                : 'application/javascript,text/javascript',
        },
      });
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        await response.body?.cancel();
        const location = response.headers.get('location');
        if (!location) break;
        current = referenceUrl(new URL(location, current).href);
        continue;
      }
      if (!response.ok) {
        await response.body?.cancel();
        throw unavailable(
          response.status === 401 || response.status === 403
            ? 'O site de referência bloqueou a leitura ou exige login. Use o link público de compartilhamento ou anexe uma imagem do modelo.'
            : `Não foi possível abrir a referência (HTTP ${response.status}). Confira o link público e tente novamente.`,
        );
      }
      const mime = response.headers.get('content-type') || '';
      if (
        !(
          kind === 'page'
            ? /text\/html|application\/xhtml\+xml/i
            : kind === 'style'
              ? /text\/css/i
              : /(?:java|ecma)script|text\/plain/i
        ).test(mime)
      ) {
        await response.body?.cancel();
        throw unavailable(
          'Esse link não abriu uma página de proposta. Use o link público da apresentação, não o endereço do editor ou download.',
        );
      }
      const text = await boundedText(
        response,
        Math.min(limit, 5_000_000 - downloaded),
      );
      downloaded += new TextEncoder().encode(text).length;
      return { url: current, text };
    }
    throw unavailable(
      'O link de referência redireciona muitas vezes. Envie o endereço final da proposta.',
    );
  }
  try {
    const page = await download(url, 'page', 1_000_000);
    const stylesheets: string[] = [];
    const scripts: string[] = [];
    let title = '';
    let text = '';
    let structure = '';
    let css = '';
    let headings = 0;
    // HTMLRewriter parses markup without running scripts or loading any resources.
    let hidden = 0;
    const parser = new HTMLRewriter()
      .on('script,style,noscript,template,svg', {
        element(element) {
          hidden++;
          element.onEndTag(() => {
            hidden--;
          });
        },
      })
      .on('title', {
        text(chunk) {
          title += chunk.text;
        },
      })
      .on('link[rel="stylesheet"]', {
        element(element) {
          const href = element.getAttribute('href');
          if (href) stylesheets.push(href);
        },
      })
      .on('script[src]', {
        element(element) {
          const src = element.getAttribute('src');
          if (
            src &&
            (element.getAttribute('type') === 'module' ||
              /(?:\/assets\/|\/_next\/static\/)/.test(src))
          )
            scripts.push(src);
        },
      })
      .on('style', {
        text(chunk) {
          if (css.length < 48000) css += chunk.text;
        },
      })
      .on('body *', {
        element(element) {
          if (
            hidden ||
            structure.length >= 45000 ||
            /^(script|style|noscript|template|svg)$/.test(element.tagName)
          )
            return;
          if (/^h[1-6]$/.test(element.tagName)) headings++;
          const attributes = Object.fromEntries(
            ['class', 'style', 'id', 'alt', 'href', 'src']
              .map((name) => [name, element.getAttribute(name)])
              .filter(([, value]) => value !== null),
          );
          structure += `\n${element.tagName} ${JSON.stringify(attributes)}`;
          if (/^(h[1-6]|p|li|section|div)$/.test(element.tagName)) text += '\n';
        },
      })
      .on('body', {
        text(chunk) {
          if (hidden) return;
          if (text.length < 24000) text += chunk.text;
          if (structure.length < 45000) structure += chunk.text;
        },
      });
    await parser.transform(new Response(page.text)).text();
    const resolveAsset = (path: string) => {
      const asset = new URL(path, page.url);
      // Do not crawl arbitrary links or send session/authentication headers.
      return referenceUrl(asset.href);
    };
    for (const stylesheet of [...new Set(stylesheets)].slice(0, 3)) {
      try {
        css +=
          '\n' +
          (await download(resolveAsset(stylesheet), 'style', 250000)).text;
      } catch {
        /* Optional style; page content remains required. */
      }
    }
    let method: StudioReference['method'] = 'html';
    if (compact(text).length < 250 || headings < 2) {
      const queue = [...new Set(scripts)].map(resolveAsset);
      const visited = new Set<string>();
      let appText = '';
      let appStructure = '';
      let appHeadings = 0;
      while (queue.length && visited.size < 4) {
        const asset = queue.shift()!;
        if (visited.has(asset)) continue;
        visited.add(asset);
        try {
          const script = await download(asset, 'script', 2_000_000);
          const extracted = extractReactReference(script.text);
          appText += '\n' + extracted.text;
          appStructure += '\n' + extracted.structure;
          appHeadings += extracted.headings;
          for (const path of extracted.imports) {
            const next = referenceUrl(new URL(path, script.url).href);
            if (
              new URL(next).origin === new URL(page.url).origin &&
              !visited.has(next)
            )
              queue.push(next);
          }
        } catch {
          /* Try the other declared application modules, within the same budget. */
        }
      }
      if (compact(appText).length >= 250 && appHeadings >= 2) {
        text = appText;
        structure = appStructure;
        headings = appHeadings;
        method = 'react-source';
      }
    }
    if (compact(text).length < 250 || headings < 2)
      throw unavailable(
        'O link abriu, mas não trouxe conteúdo suficiente da proposta. Use a página pública completa ou anexe imagens do modelo. Sua proposta atual não foi alterada.',
      );
    return {
      url: page.url,
      title: compact(title).slice(0, 200),
      method,
      text: compact(text).slice(0, 24000),
      structure: structure.slice(0, 55000),
      styles:
        css.length <= 48000
          ? css
          : css.slice(0, 16000) +
            '\n/* Amostra resumida */\n' +
            css.slice(-32000),
    };
  } catch (error) {
    if (error instanceof StudioError) throw error;
    throw unavailable(
      signal.aborted
        ? 'A referência demorou demais para responder. Tente novamente; sua proposta atual está salva.'
        : 'Não foi possível ler o link de referência. Confira se ele é público ou anexe uma imagem do modelo. Sua proposta atual está salva.',
    );
  }
}
