import { useState } from "react";
import {
  exportMarkdown,
  exportHTML,
  exportPDF,
  exportDOCX,
} from "../../utils/exportUtils";
import styles from "./ExportModal.module.css";
import clsx from "clsx";

const FORMATS = [
  {
    id:    "md",
    label: "Markdown",
    ext:   ".md",
    icon:  "M↓",
    desc:  "Raw markdown file. Open in any text editor or Obsidian.",
    color: "#7c6af7",
  },
  {
    id:    "html",
    label: "HTML",
    ext:   ".html",
    icon:  "</>",
    desc:  "Self-contained styled webpage. Open in any browser.",
    color: "#f97316",
  },
  {
    id:    "pdf",
    label: "PDF",
    ext:   ".pdf",
    icon:  "📋",
    desc:  "Print-quality PDF via browser print dialog.",
    color: "#ef4444",
  },
  {
    id:    "docx",
    label: "Word",
    ext:   ".docx",
    icon:  "W",
    desc:  "Microsoft Word document with headings and formatting.",
    color: "#2563eb",
  },
];

const ExportModal = ({ isOpen, onClose, document, theme }) => {
  const [loading, setLoading]   = useState(null);
  const [done, setDone]         = useState(null);

  if (!isOpen || !document) return null;

  const handleExport = async (formatId) => {
    setLoading(formatId);
    setDone(null);

    try {
      const title   = document.title || "Untitled";
      const content = document.content || "";

      if (formatId === "md")   exportMarkdown(content, title);
      if (formatId === "html") exportHTML(content, title, theme);
      if (formatId === "pdf")  exportPDF(content, title, theme);
      if (formatId === "docx") await exportDOCX(content, title);

      setDone(formatId);
      setTimeout(() => setDone(null), 2500);
    } catch (err) {
      console.error("Export error:", err);
    } finally {
      setLoading(null);
    }
  };

  const wordCount = (document.content || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

  return (
    <div
      className={styles.overlay}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className={styles.modal}>
        <div className={styles.header}>
          <div>
            <h2 className={styles.title}>Export Document</h2>
            <p className={styles.meta}>
              {document.title || "Untitled"} · {wordCount} words
            </p>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div className={styles.body}>
          <p className={styles.hint}>Choose a format to download your document.</p>

          <div className={styles.formats}>
            {FORMATS.map((fmt) => (
              <button
                key={fmt.id}
                className={clsx(styles.formatCard, {
                  [styles.formatDone]: done === fmt.id,
                })}
                onClick={() => handleExport(fmt.id)}
                disabled={!!loading}
                style={{ "--fmt-color": fmt.color }}
              >
                <div className={styles.fmtIcon} style={{ background: `${fmt.color}18`, color: fmt.color }}>
                  {loading === fmt.id ? (
                    <span className={styles.spinner}>⟳</span>
                  ) : done === fmt.id ? (
                    "✓"
                  ) : (
                    fmt.icon
                  )}
                </div>
                <div className={styles.fmtInfo}>
                  <div className={styles.fmtTop}>
                    <span className={styles.fmtLabel}>{fmt.label}</span>
                    <span className={styles.fmtExt}>{fmt.ext}</span>
                  </div>
                  <span className={styles.fmtDesc}>{fmt.desc}</span>
                </div>
                <div className={styles.fmtArrow}>
                  {done === fmt.id ? "✓" : "⬇"}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className={styles.footer}>
          <p className={styles.footerNote}>
            📄 PDF export uses your browser's print dialog — select "Save as PDF".
          </p>
        </div>
      </div>
    </div>
  );
};

export default ExportModal;
