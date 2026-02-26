import { marked } from "marked";
import DOMPurify from "dompurify";

// Configure marked for full GFM support
marked.setOptions({
  gfm: true,
  breaks: true,
  pedantic: false,
});

/**
 * Parse markdown to safe HTML.
 * DOMPurify strips any XSS vectors from user content.
 */
export const parseMarkdown = (raw = "") => {
  const html = marked.parse(raw);
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    ADD_ATTR: ["target", "rel"],
  });
};

/**
 * Word and character stats
 */
export const getStats = (text = "") => {
  const trimmed = text.trim();
  const words = trimmed ? trimmed.split(/\s+/).length : 0;
  const chars = text.length;
  const charsNoSpaces = text.replace(/\s/g, "").length;
  const lines = text.split("\n").length;
  const readingTime = Math.max(1, Math.ceil(words / 200)); // avg 200 wpm
  return { words, chars, charsNoSpaces, lines, readingTime };
};

/**
 * Toolbar insertion helpers: wrap selection or insert at cursor
 */
export const wrapText = (before, after = before) => (view) => {
  const { state, dispatch } = view;
  const { from, to } = state.selection.main;
  const selected = state.sliceDoc(from, to);
  const newText = selected
    ? `${before}${selected}${after}`
    : `${before}placeholder${after}`;
  dispatch(
    state.update({
      changes: { from, to, insert: newText },
      selection: selected
        ? { anchor: from, head: from + newText.length }
        : { anchor: from + before.length, head: from + before.length + 11 },
    })
  );
  view.focus();
};

export const insertLine = (prefix) => (view) => {
  const { state, dispatch } = view;
  const { from } = state.selection.main;
  const line = state.doc.lineAt(from);
  const lineText = state.sliceDoc(line.from, line.to);
  const insert = lineText.startsWith(prefix)
    ? lineText.slice(prefix.length)
    : `${prefix}${lineText}`;
  dispatch(
    state.update({
      changes: { from: line.from, to: line.to, insert },
    })
  );
  view.focus();
};

export const insertSnippet = (snippet) => (view) => {
  const { state, dispatch } = view;
  const { from, to } = state.selection.main;
  dispatch(state.update({ changes: { from, to, insert: snippet } }));
  view.focus();
};

export const STARTER_CONTENT = `# Welcome to Inkwell ✍️

Start writing in **Markdown** and see it come alive on the right.

## Features

- **Bold**, *italic*, ~~strikethrough~~
- \`inline code\` and code blocks
- Tables, blockquotes, task lists
- Image upload, slash commands, and more

## Quick Shortcuts

| Action | Shortcut |
|--------|----------|
| Bold | \`Ctrl+B\` |
| Italic | \`Ctrl+I\` |
| Save | \`Ctrl+S\` |
| Focus Mode | \`Ctrl+Shift+F\` |
| Command Palette | \`/\` |

## Blockquote

> The best writing tool is the one that gets out of your way.

## Code

\`\`\`js
const greet = (name) => \`Hello, \${name}!\`;
console.log(greet("Inkwell"));
\`\`\`

---

Happy writing! 🚀
`;
