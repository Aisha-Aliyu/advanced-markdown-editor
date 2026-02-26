import { useState } from "react";
import styles from "./Toolbar.module.css";
import clsx from "clsx";
import { wrapText, insertLine, insertSnippet } from "../../utils/markdownUtils";

const TOOLBAR_GROUPS = [
  {
    id: "text", label: "Text",
    items: [
      { id: "bold",        label: "Bold",          icon: "B",   action: wrapText("**"),       bold: true },
      { id: "italic",      label: "Italic",        icon: "I",   action: wrapText("_"),        italic: true },
      { id: "strike",      label: "Strike",        icon: "S",   action: wrapText("~~"),       strike: true },
      { id: "code-inline", label: "Code",          icon: "<>",  action: wrapText("`") },
    ],
  },
  {
    id: "headings", label: "Headings",
    items: [
      { id: "h1", label: "H1", icon: "H1", action: insertLine("# ") },
      { id: "h2", label: "H2", icon: "H2", action: insertLine("## ") },
      { id: "h3", label: "H3", icon: "H3", action: insertLine("### ") },
    ],
  },
  {
    id: "blocks", label: "Blocks",
    items: [
      { id: "ul",    label: "Bullet",   icon: "≡",  action: insertLine("- ") },
      { id: "ol",    label: "Numbered", icon: "1.",  action: insertLine("1. ") },
      { id: "task",  label: "Task",     icon: "☑",  action: insertLine("- [ ] ") },
      { id: "quote", label: "Quote",    icon: "❝",  action: insertLine("> ") },
      { id: "hr",    label: "Divider",  icon: "—",  action: insertSnippet("\n---\n") },
    ],
  },
  {
    id: "insert", label: "Insert",
    items: [
      { id: "link",       label: "Link",       icon: "🔗", action: wrapText("[", "](url)") },
      { id: "table",      label: "Table",      icon: "⊞",  action: insertSnippet("\n| Header 1 | Header 2 | Header 3 |\n|----------|----------|----------|\n| Cell 1   | Cell 2   | Cell 3   |\n") },
      { id: "code-block", label: "Code Block", icon: "{}",  action: insertSnippet("```js\n\n```") },
    ],
  },
];

const ToolbarButton = ({ item, viewRef }) => (
  <button
    className={clsx(styles.btn, {
      [styles.btnBold]:   item.bold,
      [styles.btnItalic]: item.italic,
      [styles.btnStrike]: item.strike,
    })}
    onClick={() => viewRef?.current && item.action(viewRef.current)}
    title={item.label}
    aria-label={item.label}
    type="button"
  >
    {item.icon}
  </button>
);

const Toolbar = ({
  viewRef,
  viewMode, setViewMode,
  isFocusMode, setIsFocusMode,
  onSave, isSaving,
  docTitle, onTitleChange,
  onToggleSidebar,
  onOpenPalette,
  onOpenExport,
}) => {
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <>
      <div className={styles.toolbar}>
        {/* Hamburger */}
        <button
          className={styles.sidebarToggle}
          onClick={onToggleSidebar}
          aria-label="Toggle sidebar"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="6" x2="21" y2="6"/>
            <line x1="3" y1="12" x2="21" y2="12"/>
            <line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>

        {/* Title */}
        <input
          className={styles.titleInput}
          value={docTitle || ""}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="Untitled"
          spellCheck={false}
          aria-label="Document title"
        />

        <div className={styles.divider} />

        {/* Desktop formatting */}
        <div className={styles.groups}>
          {TOOLBAR_GROUPS.map((group, gi) => (
            <div key={group.id} className={styles.group}>
              {group.items.map((item) => (
                <ToolbarButton key={item.id} item={item} viewRef={viewRef} />
              ))}
              {gi < TOOLBAR_GROUPS.length - 1 && <span className={styles.separator} />}
            </div>
          ))}
        </div>

        {/* Mobile format toggle */}
        <button
          className={styles.mobileFormatToggle}
          onClick={() => setSheetOpen(true)}
          aria-label="Formatting"
          title="Formatting"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 7V4h16v3"/>
            <path d="M9 20h6"/>
            <path d="M12 4v16"/>
          </svg>
        </button>

        <div className={styles.spacer} />

        {/* Command palette */}
        <button
          className={styles.paletteBtn}
          onClick={onOpenPalette}
          title="Command Palette (Ctrl+K)"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <span className={styles.paletteBtnText}>Search</span>
          <kbd className={styles.paletteKbd}>Ctrl K</kbd>
        </button>

        {/* View toggle */}
        <div className={styles.viewToggle}>
          {[
            { id: "editor",  icon: "✏️" },
            { id: "split",   icon: "⬜" },
            { id: "preview", icon: "👁" },
          ].map((m) => (
            <button
              key={m.id}
              className={clsx(styles.viewBtn, { [styles.viewBtnActive]: viewMode === m.id })}
              onClick={() => setViewMode(m.id)}
              title={`${m.id} view`}
            >
              {m.icon}
            </button>
          ))}
        </div>

        {/* Focus mode */}
        <button
          className={clsx(styles.iconBtn, { [styles.iconBtnActive]: isFocusMode })}
          onClick={() => setIsFocusMode(!isFocusMode)}
          title="Focus Mode (Ctrl+Shift+F)"
        >
          ◎
        </button>

        {/* Export */}
<button
  className={styles.exportBtn}
  onClick={onOpenExport}
  title="Export document"
>
  ⬇
</button>

        {/* Save: always visible, never overflows */}
        <button
          className={clsx(styles.saveBtn, { [styles.saving]: isSaving })}
          onClick={onSave}
          disabled={isSaving}
          title="Save (Ctrl+S)"
        >
          {isSaving ? "···" : "Save"}
        </button>
      </div>

      {/* Mobile bottom sheet */}
      {sheetOpen && (
        <>
          <div className={styles.sheetOverlay} onClick={() => setSheetOpen(false)} />
          <div className={styles.mobileSheet}>
            <div className={styles.sheetHandle} />
            {TOOLBAR_GROUPS.map((group) => (
              <div key={group.id} className={styles.sheetRow}>
                <span className={styles.sheetGroupLabel}>{group.label}</span>
                {group.items.map((item) => (
                  <button
                    key={item.id}
                    className={styles.sheetBtn}
                    onClick={() => {
                      viewRef?.current && item.action(viewRef.current);
                      setSheetOpen(false);
                    }}
                  >
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
};

export default Toolbar;
