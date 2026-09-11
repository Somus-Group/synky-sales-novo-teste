import type { Metadata } from 'next';
import './globals.css';
// Shell styling is kept separate so the visual refresh is easy to review/revert.
import './sales-ui.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://somus-flow.wca.chatgpt.site'),
  title: 'Synky Sales · CRM e Propostas',
  description: 'Gestão comercial e propostas para escritórios de arquitetura.',
  icons: {
    icon: [{ url: '/favicon.svg?v=4', type: 'image/svg+xml', sizes: 'any' }],
    shortcut: '/favicon.svg?v=4',
    apple: '/favicon.svg?v=4',
  },
  openGraph: {
    title: 'Synky Sales · CRM e Propostas',
    description: 'Gestão comercial e propostas para escritórios de arquitetura.',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'Synky Sales — CRM e propostas' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Synky Sales · CRM e Propostas',
    description: 'Gestão comercial e propostas para escritórios de arquitetura.',
    images: ['/og.png'],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
