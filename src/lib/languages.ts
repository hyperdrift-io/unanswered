// "React and Postgres, a bit of Go" → ["TypeScript", "Go"], with no model call.
// GitHub's language names, keyed by the words people actually use for their stack.

const MAP: Record<string, string[]> = {
  TypeScript: ['typescript', 'ts', 'react', 'next', 'nextjs', 'angular', 'vue', 'svelte', 'node', 'nodejs', 'deno', 'bun', 'nest', 'nestjs', 'express', 'frontend', 'front-end', 'remix', 'astro'],
  JavaScript: ['javascript', 'js', 'jquery', 'webpack', 'vite', 'npm', 'browser'],
  Python: ['python', 'django', 'flask', 'fastapi', 'pandas', 'numpy', 'pytorch', 'tensorflow', 'scikit', 'jupyter', 'data science', 'machine learning', 'ml', 'llm', 'langchain'],
  Go: ['go', 'golang', 'kubernetes', 'k8s', 'docker', 'terraform', 'helm', 'grpc', 'infra', 'devops', 'sre'],
  Rust: ['rust', 'cargo', 'wasm', 'webassembly', 'tokio'],
  Java: ['java', 'spring', 'jvm', 'maven', 'gradle'],
  Kotlin: ['kotlin', 'android'],
  'C#': ['c#', 'csharp', '.net', 'dotnet', 'unity', 'blazor'],
  Ruby: ['ruby', 'rails'],
  PHP: ['php', 'laravel', 'symfony', 'wordpress'],
  Swift: ['swift', 'ios', 'macos', 'swiftui'],
  'C++': ['c++', 'cpp', 'qt', 'embedded', 'game engine'],
  Shell: ['bash', 'shell', 'zsh', 'scripting'],
  CSS: ['css', 'sass', 'scss', 'design systems', 'accessibility', 'a11y'],
  Dart: ['dart', 'flutter'],
  Elixir: ['elixir', 'phoenix'],
  Scala: ['scala'],
  Haskell: ['haskell'],
};

/** Up to two GitHub language names, most-mentioned first. Empty when nothing matches. */
export function guessLanguages(text: string): string[] {
  const lower = ` ${text.toLowerCase()} `;
  const tokens = new Set(lower.split(/[^a-z0-9#+.]+/).filter(Boolean).flatMap((t) => [t, t.replace(/\.+$/, '')]));
  const scores: { language: string; score: number; first: number }[] = [];
  for (const [language, words] of Object.entries(MAP)) {
    let score = 0;
    let first = Infinity;
    for (const w of words) {
      const hit = w.includes(' ') ? lower.includes(` ${w} `) || lower.includes(` ${w},`) : tokens.has(w);
      if (hit) {
        score += 1;
        first = Math.min(first, lower.indexOf(w));
      }
    }
    if (score) scores.push({ language, score, first });
  }
  return scores
    .sort((a, b) => b.score - a.score || a.first - b.first)
    .slice(0, 2)
    .map((s) => s.language);
}
