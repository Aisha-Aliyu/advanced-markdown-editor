import { useState } from "react";
import { signIn, signUp, sendMagicLink } from "../../services/authService";
import styles from "./AuthModal.module.css";
import clsx from "clsx";

const TABS = ["login", "signup", "magic"];

const AuthModal = ({ isOpen, onClose, onSuccess }) => {
  const [tab, setTab] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  // Which email just went out: "magic" (magic link) or "confirm" (sign-up confirmation)
  const [sent, setSent] = useState(null);

  if (!isOpen) return null;

  const reset = () => {
    setError("");
    setSent(null);
  };

  const handleTabChange = (t) => {
    setTab(t);
    reset();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!email) {
      setError("Please enter your email.");
      return;
    }

    if (tab !== "magic" && !password) {
      setError("Please fill in all fields.");
      return;
    }

    if (tab !== "magic" && password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    try {
      if (tab === "magic") {
        const { error: err } = await sendMagicLink(email);
        if (err) { setError(err); return; }
        setSent("magic");
        return;
      }

      const fn = tab === "signup" ? signUp : signIn;
      const { user, needsConfirmation, error: err } = await fn(email, password);
      if (err) { setError(err); return; }
      // Supabase wants the email confirmed before the first sign-in, so there's no session yet
      if (needsConfirmation) { setSent("confirm"); return; }
      onSuccess(user);
      onClose();
    } catch (err) {
      console.error("Sign-in request failed:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const tabLabels = { login: "Sign In", signup: "Sign Up", magic: "Magic Link" };

  return (
    <div className={styles.overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={styles.modal}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.logo}>
            <span className={styles.logoIcon}>✍️</span>
            <span className={styles.logoText}>Inkwell</span>
          </div>
          <p className={styles.tagline}>Your writing, everywhere.</p>
        </div>

        {/* Tabs */}
        <div className={styles.tabs} role="tablist">
          {TABS.map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              className={clsx(styles.tab, { [styles.tabActive]: tab === t })}
              onClick={() => handleTabChange(t)}
            >
              {tabLabels[t]}
            </button>
          ))}
        </div>

        {/* Form */}
        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          {sent ? (
            <div className={styles.magicSuccess}>
              <div className={styles.magicIcon}>📬</div>
              <p className={styles.magicTitle}>Check your inbox</p>
              {sent === "magic" ? (
                <p className={styles.magicSub}>
                  We sent a magic link to <strong>{email}</strong>.<br/>
                  Click it to sign in instantly — no password needed.
                </p>
              ) : (
                <p className={styles.magicSub}>
                  We sent a confirmation link to <strong>{email}</strong>.<br/>
                  Open it to finish signing up. If it isn't there, check spam.
                </p>
              )}
              <button
                type="button"
                className={styles.backBtn}
                onClick={() => setSent(null)}
              >
                Use a different email
              </button>
            </div>
          ) : (
            <>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="email">Email</label>
                <input
                  id="email"
                  className={styles.input}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                  spellCheck={false}
                />
              </div>

              {tab !== "magic" && (
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="password">Password</label>
                  <input
                    id="password"
                    className={styles.input}
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={tab === "signup" ? "Min. 8 characters" : "Your password"}
                    autoComplete={tab === "signup" ? "new-password" : "current-password"}
                    required
                    minLength={8}
                  />
                </div>
              )}

              {tab === "magic" && (
                <p className={styles.magicHint}>
                  We'll email you a link. Click it and you're in — no password ever needed.
                </p>
              )}

              {error && (
                <div className={styles.error} role="alert">
                  ⚠️ {error}
                </div>
              )}

              <button
                type="submit"
                className={styles.submitBtn}
                disabled={loading}
              >
                {loading ? "Please wait..." : tabLabels[tab]}
              </button>
            </>
          )}
        </form>

        {/* Footer */}
        <p className={styles.footer}>
          Your documents are encrypted and private. We never read your writing.
        </p>

        <button className={styles.closeBtn} onClick={onClose} aria-label="Close">✕</button>
      </div>
    </div>
  );
};

export default AuthModal;
