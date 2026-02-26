import { signOut } from "../../services/authService";
import { useState, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";
import clsx from "clsx";
import styles from "./Sidebar.module.css";

const createDoc = (title = "Untitled") => ({
  id: uuidv4(),
  title,
  content: `# ${title}\n\nStart writing...\n`,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  isSaved: false,
});

const Sidebar = ({
  documents,
  setDocuments,
  activeDocId,
  setActiveDocId,
  isOpen,
  onClose,
  theme,
  changeTheme,
  user,
  onSignIn,
  onSignOut,
}) => {
  const [search, setSearch] = useState("");
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const [menuDocId, setMenuDocId] = useState(null);

  const filtered = documents.filter((d) =>
    d.title.toLowerCase().includes(search.toLowerCase()) ||
    d.content?.toLowerCase().includes(search.toLowerCase())
  );

  const handleNew = useCallback(() => {
    const doc = createDoc("Untitled");
    setDocuments((prev) => [doc, ...prev]);
    setActiveDocId(doc.id);
    onClose?.();
  }, [setDocuments, setActiveDocId, onClose]);

  const handleSelect = useCallback((id) => {
    setActiveDocId(id);
    setMenuDocId(null);
    onClose?.();
  }, [setActiveDocId, onClose]);

  const handleRenameStart = (doc) => {
    setRenamingId(doc.id);
    setRenameValue(doc.title);
    setMenuDocId(null);
  };

  const handleRenameCommit = (id) => {
    if (renameValue.trim()) {
      setDocuments((prev) =>
        prev.map((d) =>
          d.id === id ? { ...d, title: renameValue.trim() } : d
        )
      );
    }
    setRenamingId(null);
  };

  const handleDelete = (id) => {
    setDocuments((prev) => {
      const next = prev.filter((d) => d.id !== id);
      if (activeDocId === id && next.length > 0) {
        setActiveDocId(next[0].id);
      } else if (next.length === 0) {
        const fresh = createDoc("Untitled");
        setActiveDocId(fresh.id);
        return [fresh];
      }
      return next;
    });
    setMenuDocId(null);
  };

  const handleDuplicate = (doc) => {
    const copy = { ...doc, id: uuidv4(), title: `${doc.title} (copy)`, createdAt: new Date().toISOString() };
    setDocuments((prev) => [copy, ...prev]);
    setMenuDocId(null);
  };

  const THEMES = [
    { id: "default", label: "Dark",  emoji: "🌑" },
    { id: "kids",    label: "Kids",  emoji: "🌈" },
    { id: "women",   label: "Women", emoji: "🌸" },
    { id: "men",     label: "Men",   emoji: "🌊" },
  ];

  const formatDate = (iso) => {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };

return (
  <>
    {isOpen && (
      <div className={styles.overlay} onClick={onClose} aria-hidden="true" />
    )}

    <aside className={clsx(styles.sidebar, { [styles.open]: isOpen })}>
      {/* Header */}
      <div className={styles.header}>
        <span className={styles.brand}>Inkwell</span>
        <button className={styles.newBtn} onClick={handleNew} title="New document">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          New
        </button>
      </div>

      {/* Search */}
      <div className={styles.searchWrapper}>
        <svg className={styles.searchIcon} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          className={styles.search}
          type="text"
          placeholder="Search documents..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search documents"
        />
        {search && (
          <button className={styles.searchClear} onClick={() => setSearch("")}>✕</button>
        )}
      </div>

      {/* Document list */}
      <div className={styles.docList}>
        {filtered.length === 0 && (
          <div className={styles.empty}>
            {search ? "No documents found" : "No documents yet"}
          </div>
        )}
        {filtered.map((doc) => (
          <div
            key={doc.id}
            className={clsx(styles.docItem, { [styles.active]: doc.id === activeDocId })}
            onClick={() => renamingId !== doc.id && handleSelect(doc.id)}
          >
            <div className={styles.docIcon}>{doc.isSaved === false ? "●" : "○"}</div>
            <div className={styles.docInfo}>
              {renamingId === doc.id ? (
                <input
                  className={styles.renameInput}
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onBlur={() => handleRenameCommit(doc.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleRenameCommit(doc.id);
                    if (e.key === "Escape") setRenamingId(null);
                  }}
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span className={styles.docTitle}>{doc.title || "Untitled"}</span>
              )}
              <span className={styles.docMeta}>
                {formatDate(doc.updatedAt || doc.updated_at)} · {doc.content?.split(/\s+/).filter(Boolean).length || 0}w
              </span>
            </div>
            <button
              className={styles.menuTrigger}
              onClick={(e) => { e.stopPropagation(); setMenuDocId(menuDocId === doc.id ? null : doc.id); }}
              aria-label="Document options"
            >
              ···
            </button>
            {menuDocId === doc.id && (
              <div className={styles.contextMenu} onClick={(e) => e.stopPropagation()}>
                <button onClick={() => handleRenameStart(doc)}>✏️ Rename</button>
                <button onClick={() => handleDuplicate(doc)}>⧉ Duplicate</button>
                <button className={styles.deleteBtn} onClick={() => handleDelete(doc.id)}>🗑 Delete</button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Theme switcher */}
      <div className={styles.themeSection}>
        <span className={styles.themeLabel}>Theme</span>
        <div className={styles.themeGrid}>
          {[
            { id: "default", label: "Dark",  emoji: "🌑" },
            { id: "kids",    label: "Kids",  emoji: "🌈" },
            { id: "women",   label: "Women", emoji: "🌸" },
            { id: "men",     label: "Men",   emoji: "🌊" },
          ].map((t) => (
            <button
              key={t.id}
              className={clsx(styles.themeBtn, { [styles.themeBtnActive]: theme === t.id })}
              onClick={() => changeTheme(t.id)}
              title={t.label}
            >
              <span>{t.emoji}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* User profile */}
      <div className={styles.userSection}>
        {user ? (
          <div className={styles.userRow}>
            <div className={styles.avatar}>
              {user.email?.[0]?.toUpperCase() || "?"}
            </div>
            <div className={styles.userInfo}>
              <span className={styles.userEmail}>{user.email}</span>
              <span className={styles.userBadge}>☁ Cloud sync on</span>
            </div>
            <button
              className={styles.signOutBtn}
              onClick={async () => { await signOut(); onSignOut?.(); }}
              title="Sign out"
            >
              ⏻
            </button>
          </div>
        ) : (
          <button className={styles.signInBtn} onClick={onSignIn}>
            ☁ Sign in to sync
          </button>
        )}
      </div>
    </aside>
  </>
);
};

export default Sidebar;