import { saveAs } from "file-saver";
import { parseMarkdown } from "./markdownUtils";

/**
 * Export raw markdown as a .md file
 */
export const exportMarkdown = (content, title) => {
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  saveAs(blob, `${sanitizeFilename(title)}.md`);
};

/**
 * Export as a self-contained styled HTML file
 */
export const exportHTML = (content, title, theme) => {
  const body   = parseMarkdown(content);
  const colors = getThemeColors(theme);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: Georgia, 'Times New Roman', serif;
      background: ${colors.bg};
      color: ${colors.text};
      padding: 48px 24px 80px;
      line-height: 1.85;
    }
    .container {
      max-width: 720px;
      margin: 0 auto;
    }
    h1, h2, h3, h4, h5, h6 {
      font-family: system-ui, sans-serif;
      color: ${colors.heading};
      margin: 1.8em 0 0.5em;
      line-height: 1.3;
    }
    h1 { font-size: 2rem; border-bottom: 2px solid ${colors.border}; padding-bottom: 0.4em; }
    h2 { font-size: 1.5rem; border-bottom: 1px solid ${colors.border}; padding-bottom: 0.3em; }
    h3 { font-size: 1.25rem; }
    p  { margin: 0 0 1.2em; }
    a  { color: ${colors.accent}; text-decoration: none; border-bottom: 1px solid transparent; }
    a:hover { border-bottom-color: ${colors.accent}; }
    strong { color: ${colors.heading}; font-weight: 700; }
    code {
      background: ${colors.codeBg};
      border: 1px solid ${colors.border};
      border-radius: 4px;
      padding: 2px 6px;
      font-family: 'Fira Code', monospace;
      font-size: 0.88em;
      color: ${colors.accent};
    }
    pre {
      background: ${colors.codeBg};
      border: 1px solid ${colors.border};
      border-radius: 8px;
      padding: 16px 20px;
      overflow-x: auto;
      margin: 0 0 1.2em;
    }
    pre code { background: none; border: none; padding: 0; color: ${colors.text}; }
    blockquote {
      border-left: 4px solid ${colors.accent};
      background: ${colors.quoteBg};
      margin: 0 0 1.2em;
      padding: 12px 20px;
      border-radius: 0 4px 4px 0;
      color: ${colors.textMuted};
      font-style: italic;
    }
    ul, ol { margin: 0 0 1.2em; padding-left: 1.8em; }
    li { margin-bottom: 0.3em; }
    hr { border: none; border-top: 2px solid ${colors.border}; margin: 2em 0; }
    table { width: 100%; border-collapse: collapse; margin: 0 0 1.4em; }
    th { background: ${colors.codeBg}; color: ${colors.heading}; font-weight: 700; padding: 10px 14px; text-align: left; border: 1px solid ${colors.border}; }
    td { padding: 9px 14px; border: 1px solid ${colors.border}; }
    img { max-width: 100%; border-radius: 8px; margin: 0.5em 0; }
  </style>
</head>
<body>
  <div class="container">
    ${body}
  </div>
</body>
</html>`;

  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  saveAs(blob, `${sanitizeFilename(title)}.html`);
};

/**
 * Export as PDF via browser print dialog
 * Opens a hidden iframe with styled content and triggers print
 */
export const exportPDF = (content, title, theme) => {
  const body   = parseMarkdown(content);
  const colors = getThemeColors(theme);

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    @page { margin: 2cm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: Georgia, serif;
      font-size: 12pt;
      color: #1a1a1a;
      line-height: 1.8;
    }
    h1, h2, h3, h4, h5, h6 {
      font-family: system-ui, sans-serif;
      color: #000;
      margin: 1.5em 0 0.5em;
      page-break-after: avoid;
    }
    h1 { font-size: 22pt; border-bottom: 2pt solid #ccc; padding-bottom: 6pt; }
    h2 { font-size: 16pt; border-bottom: 1pt solid #ccc; padding-bottom: 4pt; }
    h3 { font-size: 13pt; }
    p  { margin: 0 0 1em; }
    a  { color: #2563eb; }
    code {
      background: #f4f4f5;
      border: 1px solid #e4e4e7;
      border-radius: 3px;
      padding: 1px 4px;
      font-family: monospace;
      font-size: 10pt;
    }
    pre {
      background: #f4f4f5;
      border: 1px solid #e4e4e7;
      border-radius: 6px;
      padding: 12px 16px;
      margin: 0 0 1em;
      page-break-inside: avoid;
      overflow: hidden;
    }
    pre code { background: none; border: none; padding: 0; }
    blockquote {
      border-left: 4px solid #6366f1;
      padding: 10px 16px;
      margin: 0 0 1em;
      color: #555;
      font-style: italic;
    }
    ul, ol { margin: 0 0 1em; padding-left: 1.6em; }
    li { margin-bottom: 0.25em; }
    hr { border: none; border-top: 1pt solid #ccc; margin: 1.5em 0; }
    table { width: 100%; border-collapse: collapse; margin: 0 0 1em; font-size: 10pt; }
    th { background: #f4f4f5; font-weight: 700; padding: 8px 12px; text-align: left; border: 1px solid #ccc; }
    td { padding: 7px 12px; border: 1px solid #ccc; }
    img { max-width: 100%; page-break-inside: avoid; }
  </style>
</head>
<body>${body}</body>
</html>`;

  const iframe = document.createElement("iframe");
  iframe.style.cssText = "position:fixed;top:-9999px;left:-9999px;width:0;height:0;border:none;";
  document.body.appendChild(iframe);

  iframe.contentDocument.open();
  iframe.contentDocument.write(html);
  iframe.contentDocument.close();

  setTimeout(() => {
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
    setTimeout(() => document.body.removeChild(iframe), 3000);
  }, 400);
};

