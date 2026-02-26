import { useRef, useEffect } from "react";
import { useEditor } from "../../hooks/useEditor";
import styles from "./Editor.module.css";

const Editor = ({ content, onChange, theme, editorViewRef }) => {
  const containerRef = useRef(null);
  const { viewRef } = useEditor({
    containerRef,
    initialContent: content,
    onChange,
    theme,
  });

  // Forward the internal view ref up to the parent
  useEffect(() => {
    if (editorViewRef) {
      editorViewRef.current = viewRef.current;
    }
  });

  return (
    <div className={styles.wrapper}>
      <div ref={containerRef} className={styles.editor} />
    </div>
  );
};

export default Editor;
