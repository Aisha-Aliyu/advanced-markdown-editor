import { useEffect, useState, useCallback } from "react";

export const SLASH_COMMANDS = [
  { id: "h1",         label: "Heading 1",     description: "Large section heading",   icon: "H1", insert: "# " },
  { id: "h2",         label: "Heading 2",     description: "Medium section heading",  icon: "H2", insert: "## " },
  { id: "h3",         label: "Heading 3",     description: "Small section heading",   icon: "H3", insert: "### " },
  { id: "bold",       label: "Bold",          description: "Make text bold",          icon: "B",  insert: "**bold text**" },
  { id: "italic",     label: "Italic",        description: "Make text italic",        icon: "I",  insert: "_italic text_" },
  { id: "quote",      label: "Blockquote",    description: "Insert a quote block",    icon: "❝",  insert: "> " },
  { id: "code",       label: "Code Block",    description: "Insert code",             icon: "{}", insert: "```js\n\n```" },
  { id: "ul",         label: "Bullet List",   description: "Unordered list",          icon: "≡",  insert: "- " },
  { id: "ol",         label: "Numbered List", description: "Ordered list",            icon: "1.", insert: "1. " },
  { id: "task",       label: "Task List",     description: "Checkbox list",           icon: "☑",  insert: "- [ ] " },
  { id: "table",      label: "Table",         description: "Insert a table",          icon: "⊞",  insert: "\n| Col 1 | Col 2 | Col 3 |\n|-------|-------|-------|\n| Cell  | Cell  | Cell  |\n" },
  { id: "hr",         label: "Divider",       description: "Horizontal rule",         icon: "—",  insert: "\n---\n" },
  { id: "link",       label: "Link",          description: "Insert a hyperlink",      icon: "🔗", insert: "[link text](url)" },
  { id: "image",      label: "Image",         description: "Insert an image",         icon: "🖼", insert: "![alt text](url)" },
  { id: "callout",    label: "Callout",       description: "Highlighted note block",  icon: "💡", insert: "> **💡 Note:** Your text here" },
  { id: "math",       label: "Math Block",    description: "LaTeX math expression",   icon: "∑",  insert: "$$\nE = mc^2\n$$" },
];

export const useSlashCommands = ({ viewRef, onInsert }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  const filtered = SLASH_COMMANDS.filter(
    (cmd) =>
      query === "" ||
      cmd.label.toLowerCase().includes(query.toLowerCase()) ||
      cmd.id.toLowerCase().includes(query.toLowerCase())
  );

  const close = useCallback(() => {
    setIsOpen(false);
    setQuery("");
    setSelectedIndex(0);
  }, []);

  const executeCommand = useCallback(
    (cmd) => {
      if (!viewRef?.current) return;
      const view = viewRef.current;
      const { state } = view;
      const { from } = state.selection.main;

      // Find the slash and delete it + any query typed
      const lineStart = state.doc.lineAt(from).from;
      const lineText = state.sliceDoc(lineStart, from);
      const slashIndex = lineText.lastIndexOf("/");
      const deleteFrom = slashIndex >= 0 ? lineStart + slashIndex : from;

      view.dispatch(
        state.update({
          changes: { from: deleteFrom, to: from, insert: cmd.insert },
        })
      );
      view.focus();
      close();
      onInsert?.(cmd);
    },
    [viewRef, close, onInsert]
  );

  useEffect(() => {
    if (!viewRef?.current) return;

    const view = viewRef.current;

    const detectSlash = view.dom.addEventListener("keydown", (e) => {
      if (isOpen) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          setSelectedIndex((i) => Math.max(i - 1, 0));
        } else if (e.key === "Enter" && filtered[selectedIndex]) {
          e.preventDefault();
          e.stopPropagation();
          executeCommand(filtered[selectedIndex]);
        } else if (e.key === "Escape") {
          close();
        }
      }
    });

    return () => {
      view.dom.removeEventListener("keydown", detectSlash);
    };
  }, [isOpen, filtered, selectedIndex, executeCommand, close, viewRef]);

  // Watch for "/" being typed: check editor content changes
  const handleEditorChange = useCallback(
    (content, cursorPos) => {
      if (!viewRef?.current) return;
      const view = viewRef.current;
      const { state } = view;
      const { from } = state.selection.main;
      const line = state.doc.lineAt(from);
      const lineText = state.sliceDoc(line.from, from);

      const slashMatch = lineText.match(/\/(\w*)$/);

      if (slashMatch) {
        const q = slashMatch[1];
        setQuery(q);
        setSelectedIndex(0);
        setIsOpen(true);

        // Calculate position from cursor
        const coords = view.coordsAtPos(from);
        if (coords) {
          const editorRect = view.dom.getBoundingClientRect();
          setPosition({
            top: coords.bottom - editorRect.top + 4,
            left: coords.left - editorRect.left,
          });
        }
      } else {
        if (isOpen) close();
      }
    },
    [viewRef, isOpen, close]
  );

  return {
    isOpen,
    query,
    filtered,
    selectedIndex,
    position,
    close,
    executeCommand,
    handleEditorChange,
    setSelectedIndex,
  };
};
