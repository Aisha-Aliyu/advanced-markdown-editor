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

// Documents are also kept in this browser, so they open instantly and work offline. Guest
// documents and each account's documents are stored apart, so after a sign-out the next
// person on this browser only sees guest documents. An account's copy stays for its next
// sign-in, since it can hold edits the cloud doesn't have yet.
const GUEST_DOCS  = "inkwell_docs";
const LAST_USER   = "inkwell_user";
const SORTED      = "inkwell_docs_sorted";
const accountDocs = (userId) => `inkwell_docs_${userId}`;

const storage = {
  get(key) {
    try { return localStorage.getItem(key); } catch { return null; }
  },
  set(key, value) {
    try { localStorage.setItem(key, value); } catch { /* full or blocked */ }
  },
  remove(key) {
    try { localStorage.removeItem(key); } catch { /* blocked */ }
  },
};

const readDocs = (key) => {
  try {
    const docs = JSON.parse(storage.get(key));
    return Array.isArray(docs) && docs.length > 0 ? docs : null;
  } catch {
    return null;
  }
};

// Earlier versions saved an account's documents under GUEST_DOCS too. The first time this
// version runs with someone signed in, that shared copy moves to their account. Nothing is
// deleted: with nobody signed in, it can't be told apart from guest documents, so it stays.
const sortSharedDocs = (userId) => {
  if (storage.get(SORTED)) return;
  const shared = storage.get(GUEST_DOCS);
  if (userId && shared && !storage.get(accountDocs(userId))) {
    storage.set(accountDocs(userId), shared);
    if (storage.get(accountDocs(userId)) === shared) storage.remove(GUEST_DOCS);
  }
  storage.set(SORTED, "1");
};

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

  // Where the documents on screen are kept in this browser: GUEST_DOCS or accountDocs(id),
  // or null while they change hands (nothing is saved then)
  const docsKeyRef = useRef(GUEST_DOCS);
  // Who the documents on screen belong to: undefined until Supabase first reports, null for a guest
  const ownerRef = useRef(undefined);
  // Counts changes of owner, so a slow fetch can't bring documents back after a sign-out
  const authChangeRef = useRef(0);

  const showDocs = (key, docs) => {
    docsKeyRef.current = key;
    const list = docs?.length ? docs : [makeDoc("Getting Started", STARTER_CONTENT)];
    setDocuments(list);
    setActiveDocId(list[0].id);
  };

  // Auth listener
  useEffect(() => {
    const sub = onAuthChange(async (authUser) => {
      setUser(authUser);
      let userId = authUser?.id ?? null;
      // Offline, Supabase can't renew an expired sign-in, so it reports nobody. The last
      // account's documents stay until it can check again (a real sign-out is reported then).
      const lastUser = storage.get(LAST_USER);
      if (!userId && lastUser && !navigator.onLine) userId = lastUser;
      // A token refresh or the like for the same person: the documents stay as they are
      if (userId === ownerRef.current) return;
      ownerRef.current = userId;
      authChangeRef.current += 1;
      const thisChange = authChangeRef.current;
      // Nothing is saved in this browser until the new owner's documents are on screen
      docsKeyRef.current = null;
      sortSharedDocs(userId);

      if (!userId) {
        storage.remove(LAST_USER);
        showDocs(GUEST_DOCS, readDocs(GUEST_DOCS));
        return;
      }

      storage.set(LAST_USER, userId);
      const key = accountDocs(userId);
      // Whatever happens here, showDocs must run, or nothing would be saved in this browser
      let result = { docs: [], error: "not loaded" };
      try {
        result = await fetchDocuments();
      } catch (err) {
        console.error("Loading documents failed:", err);
      }
      if (authChangeRef.current !== thisChange) return;
      const { docs, error } = result;
      if (!error && docs?.length > 0) {
        showDocs(key, docs.map((d) => ({ ...d, isSaved: true })));
        return;
      }
      // Offline, or nothing in the cloud: this browser's copy, or else the guest documents come along
      showDocs(key, readDocs(key) || readDocs(GUEST_DOCS));
    });
    return () => sub.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Until Supabase reports the session, show what this browser showed last
  useEffect(() => {
    const lastUser = storage.get(LAST_USER);
    const key = lastUser ? accountDocs(lastUser) : GUEST_DOCS;
    showDocs(key, readDocs(key));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Autosave localStorage
  useEffect(() => {
    const key = docsKeyRef.current;
    if (!documents.length || !key) return;
    const t = setTimeout(() => {
      // Skipped if the list on screen has changed hands since (for example after a sign-out)
      if (docsKeyRef.current === key) storage.set(key, JSON.stringify(documents));
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
    executeCommand: executeSlash,
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
      if (docsKeyRef.current) localStorage.setItem(docsKeyRef.current, JSON.stringify(documents));
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
      {/* Keyed by account, so nothing typed or previewed carries over to the next person.
          The keys differ because siblings with the same key confuse React. */}
      <AuthModal       key={`auth-${user?.id || "guest"}`} isOpen={isAuthOpen}      onClose={() => setIsAuthOpen(false)}      onSuccess={(u) => setUser(u)} />
      <VersionHistory  key={`versions-${user?.id || "guest"}`} isOpen={isVersionsOpen} onClose={() => setIsVersionsOpen(false)}  document={activeDoc} onRestore={handleRestore} />
      <ImageUpload     isOpen={isImageOpen}     onClose={() => setIsImageOpen(false)}     viewRef={editorViewRef} userId={user?.id} />
      <TableEditor     isOpen={isTableOpen}     onClose={() => setIsTableOpen(false)}     viewRef={editorViewRef} />
      <ExportModal     isOpen={isExportOpen}    onClose={() => setIsExportOpen(false)}    document={activeDoc} theme={theme} />
    </div>
  );
}

export default App;
