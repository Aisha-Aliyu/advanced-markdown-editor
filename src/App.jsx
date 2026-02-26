import { useState, useEffect, useRef, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";
import { useStore } from "./store/useStore";
import { STARTER_CONTENT } from "./utils/markdownUtils";
import { useSlashCommands } from "./hooks/useSlashCommands";
import { useAutosave, SAVE_STATUS } from "./hooks/useAutosave";
import { useOnlineStatus } from "./hooks/useOnlineStatus";
import { useCollaboration } from "./hooks/useCollaboration";
import { onAuthChange } from "./services/authService";
import { fetchDocuments } from "./services/documentService";
import { exportMarkdown, exportHTML, exportPDF, exportDOCX } from "./utils/exportUtils";
import Editor from "./components/Editor/Editor";
import Preview from "./components/Preview/Preview";
import Toolbar from "./components/Toolbar/Toolbar";
import Sidebar from "./components/Sidebar/Sidebar";
import StatusBar from "./components/Layout/StatusBar";
import SlashMenu from "./components/Editor/SlashMenu";
import CommandPalette from "./components/UI/CommandPalette";
import AuthModal from "./components/Auth/AuthModal";
import VersionHistory from "./components/Versions/VersionHistory";
import ImageUpload from "./components/Editor/ImageUpload";
import TableEditor from "./components/Editor/TableEditor";
import PresenceAvatars from "./components/Collaboration/PresenceAvatars";
import ExportModal from "./components/Export/ExportModal";
import styles from "./App.module.css";

import "./themes/default.css";
import "./themes/kids.css";
import "./themes/women.css";
import "./themes/men.css";

const makeDoc = (title = "Untitled", content = "") => ({
  id: uuidv4(),
  title,
  content,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  isSaved: false,
});

function App() {
  const {
    theme, changeTheme,
    documents, setDocuments,
    activeDocId, setActiveDocId,
    activeDoc, updateDocContent, markDocSaved,
    viewMode, setViewMode,
    isFocusMode, setIsFocusMode,
    isSidebarOpen, setIsSidebarOpen,
    user, setUser,
  } = useStore();

  const [saveStatus, setSaveStatus]           = useState(SAVE_STATUS.IDLE);
  const [isPaletteOpen, setIsPaletteOpen]     = useState(false);
  const [isAuthOpen, setIsAuthOpen]           = useState(false);
  const [isVersionsOpen, setIsVersionsOpen]   = useState(false);
  const [isImageOpen, setIsImageOpen]         = useState(false);
  const [isTableOpen, setIsTableOpen]         = useState(false);
  const [isExportOpen, setIsExportOpen]       = useState(false);
  const [isMobile, setIsMobile]               = useState(window.innerWidth < 640);

  const editorViewRef = useRef(null);
  const isOnline      = useOnlineStatus();

  const { presence, isConnected, myInfo } = useCollaboration({
    docId:     activeDocId,
    user,
    isEnabled: !!user && isOnline,
  });

  // Apply theme on mount and change
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  // Mobile detection
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Responsive sidebar
  useEffect(() => {
    const handle = () => {
      if (window.innerWidth >= 768) setIsSidebarOpen(true);
      else setIsSidebarOpen(false);
    };
    handle();
    window.addEventListener("resize", handle);
    return () => window.removeEventListener("resize", handle);
  }, [setIsSidebarOpen]);

  // Auth listener
  useEffect(() => {
    const sub = onAuthChange(async (authUser) => {
      setUser(authUser);
      if (authUser) {
        const { docs, error } = await fetchDocuments();
        if (!error && docs.length > 0) {
          const mapped = docs.map((d) => ({ ...d, isSaved: true }));
          setDocuments(mapped);
          setActiveDocId(mapped[0].id);
          return;
        }
      }
      loadLocalDocs();
    });
    return () => sub.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadLocalDocs = () => {
    const saved = localStorage.getItem("inkwell_docs");
    if (saved) {
      try {
        const docs = JSON.parse(saved);
        if (docs.length > 0) {
          setDocuments(docs);
          setActiveDocId(docs[0].id);
          return;
        }
      } catch { /* fall through */ }
    }
    const starter = makeDoc("Getting Started", STARTER_CONTENT);
    setDocuments([starter]);
    setActiveDocId(starter.id);
  };

  useEffect(() => {
    if (!user) loadLocalDocs();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Autosave localStorage
  useEffect(() => {
    if (!documents.length) return;
    const t = setTimeout(() => {
      localStorage.setItem("inkwell_docs", JSON.stringify(documents));
    }, 2000);
    return () => clearTimeout(t);
  }, [documents]);

  // Cloud autosave
  const { saveNow } = useAutosave({
    doc:            activeDoc,
    userId:         user?.id || null,
    isOnline,
    onStatusChange: setSaveStatus,
  });

  // Slash commands
  const {
    isOpen: slashOpen, filtered: slashFiltered,
    selectedIndex: slashIndex, position: slashPos,
    close: closeSlash, executeCommand: executeSlash,
    handleEditorChange: detectSlash, setSelectedIndex: setSlashIndex,
  } = useSlashCommands({ viewRef: editorViewRef });

  const handleContentChange = useCallback((content) => {
    if (activeDocId) { updateDocContent(activeDocId, content); detectSlash(content); }
  }, [activeDocId, updateDocContent, detectSlash]);

  const handleTitleChange = useCallback((title) => {
    if (!activeDocId) return;
    setDocuments((prev) => prev.map((d) => d.id === activeDocId ? { ...d, title } : d));
  }, [activeDocId, setDocuments]);

  const handleSave = useCallback(async () => {
    if (!activeDocId) return;
    if (user) {
      saveNow();
    } else {
      setSaveStatus(SAVE_STATUS.SAVING);
      localStorage.setItem("inkwell_docs", JSON.stringify(documents));
      setTimeout(() => { markDocSaved(activeDocId); setSaveStatus(SAVE_STATUS.SAVED); }, 400);
    }
  }, [activeDocId, user, saveNow, documents, markDocSaved]);

  const handleRestore = useCallback((version) => {
    if (!activeDocId) return;
    setDocuments((prev) =>
      prev.map((d) =>
        d.id === activeDocId
          ? { ...d, title: version.title, content: version.content, isSaved: false }
          : d
      )
    );
  }, [activeDocId, setDocuments]);

  // Export handlers wired directly
  const handlePaletteCommand = useCallback((cmdId) => {
    const t = activeDoc?.title || "Untitled";
    const c = activeDoc?.content || "";
    if      (cmdId === "new-doc")     { const d = makeDoc(); setDocuments((p) => [d, ...p]); setActiveDocId(d.id); }
    else if (cmdId === "save")        handleSave();
    else if (cmdId === "focus")       setIsFocusMode((f) => !f);
    else if (cmdId.startsWith("view-"))   setViewMode(cmdId.replace("view-", ""));
    else if (cmdId.startsWith("theme-"))  changeTheme(cmdId.replace("theme-", ""));
    else if (cmdId === "export-md")   exportMarkdown(c, t);
    else if (cmdId === "export-html") exportHTML(c, t, theme);
    else if (cmdId === "export-pdf")  exportPDF(c, t, theme);
    else if (cmdId === "export-docx") exportDOCX(c, t);
  }, [activeDoc, setDocuments, setActiveDocId, handleSave, setIsFocusMode, setViewMode, changeTheme, theme]);

  // Keyboard shortcuts
  useEffect(() => {
    const anyModal = isPaletteOpen || isAuthOpen || isVersionsOpen || isImageOpen || isTableOpen || isExportOpen;
    const handleKey = (e) => {
      if (anyModal) return;
      if ((e.ctrlKey || e.metaKey) && e.key === "k")                    { e.preventDefault(); setIsPaletteOpen(true); }
      if ((e.ctrlKey || e.metaKey) && e.key === "s")                    { e.preventDefault(); handleSave(); }
      if ((e.ctrlKey || e.metaKey) && e.key === "e")                    { e.preventDefault(); setIsExportOpen(true); }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "F")      { e.preventDefault(); setIsFocusMode((f) => !f); }
      if ((e.ctrlKey || e.metaKey) && e.key === "b")                    { e.preventDefault(); setIsSidebarOpen((o) => !o); }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isPaletteOpen, isAuthOpen, isVersionsOpen, isImageOpen, isTableOpen, isExportOpen, handleSave, setIsFocusMode, setIsSidebarOpen]);

  const effectiveViewMode = isMobile && viewMode === "split" ? "editor" : viewMode;

  return (
    <div className={styles.app} data-focus={isFocusMode}>
      <Toolbar
        viewRef={editorViewRef}
        viewMode={effectiveViewMode}
        setViewMode={setViewMode}
        isFocusMode={isFocusMode}
        setIsFocusMode={setIsFocusMode}
        onSave={handleSave}
        isSaving={saveStatus === SAVE_STATUS.SAVING}
        docTitle={activeDoc?.title || ""}
        onTitleChange={handleTitleChange}
        onToggleSidebar={() => setIsSidebarOpen((o) => !o)}
        onOpenPalette={() => setIsPaletteOpen(true)}
        onOpenExport={() => setIsExportOpen(true)}
      />

      {(presence.length > 0 || isConnected) && (
        <div className={styles.presenceBar}>
          <PresenceAvatars presence={presence} myInfo={myInfo} isConnected={isConnected} />
          <span className={styles.presenceText}>
            {presence.length > 0 ? `${presence.length} other${presence.length > 1 ? "s" : ""} here` : "Just you"}
          </span>
          <div className={styles.presenceActions}>
            <button className={styles.presenceBtn} onClick={() => setIsImageOpen(true)}  title="Insert image">🖼</button>
            <button className={styles.presenceBtn} onClick={() => setIsTableOpen(true)}  title="Table editor">⊞</button>
            <button className={styles.presenceBtn} onClick={() => setIsExportOpen(true)} title="Export">⬇</button>
          </div>
        </div>
      )}

      <div className={styles.body}>
        {!isFocusMode && (
          <Sidebar
            documents={documents}
            setDocuments={setDocuments}
            activeDocId={activeDocId}
            setActiveDocId={setActiveDocId}
            isOpen={isSidebarOpen}
            onClose={() => setIsSidebarOpen(false)}
            theme={theme}
            changeTheme={changeTheme}
            user={user}
            onSignIn={() => setIsAuthOpen(true)}
            onSignOut={() => setUser(null)}
          />
        )}

        <div className={styles.workspace}>
          {(effectiveViewMode === "editor" || effectiveViewMode === "split") && (
            <div className={styles.editorPane}>
              <Editor
                key={activeDocId}
                content={activeDoc?.content || ""}
                onChange={handleContentChange}
                theme={theme}
                editorViewRef={editorViewRef}
              />
              <SlashMenu
                isOpen={slashOpen}
                commands={slashFiltered}
                selectedIndex={slashIndex}
                onSelect={executeSlash}
                onHover={setSlashIndex}
                position={slashPos}
              />
            </div>
          )}

          {(effectiveViewMode === "preview" || effectiveViewMode === "split") && (
            <Preview content={activeDoc?.content || ""} />
          )}
        </div>
      </div>

      <StatusBar
        content={activeDoc?.content || ""}
        theme={theme}
        changeTheme={changeTheme}
        saveStatus={saveStatus}
        isOnline={isOnline}
        onOpenVersions={() => setIsVersionsOpen(true)}
      />

      <CommandPalette  isOpen={isPaletteOpen}  onClose={() => setIsPaletteOpen(false)}  onCommand={handlePaletteCommand} />
      <AuthModal       isOpen={isAuthOpen}      onClose={() => setIsAuthOpen(false)}      onSuccess={(u) => setUser(u)} />
      <VersionHistory  isOpen={isVersionsOpen} onClose={() => setIsVersionsOpen(false)}  document={activeDoc} onRestore={handleRestore} />
      <ImageUpload     isOpen={isImageOpen}     onClose={() => setIsImageOpen(false)}     viewRef={editorViewRef} userId={user?.id} />
      <TableEditor     isOpen={isTableOpen}     onClose={() => setIsTableOpen(false)}     viewRef={editorViewRef} />
      <ExportModal     isOpen={isExportOpen}    onClose={() => setIsExportOpen(false)}    document={activeDoc} theme={theme} />
    </div>
  );
}

export default App;