/**
 * Export as DOCX using a simple XML-based approach
 */
export const exportDOCX = async (content, title) => {
  // Convert markdown to plain paragraphs with basic heading detection
  const lines = content.split("\n");
  const xmlParts = [];

  for (const line of lines) {
    if (!line.trim()) {
      xmlParts.push(`<w:p><w:pPr><w:spacing w:after="0"/></w:pPr></w:p>`);
      continue;
    }

    if (line.startsWith("# ")) {
      xmlParts.push(makeDocxHeading(line.slice(2), 1));
    } else if (line.startsWith("## ")) {
      xmlParts.push(makeDocxHeading(line.slice(3), 2));
    } else if (line.startsWith("### ")) {
      xmlParts.push(makeDocxHeading(line.slice(4), 3));
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      xmlParts.push(makeDocxBullet(line.slice(2)));
    } else if (/^\d+\. /.test(line)) {
      xmlParts.push(makeDocxBullet(line.replace(/^\d+\. /, ""), true));
    } else if (line.startsWith("> ")) {
      xmlParts.push(makeDocxQuote(line.slice(2)));
    } else {
      xmlParts.push(makeDocxParagraph(line));
    }
  }

  const docXml = buildDocx(title, xmlParts.join("\n"));
  const blob   = new Blob([docXml], {
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
  saveAs(blob, `${sanitizeFilename(title)}.docx`);
};

// ── DOCX XML helpers ────────────────────────────────────────────────────────

const escapeXml = (str) =>
  String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const makeDocxHeading = (text, level) => {
  const sizes   = { 1: "52", 2: "40", 3: "32" };
  const spacing = { 1: "400", 2: "320", 3: "240" };
  return `<w:p>
  <w:pPr>
    <w:pStyle w:val="Heading${level}"/>
    <w:spacing w:before="${spacing[level]}" w:after="120"/>
  </w:pPr>
  <w:r>
    <w:rPr><w:b/><w:sz w:val="${sizes[level]}"/></w:rPr>
    <w:t>${escapeXml(text)}</w:t>
  </w:r>
</w:p>`;
};

const makeDocxParagraph = (text) =>
  `<w:p>
  <w:pPr><w:spacing w:after="160"/></w:pPr>
  <w:r><w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r>
</w:p>`;

const makeDocxBullet = (text, numbered = false) =>
  `<w:p>
  <w:pPr>
    <w:numPr>
      <w:ilvl w:val="0"/>
      <w:numId w:val="${numbered ? 2 : 1}"/>
    </w:numPr>
    <w:spacing w:after="80"/>
    <w:ind w:left="720" w:hanging="360"/>
  </w:pPr>
  <w:r><w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r>
</w:p>`;

const makeDocxQuote = (text) =>
  `<w:p>
  <w:pPr>
    <w:ind w:left="720"/>
    <w:spacing w:before="160" w:after="160"/>
  </w:pPr>
  <w:r>
    <w:rPr><w:i/><w:color w:val="666666"/></w:rPr>
    <w:t xml:space="preserve">${escapeXml(text)}</w:t>
  </w:r>
</w:p>`;

const buildDocx = (title, bodyXml) => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas"
  xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:body>
    <w:p>
      <w:pPr><w:pStyle w:val="Title"/><w:spacing w:after="480"/></w:pPr>
      <w:r>
        <w:rPr><w:b/><w:sz w:val="64"/></w:rPr>
        <w:t>${escapeXml(title)}</w:t>
      </w:r>
    </w:p>
    ${bodyXml}
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/>
    </w:sectPr>
  </w:body>
</w:document>`;

// ── Theme color helpers ──────────────────────────────────────────────────────

const getThemeColors = (theme) => {
  const map = {
    default: {
      bg: "#0f0f10", text: "#d4d4d9", heading: "#ffffff",
      accent: "#7c6af7", border: "#2e2e33", codeBg: "#1c1c1f",
      textMuted: "#a0a0ab", quoteBg: "rgba(124,106,247,0.06)",
    },
    kids: {
      bg: "#fffbf2", text: "#3d3018", heading: "#1a1008",
      accent: "#f97316", border: "#f5dfa0", codeBg: "#fef3d6",
      textMuted: "#a08050", quoteBg: "rgba(249,115,22,0.07)",
    },
    women: {
      bg: "#fdf5f8", text: "#3d1828", heading: "#1a0810",
      accent: "#d6317a", border: "#f0c0d8", codeBg: "#fae4ef",
      textMuted: "#b06888", quoteBg: "rgba(214,49,122,0.06)",
    },
    men: {
      bg: "#090b10", text: "#a8b8d8", heading: "#dce8ff",
      accent: "#4a9ef4", border: "#1c2438", codeBg: "#121620",
      textMuted: "#8090b8", quoteBg: "rgba(74,158,244,0.06)",
    },
  };
  return map[theme] || map.default;
};

// ── Helpers ──────────────────────────────────────────────────────────────────

const sanitizeFilename = (name) =>
  (name || "document")
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 100)
    .toLowerCase() || "document";

const escapeHtml = (str) =>
  String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
