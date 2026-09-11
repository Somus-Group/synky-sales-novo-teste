# Synky browser icon

The favicon embeds the original Synky symbol supplied by the user on 2026-09-11,
instead of the unrelated hand-drawn mark. The square SVG viewport trims only
empty side margins; it does not redraw the supplied logo.

The icon URL in app/layout.tsx uses version 4 to invalidate the previous cached
icon. Preserve the original embedded image when updating brand metadata.
