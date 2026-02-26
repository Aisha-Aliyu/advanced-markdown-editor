import clsx from "clsx";
import styles from "./SlashMenu.module.css";

const SlashMenu = ({ isOpen, commands, selectedIndex, onSelect, onHover, position }) => {
  if (!isOpen || commands.length === 0) return null;

  return (
    <div
      className={styles.menu}
      style={{ top: position.top, left: position.left }}
      role="listbox"
      aria-label="Slash commands"
    >
      <div className={styles.header}>Commands</div>
      {commands.map((cmd, i) => (
        <button
          key={cmd.id}
          className={clsx(styles.item, { [styles.selected]: i === selectedIndex })}
          onClick={() => onSelect(cmd)}
          onMouseEnter={() => onHover(i)}
          role="option"
          aria-selected={i === selectedIndex}
        >
          <span className={styles.icon}>{cmd.icon}</span>
          <div className={styles.text}>
            <span className={styles.label}>{cmd.label}</span>
            <span className={styles.desc}>{cmd.description}</span>
          </div>
        </button>
      ))}
    </div>
  );
};

export default SlashMenu;
