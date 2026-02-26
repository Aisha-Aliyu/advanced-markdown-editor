import styles from "./PresenceAvatars.module.css";

const Avatar = ({ user, isMe = false }) => {
  const initials = (user.name || user.email || "?")[0].toUpperCase();
  return (
    <div
      className={`${styles.avatar} ${isMe ? styles.me : ""}`}
      style={{ borderColor: user.color, backgroundColor: `${user.color}22` }}
      title={isMe ? "You" : (user.name || user.email || "Guest")}
    >
      <span style={{ color: user.color }}>{initials}</span>
    </div>
  );
};

const PresenceAvatars = ({ presence, myInfo, isConnected }) => {
  if (!isConnected && presence.length === 0) return null;

  return (
    <div className={styles.wrapper} title="People in this document">
      {presence.slice(0, 5).map((p) => (
        <Avatar key={p.id} user={p} />
      ))}
      <Avatar user={myInfo} isMe />
      {presence.length > 5 && (
        <div className={styles.overflow}>+{presence.length - 5}</div>
      )}
      <span className={styles.dot} style={{ background: isConnected ? "#10b981" : "#6b7280" }} />
    </div>
  );
};

export default PresenceAvatars;
