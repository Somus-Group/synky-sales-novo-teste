import postcss from 'postcss';

// Keep the reference's actual CSS instead of arbitrary slices of a utility bundle.
export function selectStudioReferenceStyles(css: string, classNames: string[]) {
  const classes = new Set(classNames);
  const colors = new Set<string>();
  const fonts = new Set<string>();
  let truncated = false;
  let styles = '';
  try {
    const root = postcss.parse(css);
    root.walkAtRules((rule) => {
      if (/^(import|font-face|keyframes|-webkit-keyframes)$/i.test(rule.name))
        rule.remove();
    });
    root.walkRules((rule) => {
      const relevant = rule.selectors.filter((selector) => {
        const names = [...selector.matchAll(/\.((?:\\.|[\w-])+)/g)].map(
          (match) => match[1].replace(/\\(.)/g, '$1'),
        );
        return names.length === 0 || names.every((name) => classes.has(name));
      });
      if (!relevant.length) {
        rule.remove();
        return;
      }
      rule.selectors = relevant;
    });
    root.walkDecls((decl) => {
      if (/url\s*\(|expression\s*\(/i.test(decl.value)) {
        decl.remove();
        return;
      }
      if (/color|background|border|^--/.test(decl.prop)) {
        for (const match of decl.value.matchAll(
          /#[\da-f]{3,8}\b|(?:rgba?|hsla?|oklch|oklab)\([^)]*\)/gi,
        ))
          if (colors.size < 24) colors.add(match[0]);
      }
      if (decl.prop === 'font-family' && fonts.size < 8) fonts.add(decl.value);
    });
    root.walkComments((comment) => {
      comment.remove();
    });
    root.walkAtRules((rule) => {
      if (!rule.nodes?.length) rule.remove();
    });
    // Preserve whole rules, especially responsive ones, without cutting CSS mid-rule.
    for (const node of root.nodes) {
      const value = node.toString();
      if (styles.length + value.length <= 64000) styles += value + '\n';
      else truncated = true;
    }
  } catch {
    truncated = true;
    // Invalid CSS is data from an external site; never claim it was understood.
  }
  return { styles, colors: [...colors], fonts: [...fonts], truncated };
}
