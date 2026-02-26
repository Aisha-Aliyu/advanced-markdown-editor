import { useState, useEffect, useRef } from "react";
import clsx from "clsx";
import styles from "./CommandPalette.module.css";

const ALL_COMMANDS = [
  { id: "new-doc",       label: "New Document",        shortcut: "Ctrl+N",       icon: "📄", group: "Documents" },
  { id: "save",          label: "Save",                 shortcut: "Ctrl+S",       icon: "💾", group: "Documents" },
  { id: "focus",         label: "Toggle Focus Mode",    shortcut: "Ctrl+Shift+F", icon: "◎",  group: "View" },
  { id: "view-split",    label: "Split View",           shortcut: "",             icon: "⬜", group: "View" },
  { id: "view-editor",   label: "Editor Only",          shortcut: "",             icon: "✏️", group: "View" },
  { id: "view-preview",  label: "Preview Only",         shortcut: "",             icon: "👁", group: "View" },
  { id: "theme-default", label: "Theme: Dark",          shortcut: "",             icon: "🌑", group: "Theme" },
  { id: "theme-kids",    label: "Theme: Kids",          shortcut: "",             icon: "🌈", group: "Theme" },
  { id: "theme-women",   label: "Theme: Women",         shortcut: "",             icon: "🌸", group: "Theme" },
  { id: "theme-men",     label: "Theme: Men",           shortcut: "",             icon: "🌊", group: "Theme" },
  { id: "export-md",     label: "Export as Markdown",   shortcut: "",             icon: "⬇️", group: "Export" },
  { id: "export-html",   label: "Export as HTML",       shortcut: "",             icon: "🌐", group: "Export" },
  { id: "export-pdf",    label: "Export as PDF",        shortcut: "",             icon: "📋", group: "Export" },
];

const CommandPalette = ({ isOpen, onClose, onCommand }) => {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const inputRef = useRef(null);

  const filtered = ALL_COMMANDS.filter(
    (c) =>
      c.label.toLowerCase().includes(query.toLowerCase()) ||
      c.group.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelected(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    setSelected(0);
  }, [query]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelected((i) => Math.min(i + 1, filtered.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelected((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" && filtered[selected]) {
        e.preventDefault();
        onCommand(filtered[selected].id);
        onClose();
      } else if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, filtered, selected, onCommand, onClose]);

  if (!isOpen) return null;

  // Group consecutive commands
  const groups = filtered.reduce((acc, cmd) => {
    if (!acc[cmd.group]) acc[cmd.group] = [];
    acc[cmd.group].push(cmd);
    return acc;
  }, {});

  let globalIndex = 0;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.palette} onClick={(e) => e.stopPropagation()}>
        <div className={styles.inputWrapper}>
          <svg className={styles.searchIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            ref={inputRef}
            className={styles.input}
            placeholder="Type a command..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Command palette"
            spellCheck={false}
            autoComplete="off"
          />
          <kbd className={styles.escKbd}>Esc</kbd>
        </div>

        <div className={styles.results}>
          {filtered.length === 0 && (
            <div className={styles.empty}>No commands found</div>
          )}

          {Object.entries(groups).map(([group, cmds]) => (
            <div key={group}>
              <div className={styles.groupLabel}>{group}</div>
              {cmds.map((cmd) => {
                const idx = globalIndex++;
                return (
                  <button
                    key={cmd.id}
                    className={clsx(styles.item, { [styles.selectedItem]: idx === selected })}
                    onClick={() => { onCommand(cmd.id); onClose(); }}
                    onMouseEnter={() => setSelected(idx)}
                  >
                    <span className={styles.cmdIcon}>{cmd.icon}</span>
                    <span className={styles.cmdLabel}>{cmd.label}</span>
                    {cmd.shortcut && <kbd className={styles.kbd}>{cmd.shortcut}</kbd>}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;
