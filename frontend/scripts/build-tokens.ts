import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

type ThemedValue = string | Record<string, string>;

type Token = {
  name: string;
  value: ThemedValue;
};

type TypeStyle = {
  name: string;
  fontSize: string;
  lineHeight: string | number;
  fontWeight: string | number;
  letterSpacing?: string;
};

type TypeGroup = {
  name: string;
  family: string;
  styles: TypeStyle[];
};

type TokensFile = {
  name: string;
  color: { themes: { id: string; name: string }[]; tokens: Token[] };
  type: { families: Record<string, string>; groups: TypeGroup[] };
} & Record<string, { tokens: Token[] } | unknown>;

const SKIPPED_KEYS = new Set(['name', 'version', 'type', 'meta']);

const FAMILY_LABELS: Record<string, string> = {
  color: 'Cor',
  spacing: 'Espaçamento',
  radius: 'Raio',
  shadow: 'Sombra',
  duration: 'Duração',
  easing: 'Curva',
  size: 'Tamanho de controle',
  zIndex: 'Camada',
};

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sourcePath = resolve(root, 'src/styles/tokens.json');
const outputPath = resolve(root, 'src/styles/tokens.css');

const source = JSON.parse(readFileSync(sourcePath, 'utf8')) as TokensFile;

const themes = source.color.themes.map((theme) => theme.id);
const [primaryTheme, ...otherThemes] = themes;

function resolveAliases(raw: string): string {
  return raw.replace(/\{([^}]+)\}/g, (_, name: string) => `var(--${name})`);
}

function valueForTheme(token: Token, theme: string): string | undefined {
  if (typeof token.value === 'string') {
    return theme === primaryTheme ? resolveAliases(token.value) : undefined;
  }
  const picked = token.value[theme];
  return picked === undefined ? undefined : resolveAliases(picked);
}

function tokenFamilies(): [string, Token[]][] {
  return Object.entries(source)
    .filter(([key]) => !SKIPPED_KEYS.has(key))
    .map(([key, family]) => [key, (family as { tokens: Token[] }).tokens] as [string, Token[]]);
}

function declaration(name: string, value: string): string {
  return `  --${name}: ${value};`;
}

function typographyBlock(): string[] {
  const lines: string[] = ['', '  /* Tipografia */'];

  for (const [alias, stack] of Object.entries(source.type.families)) {
    lines.push(declaration(`font-${alias}`, stack));
  }

  for (const group of source.type.groups) {
    lines.push(`  /* ${group.name} */`);
    for (const style of group.styles) {
      const shorthand = `${style.fontWeight} ${style.fontSize}/${style.lineHeight} var(--font-${group.family})`;
      lines.push(declaration(`text-${style.name}`, shorthand));
      if (style.letterSpacing) {
        lines.push(declaration(`tracking-${style.name}`, style.letterSpacing));
      }
    }
  }

  return lines;
}

function lightBlock(): string {
  const lines: string[] = [':root {'];

  for (const [family, tokens] of tokenFamilies()) {
    lines.push('', `  /* ${FAMILY_LABELS[family] ?? family} */`);
    for (const token of tokens) {
      const value = valueForTheme(token, primaryTheme);
      if (value !== undefined) lines.push(declaration(token.name, value));
    }
  }

  lines.push(...typographyBlock());
  lines.push('}');
  return lines.join('\n');
}

function overridesFor(theme: string): string[] {
  const lines: string[] = [];

  for (const [, tokens] of tokenFamilies()) {
    for (const token of tokens) {
      if (typeof token.value === 'string') continue;
      const value = token.value[theme];
      const base = token.value[primaryTheme];
      if (value === undefined || value === base) continue;
      lines.push(declaration(token.name, resolveAliases(value)));
    }
  }

  return lines;
}

function darkBlocks(): string {
  const blocks: string[] = [];

  for (const theme of otherThemes) {
    const overrides = overridesFor(theme);
    if (overrides.length === 0) continue;

    const indented = overrides.map((line) => `  ${line}`);

    blocks.push(
      [
        `@media (prefers-color-scheme: ${theme}) {`,
        `  :root:not([data-theme="${primaryTheme}"]) {`,
        ...indented,
        `    color-scheme: ${theme};`,
        '  }',
        '}',
      ].join('\n'),
    );

    // Sem o prefixo :root de propósito. O tema precisa valer numa SUBÁRVORE:
    // é assim que a projeção fica clara com o sistema operacional no escuro.
    blocks.push(
      [`[data-theme="${theme}"] {`, ...overrides, `  color-scheme: ${theme};`, '}'].join('\n'),
    )

    // E o caminho de volta: uma subárvore clara dentro de uma raiz escura precisa
    // redefinir os mesmos tokens, senão herda o texto claro sobre fundo claro.
    const backToPrimary = overrides.map((line) => {
      const name = line.slice(line.indexOf('--') + 2, line.indexOf(':', 2)).trim()
      const token = tokenFamilies()
        .flatMap(([, tokens]) => tokens)
        .find((entry) => entry.name === name)
      const value = token ? valueForTheme(token, primaryTheme) : undefined
      return value === undefined ? null : declaration(name, value)
    })

    blocks.push(
      [
        `[data-theme="${primaryTheme}"] {`,
        ...backToPrimary.filter((line): line is string => line !== null),
        `  color-scheme: ${primaryTheme};`,
        '}',
      ].join('\n'),
    );
  }

  return blocks.join('\n\n');
}

const header = [
  `/* ${source.name} — tokens gerados a partir de src/styles/tokens.json.`,
  '   Gerado por scripts/build-tokens.ts (npm run tokens). Não edite à mão:',
  '   troque o valor no tokens.json e rode o script de novo.',
  '',
  '   Os blocos de tema usam seletor de atributo sem prefixo de raiz, para o tema',
  '   valer numa subárvore: é assim que a projeção fica clara com o sistema',
  '   operacional no escuro. */',
].join('\n');

const css = [
  header,
  '',
  lightBlock(),
  '',
  `:root, [data-theme="${primaryTheme}"] { color-scheme: ${primaryTheme}; }`,
  '',
  darkBlocks(),
  '',
].join('\n');

writeFileSync(outputPath, css, 'utf8');

const tokenCount = tokenFamilies().reduce((total, [, tokens]) => total + tokens.length, 0);
const styleCount = source.type.groups.reduce((total, group) => total + group.styles.length, 0);
process.stdout.write(`tokens.css: ${tokenCount} tokens, ${styleCount} estilos de texto\n`);
