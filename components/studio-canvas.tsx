'use client';
import { useEffect, useRef, useState } from 'react';
import { studioElementSelector, studioPreviewDocument } from '@/lib/studio';
export type StudioSelection = {
  index: number;
  tag: string;
  text: string;
  editableText: boolean;
  color: string;
  background: string;
  fontSize: number;
  align: string;
};
export type StudioCanvasReport = {
  headings: string[];
  images: Array<{ src: string; alt: string; logo: boolean }>;
  brokenImages: number;
  overflow: boolean;
};
function hex(value: string, fallback: string) {
  const rgb = value.match(
    /^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)$/,
  );
  return !rgb || rgb[4] === '0'
    ? fallback
    : '#' +
        rgb
          .slice(1, 4)
          .map((x) => Number(x).toString(16).padStart(2, '0'))
          .join('');
}
export function StudioCanvas({
  html,
  selecting,
  className,
  onSelect,
  deviceWidth = 1280,
  onReport,
}: {
  html: string;
  selecting: boolean;
  className?: string;
  onSelect: (selection: StudioSelection) => void;
  deviceWidth?: number;
  onReport?: (report: StudioCanvasReport) => void;
}) {
  const frame = useRef<HTMLIFrameElement>(null);
  const surface = useRef<HTMLDivElement>(null);
  const [bounds, setBounds] = useState({ width: 0, height: 600 });
  const [loaded, setLoaded] = useState(0);
  const scale = Math.min(1, (bounds.width || deviceWidth) / deviceWidth);
  useEffect(() => {
    if (!surface.current) return;
    const observer = new ResizeObserver(([entry]) =>
      setBounds({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      }),
    );
    observer.observe(surface.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const doc = frame.current?.contentDocument;
    if (!doc || !loaded || !onReport) return;
    let active = true;
    const imgs = Array.from(doc.images);
    const report = () => {
      if (active)
        onReport({
          headings: Array.from(doc.querySelectorAll('h1,h2'))
            .map((item) => item.textContent?.trim() || '')
            .filter(Boolean)
            .slice(0, 20),
          images: imgs
            .filter((img) => img.src.startsWith('data:image/'))
            .map((img) => ({
              src: img.src,
              alt: img.alt,
              logo: img.dataset.studioRole === 'logo',
            })),
          brokenImages: imgs.filter((img) => img.complete && !img.naturalWidth)
            .length,
          overflow: doc.documentElement.scrollWidth > deviceWidth + 2,
        });
    };
    void Promise.allSettled(imgs.map((img) => img.decode())).then(report);
    return () => {
      active = false;
    };
  }, [loaded, html, deviceWidth, onReport]);
  useEffect(() => {
    const doc = frame.current?.contentDocument;
    if (!doc || !selecting) return;
    // The trusted parent attaches listeners; preview scripts stay disabled.
    const nodes = Array.from(
      doc.querySelectorAll<HTMLElement>(studioElementSelector),
    );
    const style = doc.createElement('style');
    style.textContent =
      '[data-studio-hover]{outline:2px dashed #0875ef!important;outline-offset:3px!important;cursor:crosshair!important}[data-studio-selected]{outline:2px solid #0875ef!important;outline-offset:3px!important}';
    doc.head.appendChild(style);
    const target = (event: Event) =>
      (event.target as Element | null)?.closest?.<HTMLElement>(
        studioElementSelector,
      ) || null;
    const hover = (event: Event) => {
      doc
        .querySelector('[data-studio-hover]')
        ?.removeAttribute('data-studio-hover');
      target(event)?.setAttribute('data-studio-hover', '');
    };
    const select = (event: Event) => {
      event.preventDefault();
      event.stopPropagation();
      const node = target(event);
      if (!node || !nodes.includes(node)) return;
      doc
        .querySelector('[data-studio-selected]')
        ?.removeAttribute('data-studio-selected');
      node.setAttribute('data-studio-selected', '');
      const css = doc.defaultView!.getComputedStyle(node);
      onSelect({
        index: nodes.indexOf(node),
        tag: node.tagName.toLowerCase(),
        text: (node.textContent || '').slice(0, 2000),
        editableText: node.children.length === 0 && node.tagName !== 'IMG',
        color: hex(css.color, '#172033'),
        background: hex(css.backgroundColor, '#ffffff'),
        fontSize: Math.min(
          160,
          Math.max(8, Math.round(parseFloat(css.fontSize))),
        ),
        align: ['center', 'right'].includes(css.textAlign)
          ? css.textAlign
          : 'left',
      });
    };
    doc.addEventListener('pointerover', hover);
    doc.addEventListener('click', select, true);
    return () => {
      doc.removeEventListener('pointerover', hover);
      doc.removeEventListener('click', select, true);
      style.remove();
      doc
        .querySelectorAll('[data-studio-hover],[data-studio-selected]')
        .forEach((node) => {
          node.removeAttribute('data-studio-hover');
          node.removeAttribute('data-studio-selected');
        });
    };
  }, [html, loaded, selecting, onSelect]);
  return (
    <div
      ref={surface}
      className={className}
      style={{
        position: 'relative',
        overflow: 'hidden',
        width: `min(100%, ${deviceWidth}px)`,
      }}
    >
      <iframe
        ref={frame}
        title="Proposta-site"
        style={{
          display: 'block',
          border: 0,
          width: deviceWidth,
          height: Math.max(300, bounds.height / scale),
          maxWidth: 'none',
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
        }}
        sandbox="allow-same-origin"
        referrerPolicy="no-referrer"
        srcDoc={studioPreviewDocument(html)}
        onLoad={() => setLoaded((value) => value + 1)}
      />
    </div>
  );
}
