import { parse, serialize } from 'parse5';
import { editableReferenceHtml } from '@/lib/studio-reference';

type HtmlNode = { nodeName: string; value?: string; childNodes?: HtmlNode[]; tagName?: string };
export type CopyText = { path: number[]; text: string };

function collect(node: HtmlNode, path: number[], result: CopyText[], hidden = false) {
  const skip = hidden || ['script', 'style', 'noscript', 'template'].includes(node.tagName || '');
  if (node.nodeName === '#text' && !skip) {
    const text = node.value || '';
    const trimmed = text.trim();
    if (trimmed.length > 1 && trimmed.length <= 500 && result.length < 500) result.push({ path, text });
  }
  node.childNodes?.forEach((child, index) => collect(child, [...path, index], result, skip));
}

export async function proposalCopyTexts(html: string) {
  const tree = parse(await editableReferenceHtml(html)) as unknown as HtmlNode;
  const result: CopyText[] = [];
  collect(tree, [], result);
  return result;
}

export async function renderProposalCopy(html: string, replacements: Array<{ path: number[]; text: string }>) {
  if (replacements.length > 100) throw new Error('Edite até 100 trechos por proposta.');
  const tree = parse(await editableReferenceHtml(html)) as unknown as HtmlNode;
  const replaceAt = (node: HtmlNode, path: number[], replacement: string) => {
    let current = node;
    for (const index of path.slice(0, -1)) {
      const child = current.childNodes?.[index];
      if (!child) return false;
      current = child;
    }
    const target = current.childNodes?.[path[path.length - 1]];
    if (!target || target.nodeName !== '#text' || replacement.length > 2000) return false;
    const original = target.value || '';
    const leading = original.match(/^\s*/)?.[0] || '';
    const trailing = original.match(/\s*$/)?.[0] || '';
    target.value = `${leading}${replacement}${trailing}`;
    return true;
  };
  for (const item of replacements) {
    if (!Array.isArray(item.path) || !item.path.length || item.path.some((index) => !Number.isInteger(index) || index < 0) || typeof item.text !== 'string' || !replaceAt(tree, item.path, item.text)) {
      throw new Error('A página mudou desde a importação. Importe o link novamente.');
    }
  }
  return serialize(tree as never);
}
