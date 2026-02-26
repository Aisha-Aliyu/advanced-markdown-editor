import { useState, useEffect } from "react";
import { fetchVersions } from "../../services/documentService";
import styles from "./VersionHistory.module.css";
import clsx from "clsx";

const VersionHistory = ({ isOpen, onClose, document, onRestore }) => {
  const [versions, setVersions]   = useState([]);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");
  const [previewing, setPreviewing] = useState(null);

  useEffect(() => {
    if (!isOpen || !document?.id) return;
    setLoading(true);
    setError("");
    fetchVersions(document.id).then(({ versions: v, error: err }) => {
      setLoading(false);
      if (err) { setError(err); return; }
      setVersions(v);
    });
  }, [isOpen, document?.id]);

  if (!isOpen) return null;

  const formatDate = (iso) => {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  };

  const wordCount = (text) =>
    (text || "").trim().split(/\s+/).filter(Boolean).length;

  return (
    <div className={styles.overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={styles.panel}>
        <div className={styles.header}>
          <div>
            <h2 className={styles.title}>Version History</h2>
            <p className={styles.sub}>{document?.title || "Untitled"}</p>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div className={styles.body}>
          {/* Version list */}
          <div className={styles.list}>
            {loading && <div className={styles.empty}>Loading versions...</div>}
            {error  && <div className={styles.errorMsg}>{error}</div>}
            {!loading && !error && versions.length === 0 && (
              <div className={styles.empty}>
                No versions saved yet. Versions are created automatically every 5 minutes while you write.
              </div>
            )}

            {/* Current version at the top */}
            {document && (
              <div className={clsx(styles.version, styles.currentVersion)}>
                <div className={styles.versionLeft}>
                  <span className={styles.versionBadge}>Current</span>
                  <span className={styles.versionTime}>Now</span>
                </div>
                <div className={styles.versionMeta}>
                  <span className={styles.versionTitle}>{document.title}</span>
                  <span className={styles.versionWords}>{wordCount(document.content)} words</span>
                </div>
              </div>
            )}

            {versions.map((v) => (
              <div
                key={v.id}
                className={clsx(styles.version, {
                  [styles.versionActive]: previewing?.id === v.id,
                })}
                onClick={() => setPreviewing(previewing?.id === v.id ? null : v)}
              >
                <div className={styles.versionLeft}>
                  <span className={styles.versionTime}>{formatDate(v.created_at)}</span>
                  {v.version_label && (
                    <span className={styles.versionLabel}>{v.version_label}</span>
                  )}
                </div>
                <div className={styles.versionMeta}>
                  <span className={styles.versionTitle}>{v.title}</span>
                  <span className={styles.versionWords}>{wordCount(v.content)} words</span>
                </div>
                {previewing?.id === v.id && (
                  <button
                    className={styles.restoreBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      onRestore(v);
                      onClose();
                    }}
                  >
                    Restore
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Preview pane */}
          {previewing && (
            <div className={styles.preview}>
              <div className={styles.previewHeader}>
                <span>Preview — {formatDate(previewing.created_at)}</span>
                <button
                  className={styles.restoreBtnLarge}
                  onClick={() => { onRestore(previewing); onClose(); }}
                >
                  ↩ Restore this version
                </button>
              </div>
              <div className={styles.previewContent}>
                <pre className={styles.previewText}>{previewing.content}</pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VersionHistory;
