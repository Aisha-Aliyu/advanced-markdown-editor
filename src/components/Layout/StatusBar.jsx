import { useMemo, useState } from "react";
import { getStats } from "../../utils/markdownUtils";
import { SAVE_STATUS } from "../../hooks/useAutosave";
import styles from "./StatusBar.module.css";
import clsx from "clsx";

const STATUS_LABELS = {
  [SAVE_STATUS.IDLE]:    { text: "Saved",       cls: "saved"   },
  [SAVE_STATUS.PENDING]: { text: "Unsaved",     cls: "pending" },
  [SAVE_STATUS.SAVING]:  { text: "Saving…",     cls: "saving"  },
  [SAVE_STATUS.SAVED]:   { text: "✓ Saved",     cls: "saved"   },
  [SAVE_STATUS.ERROR]:   { text: "⚠ Error",     cls: "error"   },
  [SAVE_STATUS.OFFLINE]: { text: "● Offline",   cls: "offline" },
};

const THEMES = [
  { id: "default", label: "Dark",  emoji: "🌑" },
  { id: "kids",    label: "Kids",  emoji: "🌈" },
  { id: "women",   label: "Women", emoji: "🌸" },
  { id: "men",     label: "Men",   emoji: "🌊" },
];

const StatusBar = ({
  content = "",
  theme, changeTheme,
  saveStatus = SAVE_STATUS.IDLE,
  isOnline,
  onOpenVersions,
}) => {
  const stats = useMemo(() => getStats(content), [content]);
  const status = STATUS_LABELS[saveStatus] || STATUS_LABELS[SAVE_STATUS.IDLE];
  const [themePickerOpen, setThemePickerOpen] = useState(false);

  const currentTheme = THEMES.find((t) => t.id === theme);

  return (
    <div className={styles.bar}>
      {/* Left: word stats */}
      <div className={styles.left}>
        <span>{stats.words}w</span>
        <span className={styles.dot}>·</span>
        <span className={styles.hideXs}>{stats.chars}c</span>
        <span className={clsx(styles.dot, styles.hideXs)}>·</span>
        <span className={styles.hideSm}>{stats.lines} lines</span>
        <span className={clsx(styles.dot, styles.hideSm)}>·</span>
        <span className={styles.hideSm}>{stats.readingTime} min</span>
      </div>

      {/* Right: status, history, theme */}
      <div className={styles.right}>
        {/* Offline badge */}
        {!isOnline && (
          <span className={styles.offlineBadge}>Offline</span>
        )}

        {/* Save status */}
        <span className={clsx(styles.saveStatus, styles[status.cls])}>
          {status.text}
        </span>

        <span className={styles.dot}>·</span>

        {/* Version history */}
        <button
          className={styles.iconTextBtn}
          onClick={onOpenVersions}
          title="Version history"
        >
          <span>⏱</span>
          <span className={styles.hideSm}>History</span>
        </button>

        <span className={styles.dot}>·</span>

        {/* Theme picker — compact on mobile */}
        <div className={styles.themePicker}>
          <button
            className={styles.themeCurrentBtn}
            onClick={() => setThemePickerOpen((o) => !o)}
            title="Change theme"
          >
            {currentTheme?.emoji}
            <span className={styles.hideSm}>{currentTheme?.label}</span>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              style={{ opacity: 0.5 }}>
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>

          {themePickerOpen && (
            <>
              <div
                className={styles.themeDropdownOverlay}
                onClick={() => setThemePickerOpen(false)}
              />
              <div className={styles.themeDropdown}>
                {THEMES.map((t) => (
                  <button
                    key={t.id}
                    className={clsx(styles.themeOption, { [styles.themeOptionActive]: theme === t.id })}
                    onClick={() => { changeTheme(t.id); setThemePickerOpen(false); }}
                  >
                    <span>{t.emoji}</span>
                    <span>{t.label}</span>
                    {theme === t.id && <span className={styles.check}>✓</span>}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default StatusBar;
