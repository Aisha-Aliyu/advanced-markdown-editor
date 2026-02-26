import { useMemo } from "react";
import { parseMarkdown } from "../../utils/markdownUtils";
import styles from "./Preview.module.css";

const Preview = ({ content }) => {
  const html = useMemo(() => parseMarkdown(content), [content]);

  return (
    <div className={styles.wrapper}>
      <div
        className={styles.preview}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
};

export default Preview;
