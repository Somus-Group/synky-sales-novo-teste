import { parse, type Node } from 'acorn';
import { full } from 'acorn-walk';

// Inspect the syntax tree only. Never import or execute a reference site's code.
type Syntax = Node & { [key: string]: unknown };
const node = (value: unknown) => value as Syntax | undefined;
const nodes = (value: unknown) => (value || []) as Syntax[];
const key = (value: unknown) => {
  const item = node(value);
  return String(item?.name || item?.value || '');
};
const tags =
  /^(h[1-6]|p|span|li|ul|ol|section|main|header|footer|nav|div|article|aside|table|tr|td|th)$/;

export function extractReactReference(source: string) {
  const ast = parse(source, { ecmaVersion: 'latest', sourceType: 'module' });
  const bindings = new Map<string, Syntax>();
  for (const statement of nodes((ast as unknown as Syntax).body)) {
    if (statement.type !== 'VariableDeclaration') continue;
    for (const declaration of nodes(statement.declarations)) {
      if (node(declaration.id)?.type === 'Identifier' && declaration.init)
        bindings.set(key(declaration.id), node(declaration.init)!);
    }
  }
  let steps = 0;
  function literal(value: unknown, depth = 0): unknown {
    const item = node(value);
    if (depth === 0) steps = 0;
    if (!item || depth > 8 || ++steps > 50000) return undefined;
    if (item.type === 'Literal')
      return typeof item.value === 'string'
        ? item.value.slice(0, 2500)
        : typeof item.value === 'number'
          ? item.value
          : undefined;
    if (item.type === 'Identifier')
      return literal(bindings.get(key(item)), depth + 1);
    if (item.type === 'ArrayExpression')
      return nodes(item.elements)
        .slice(0, 40)
        .map((entry) => literal(entry, depth + 1));
    if (item.type === 'ObjectExpression') {
      const result: Record<string, unknown> = Object.create(null);
      for (const prop of nodes(item.properties).slice(0, 30)) {
        const name = key(prop.key);
        if (
          prop.type !== 'Property' ||
          prop.computed ||
          /^on[A-Z]|__proto__|constructor/.test(name)
        )
          continue;
        const resultValue = literal(prop.value, depth + 1);
        if (resultValue !== undefined) result[name] = resultValue;
      }
      return result;
    }
    if (item.type === 'MemberExpression' && !item.computed) {
      const object = literal(item.object, depth + 1);
      if (object && typeof object === 'object')
        return (object as Record<string, unknown>)[key(item.property)];
    }
    if (item.type === 'TemplateLiteral')
      return nodes(item.quasis)
        .map(
          (part, index) =>
            String((part.value as { cooked?: string }).cooked || '') +
            String(literal(nodes(item.expressions)[index], depth + 1) || ''),
        )
        .join('');
    if (item.type === 'ConditionalExpression')
      return [
        literal(item.consequent, depth + 1),
        literal(item.alternate, depth + 1),
      ]
        .filter(Boolean)
        .join(' ');
    return undefined;
  }
  const elements: Array<{
    tag: string;
    attributes: Record<string, unknown>;
    text: string;
    position: number;
    end: number;
  }> = [];
  const repeated: unknown[] = [];
  const imports: string[] = [];
  const textValue = (value: unknown): string =>
    Array.isArray(value)
      ? value.map(textValue).filter(Boolean).join(' ')
      : typeof value === 'string' || typeof value === 'number'
        ? String(value)
        : '';
  const structuredCopy: string[] = [];
  const collectStructuredCopy = (value: unknown, depth = 0) => {
    if (depth > 8 || structuredCopy.length >= 120) return;
    if (Array.isArray(value)) {
      for (const entry of value) collectStructuredCopy(entry, depth + 1);
      return;
    }
    if (!value || typeof value !== 'object') return;
    const record = value as Record<string, unknown>;
    const title = typeof record.title === 'string' ? record.title.trim() : '';
    const floors = Array.isArray(record.floors) ? record.floors : [];
    if (title && floors.length && typeof record.objective === 'string') {
      const add = (text: unknown) => {
        if (typeof text !== 'string') return;
        const clean = text.trim();
        if (
          clean.length > 2 &&
          !/(?:ignore.{0,50}(?:instructions?|instru[cç][oõ]es)|n[aã]o tem mais nada a alterar|execute\s*\/\s*responda.{0,80}tarefa)/i.test(clean)
        )
          structuredCopy.push(clean.slice(0, 2000));
      };
      add(title);
      add(record.subtitle);
      add(record.intro);
      structuredCopy.push('OBJETIVO');
      add(record.objective);
      structuredCopy.push(`O QUE TRABALHAMOS EM ${title}`);
      floors.slice(0, 12).forEach((floor, index) => {
        if (!floor || typeof floor !== 'object') return;
        const item = floor as Record<string, unknown>;
        structuredCopy.push(String(index + 1).padStart(2, '0'));
        add(item.name);
        add(item.desc);
      });
      return;
    }
    for (const item of Object.values(record))
      collectStructuredCopy(item, depth + 1);
  };
  full(ast, (original) => {
    const item = original as Syntax;
    if (item.type === 'ImportDeclaration' || item.type === 'ImportExpression') {
      const path = literal(item.source);
      if (typeof path === 'string' && /^(\.?\.?\/).*\.m?js(?:\?|$)/.test(path))
        imports.push(path);
    }
    if (item.type !== 'CallExpression') return;
    const callee = node(item.callee);
    const name =
      callee?.type === 'MemberExpression' ? key(callee.property) : key(callee);
    const args = nodes(item.arguments);
    if (name === 'map' && repeated.length < 12) {
      const values = literal(callee?.object);
      if (Array.isArray(values) && JSON.stringify(values).length > 60)
        repeated.push(values);
    }
    if (
      !/^(jsx|jsxs|jsxDEV|createElement)$/.test(name) ||
      args[1]?.type !== 'ObjectExpression'
    )
      return;
    const tag =
      args[0]?.type === 'MemberExpression'
        ? key(args[0].property)
        : String(literal(args[0]) || '');
    if (!tags.test(tag)) return;
    const attributes: Record<string, unknown> = {};
    let text = '';
    for (const prop of nodes(args[1].properties)) {
      const name = key(prop.key);
      if (prop.type !== 'Property' || prop.computed) continue;
      if (name === 'children') text = textValue(literal(prop.value));
      if (['className', 'style', 'id', 'src', 'alt', 'href'].includes(name)) {
        const value = literal(prop.value);
        if (value !== undefined) attributes[name] = value;
      }
    }
    if (name === 'createElement')
      text += args
        .slice(2)
        .map((part) => textValue(literal(part)))
        .join(' ');
    const untrustedOrFallbackCopy =
      /(?:n[aã]o tem mais nada a alterar|execute\s*\/\s*responda.{0,80}tarefa|ignore.{0,50}(?:instructions?|instru[cç][oõ]es)|page not found|oops!?|^404$)/i.test(
        text,
      );
    if (!untrustedOrFallbackCopy && (text || Object.keys(attributes).length))
      elements.push({
        tag,
        attributes,
        text: text.slice(0, 2500),
        position: item.start,
        end: item.end,
      });
  });
  elements.sort((a, b) => a.position - b.position);
  const useful = elements.slice(0, 650);
  const hierarchy: number[] = [];
  const nested = useful.map((element) => {
    while (
      hierarchy.length &&
      useful[hierarchy[hierarchy.length - 1]].end <= element.position
    )
      hierarchy.pop();
    const depth = hierarchy.length;
    hierarchy.push(useful.indexOf(element));
    return { ...element, depth };
  });
  return {
    structure: JSON.stringify({
      elements: nested.map(({ position: _position, end: _end, ...element }) => element),
      repeatedContent: repeated,
    }).slice(0, 55000),
    text: useful
      .map((item) => item.text)
      .filter(Boolean)
      .concat(
        (() => {
          repeated.forEach((value) => collectStructuredCopy(value));
          return [...new Set(structuredCopy)];
        })(),
      )
      .join('\n')
      .slice(0, 24000),
    headings: useful.filter((item) => /^h[1-6]$/.test(item.tag) && item.text)
      .length,
    sectionOrder: useful
      .filter((item) => /^h[12]$/.test(item.tag) && item.text)
      .map((item) => item.text),
    classNames: useful.flatMap((item) =>
      String(item.attributes.className || '').split(/\s+/),
    ),
    imports: [...new Set(imports)].slice(0, 4),
    images: useful
      .filter(
        (item) => item.tag === 'img' && typeof item.attributes.src === 'string',
      )
      .map((item) => ({
        src: String(item.attributes.src),
        alt: String(item.attributes.alt || ''),
        logo: /logo|brand|h-10|h-12|h-8/i.test(JSON.stringify(item.attributes)),
      })),
  };
}
