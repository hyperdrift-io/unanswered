import '../styles.css';

import type { ReactNode } from 'react';

type RootLayoutProps = { children: ReactNode };

export default async function RootLayout({ children }: RootLayoutProps) {
  return (
    <>
      <meta
        name="description"
        content="Open-source maintainers asked for help and nobody replied. Find the ones you can answer, with your first reply drafted."
      />
      <meta name="theme-color" content="#f6f1e8" />
      <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;1,6..72,400&family=IBM+Plex+Mono:wght@400;500&display=swap"
      />
      <header>
        <a href="/">unanswered</a>
        <span>help-wanted issues nobody replied to</span>
      </header>
      <main>{children}</main>
      <footer>
        <span>Built by <a href="https://hyperdrift.io">Hyperdrift</a> for the DEV Weekend Challenge: Generosity Edition. Gemini reads the asks; you write the reply.</span>
        <a href="https://github.com/hyperdrift-io/unanswered">github.com/hyperdrift-io/unanswered</a>
      </footer>
    </>
  );
}

export const getConfig = async () => {
  return { render: 'static' } as const;
};
