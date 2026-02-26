import { useState } from "react";
import { insertSnippet } from "../../utils/markdownUtils";
import styles from "./TableEditor.module.css";

const MAX_COLS = 8;
const MAX_ROWS = 12;

const buildMarkdownTable = (headers, rows) => {
  const colWidths = headers.map((h, i) =>
    Math.max(h.length, ...rows.map((r) => (r[i] || "").length), 6)
  );
  const pad = (str, len) => str + " ".repeat(Math.max(0, len - str.length));
  const sep = colWidths.map((w) => "-".repeat(w + 2)).join("|");

  const headerLine = "| " + headers.map((h, i) => pad(h || `Col ${i + 1}`, colWidths[i])).join(" | ") + " |";
  const sepLine    = "|" + sep + "|";
  const rowLines   = rows.map(
    (row) => "| " + headers.map((_, i) => pad(row[i] || "", colWidths[i])).join(" | ") + " |"
  );

  return "\n" + [headerLine, sepLine, ...rowLines].join("\n") + "\n";
};

const TableEditor = ({ isOpen, onClose, viewRef }) => {
  const [headers, setHeaders] = useState(["Header 1", "Header 2", "Header 3"]);
  const [rows, setRows]       = useState([
    ["", "", ""],
    ["", "", ""],
  ]);

  if (!isOpen) return null;

  const setHeader = (i, val) =>
    setHeaders((prev) => prev.map((h, j) => (j === i ? val : h)));

  const setCell = (ri, ci, val) =>
    setRows((prev) => prev.map((row, r) =>
      r === ri ? row.map((cell, c) => (c === ci ? val : cell)) : row
    ));

  const addCol = () => {
    if (headers.length >= MAX_COLS) return;
    setHeaders((p) => [...p, `Col ${p.length + 1}`]);
    setRows((p) => p.map((row) => [...row, ""]));
  };

  const removeCol = (i) => {
    if (headers.length <= 1) return;
    setHeaders((p) => p.filter((_, j) => j !== i));
    setRows((p) => p.map((row) => row.filter((_, j) => j !== i)));
  };

  const addRow = () => {
    if (rows.length >= MAX_ROWS) return;
    setRows((p) => [...p, Array(headers.length).fill("")]);
  };

  const removeRow = (i) => {
    if (rows.length <= 1) return;
    setRows((p) => p.filter((_, j) => j !== i));
  };

  const handleInsert = () => {
    const md = buildMarkdownTable(headers, rows);
    if (viewRef?.current) insertSnippet(md)(viewRef.current);
    onClose();
  };

  return (
    <div className={styles.overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h3 className={styles.title}>Table Editor</h3>
          <div className={styles.headerActions}>
            <span className={styles.dims}>{headers.length} × {rows.length + 1}</span>
            <button className={styles.closeBtn} onClick={onClose}>✕</button>
          </div>
        </div>

        <div className={styles.body}>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              {/* Header row */}
              <thead>
                <tr>
                  <th className={styles.rowNumTh} />
                  {headers.map((h, i) => (
                    <th key={i} className={styles.th}>
                      <div className={styles.thInner}>
                        <input
                          className={styles.cellInput}
                          value={h}
                          onChange={(e) => setHeader(i, e.target.value)}
                          placeholder={`Col ${i + 1}`}
                        />
                        <button
                          className={styles.removeColBtn}
                          onClick={() => removeCol(i)}
                          title="Remove column"
                          disabled={headers.length <= 1}
                        >
                          ✕
                        </button>
                      </div>
                    </th>
                  ))}
                  <th className={styles.addColTh}>
                    <button
                      className={styles.addBtn}
                      onClick={addCol}
                      disabled={headers.length >= MAX_COLS}
                      title="Add column"
                    >
                      +
                    </button>
                  </th>
                </tr>
              </thead>

              {/* Data rows */}
              <tbody>
                {rows.map((row, ri) => (
                  <tr key={ri}>
                    <td className={styles.rowNum}>{ri + 1}</td>
                    {row.map((cell, ci) => (
                      <td key={ci} className={styles.td}>
                        <input
                          className={styles.cellInput}
                          value={cell}
                          onChange={(e) => setCell(ri, ci, e.target.value)}
                          placeholder="Cell"
                        />
                      </td>
                    ))}
                    <td className={styles.removeTd}>
                      <button
                        className={styles.removeRowBtn}
                        onClick={() => removeRow(ri)}
                        disabled={rows.length <= 1}
                        title="Remove row"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}

                {/* Add row */}
                <tr>
                  <td colSpan={headers.length + 2} className={styles.addRowTd}>
                    <button
                      className={styles.addRowBtn}
                      onClick={addRow}
                      disabled={rows.length >= MAX_ROWS}
                    >
                      + Add Row
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Preview */}
          <div className={styles.preview}>
            <span className={styles.previewLabel}>Markdown Preview</span>
            <pre className={styles.previewCode}>
              {buildMarkdownTable(headers, rows)}
            </pre>
          </div>
        </div>

        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={onClose}>Cancel</button>
          <button className={styles.insertBtn} onClick={handleInsert}>
            ⊞ Insert Table
          </button>
        </div>
      </div>
    </div>
  );
};

export default TableEditor;
