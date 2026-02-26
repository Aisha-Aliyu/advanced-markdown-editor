import { useState, useCallback } from "react";

// Single source of truth for the whole app
export const useStore = () => {
  const [theme, setTheme] = useState(
    () => localStorage.getItem("inkwell_theme") || "default"
  );
  const [documents, setDocuments] = useState([]);
  const [activeDocId, setActiveDocId] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [viewMode, setViewMode] = useState("split"); // "editor" | "split" | "preview"
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [user, setUser] = useState(null);

  const changeTheme = useCallback((t) => {
    setTheme(t);
    localStorage.setItem("inkwell_theme", t);
    document.documentElement.setAttribute("data-theme", t);
  }, []);

  const activeDoc = documents.find((d) => d.id === activeDocId) || null;

  const updateDocContent = useCallback((id, content) => {
    setDocuments((prev) =>
      prev.map((d) =>
        d.id === id
          ? { ...d, content, updatedAt: new Date().toISOString(), isSaved: false }
          : d
      )
    );
  }, []);

  const markDocSaved = useCallback((id) => {
    setDocuments((prev) =>
      prev.map((d) => (d.id === id ? { ...d, isSaved: true } : d))
    );
  }, []);

  return {
    theme, changeTheme,
    documents, setDocuments,
    activeDocId, setActiveDocId,
    activeDoc, updateDocContent, markDocSaved,
    isSidebarOpen, setIsSidebarOpen,
    viewMode, setViewMode,
    isFocusMode, setIsFocusMode,
    user, setUser,
  };
};
