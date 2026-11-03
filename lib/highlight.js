// Build-time syntax highlighting with @pierre/highlights (WebAssembly, no
// client-side JavaScript). Output is a <pre class="highlights"> with inline
// light-dark() colors, so it follows the page's color scheme.

import { codeToHtml, isSupportedLanguage } from "@pierre/highlights";
import githubLight from "@pierre/highlights/themes/github-light";
import githubDark from "@pierre/highlights/themes/github-dark";

const decoder = new TextDecoder();

const OPTIONS = {
  themes: { light: githubLight, dark: githubDark },
  defaultColor: "light-dark()",
};

export function highlight(code, lang) {
  if (!lang || !isSupportedLanguage(lang)) lang = "text";
  return decoder.decode(codeToHtml(code, { ...OPTIONS, lang }));
}

/**
 * Guess the language of an unlabeled code block. The old posts are nearly
 * all JavaScript, with a few HTML and CSS samples.
 */
export function guessLang(code) {
  const text = code.trim();
  if (/^<[!a-zA-Z/]/.test(text)) return "html";
  if (/^[\w.#:>+~*\[\]="'\s,-]+\{\s*\n[^{}]*:[^{}]*;/.test(text)) return "css";
  if (/\b(var|function|return|new|this|if|for|typeof)\b|[;{}()=]/.test(text)) return "js";
  return "text";
}

// markdown-it `highlight` hook for fenced code blocks.
export function markdownHighlight(code, lang) {
  if (!lang) lang = guessLang(code);
  if (lang === "text" || lang === "plain" || lang === "txt") return "";
  return highlight(code, lang);
}

const ENTITIES = { lt: "<", gt: ">", amp: "&", quot: '"', apos: "'", nbsp: " " };

function unescapeHtml(html) {
  return html.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
    if (e[0] === "#") {
      const n = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(n) ? String.fromCodePoint(n) : m;
    }
    return Object.hasOwn(ENTITIES, e.toLowerCase()) ? ENTITIES[e.toLowerCase()] : m;
  });
}

/**
 * Highlight the plain <pre><code> blocks in a post's HTML. Blocks that contain
 * other markup (emphasis, colored spans) are left untouched.
 */
export function highlightHtml(html) {
  return String(html).replace(/<pre>([\s\S]*?)<\/pre>/g, (match, inner) => {
    const body = inner.replace(/<\/?code>/g, "");
    if (/<[a-zA-Z/!]/.test(body)) return match;
    const code = unescapeHtml(body).replace(/^\n+/, "").replace(/\s+$/, "");
    const lang = guessLang(code);
    if (lang === "text") return match;
    return highlight(code, lang);
  });
}
