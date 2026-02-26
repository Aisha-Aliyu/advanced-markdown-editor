import { useEffect, useRef, useCallback } from "react";
import { EditorView, keymap, lineNumbers, highlightActiveLine, drawSelection, dropCursor, rectangularSelection, crosshairCursor, highlightActiveLineGutter } from "@codemirror/view";
import { EditorState, Compartment } from "@codemirror/state";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { languages } from "@codemirror/language-data";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { searchKeymap, highlightSelectionMatches } from "@codemirror/search";
import { autocompletion, completionKeymap } from "@codemirror/autocomplete";
import { oneDark } from "@codemirror/theme-one-dark";

const themeCompartment = new Compartment();
const editableCompartment = new Compartment();

export const useEditor = ({ containerRef, initialContent, onChange, theme, readOnly = false }) => {
  const viewRef = useRef(null);

  const getThemeExtension = useCallback((t) => {
    if (t === "default" || t === "men") return oneDark;
    // Light themes for kids and women, use a minimal custom theme
    return EditorView.theme({
      "&": {
        backgroundColor: "var(--editor-bg)",
        color: "var(--editor-text)",
        height: "100%",
        fontSize: "15px",
        fontFamily: "var(--font-mono)",
      },
      ".cm-content": { caretColor: "var(--editor-cursor)", padding: "16px 0" },
      ".cm-cursor": { borderLeftColor: "var(--editor-cursor)" },
      ".cm-selectionBackground, ::selection": {
        backgroundColor: "var(--editor-selection) !important",
      },
      ".cm-gutters": {
        backgroundColor: "var(--editor-gutter)",
        color: "var(--text-muted)",
        border: "none",
        borderRight: "1px solid var(--border)",
      },
      ".cm-lineNumbers .cm-gutterElement": { padding: "0 12px" },
      ".cm-activeLine": { backgroundColor: "var(--editor-line-highlight)" },
      ".cm-activeLineGutter": { backgroundColor: "var(--editor-line-highlight)" },
      ".cm-scroller": { fontFamily: "var(--font-mono)", lineHeight: "1.7" },
      ".cm-line": { padding: "0 20px" },
    });
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged && onChange) {
        onChange(update.state.doc.toString());
      }
    });

    const state = EditorState.create({
      doc: initialContent || "",
      extensions: [
        lineNumbers(),
        highlightActiveLineGutter(),
        history(),
        drawSelection(),
        dropCursor(),
        rectangularSelection(),
        crosshairCursor(),
        highlightActiveLine(),
        highlightSelectionMatches(),
        markdown({ base: markdownLanguage, codeLanguages: languages }),
        autocompletion(),
        keymap.of([
          ...defaultKeymap,
          ...historyKeymap,
          ...searchKeymap,
          ...completionKeymap,
          indentWithTab,
        ]),
        themeCompartment.of(getThemeExtension(theme)),
        editableCompartment.of(EditorState.readOnly.of(readOnly)),
        updateListener,
        EditorView.lineWrapping,
      ],
    });

    const view = new EditorView({ state, parent: containerRef.current });
    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  // Update theme dynamically without remounting
  useEffect(() => {
    if (!viewRef.current) return;
    viewRef.current.dispatch({
      effects: themeCompartment.reconfigure(getThemeExtension(theme)),
    });
  }, [theme, getThemeExtension]);

  // Expose view ref so toolbar can call insertions
  return { viewRef };
};
