import { useEffect, useRef, useCallback } from "react";
import { updateDocument, createDocument, saveVersion } from "../services/documentService";

const AUTOSAVE_DELAY = 3000; // 3 seconds after last keystroke
const VERSION_INTERVAL = 5 * 60 * 1000; // Save a version every 5 minutes

export const SAVE_STATUS = {
  IDLE:    "idle",
  PENDING: "pending",
  SAVING:  "saving",
  SAVED:   "saved",
  ERROR:   "error",
  OFFLINE: "offline",
};

export const useAutosave = ({ doc, userId, isOnline, onStatusChange }) => {
  const timerRef        = useRef(null);
  const versionTimerRef = useRef(null);
  const lastSavedRef    = useRef(null);
  const isSavingRef     = useRef(false);

  const save = useCallback(async (document, createIfNew = false) => {
    if (!userId || !document || isSavingRef.current) return;
    if (!isOnline) {
      onStatusChange(SAVE_STATUS.OFFLINE);
      return;
    }

    isSavingRef.current = true;
    onStatusChange(SAVE_STATUS.SAVING);

    try {
      let result;
      if (createIfNew) {
        result = await createDocument(document);
      } else {
        result = await updateDocument(document.id, {
          title:   document.title,
          content: document.content,
        });
      }

      if (result.error) {
        // Doc might not exist yet in cloud, try creating it
        if (result.error.includes("0 rows")) {
          const created = await createDocument(document);
          if (created.error) throw new Error(created.error);
        } else {
          throw new Error(result.error);
        }
      }

      lastSavedRef.current = Date.now();
      onStatusChange(SAVE_STATUS.SAVED);
    } catch (err) {
      console.error("Autosave failed:", err);
      onStatusChange(SAVE_STATUS.ERROR);
    } finally {
      isSavingRef.current = false;
    }
  }, [userId, isOnline, onStatusChange]);

  const saveVersionSnapshot = useCallback(async (document) => {
    if (!userId || !document || !isOnline) return;
    await saveVersion({
      documentId: document.id,
      userId,
      title:   document.title,
      content: document.content,
      label:   new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    });
  }, [userId, isOnline]);

  // Debounced autosave: triggers after user stops typing
  useEffect(() => {
    if (!doc || !userId) return;
    onStatusChange(SAVE_STATUS.PENDING);

    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => save(doc), AUTOSAVE_DELAY);

    return () => clearTimeout(timerRef.current);
  }, [doc?.content, doc?.title, userId, save, onStatusChange]);

  // Periodic version snapshot
  useEffect(() => {
    if (!doc || !userId) return;
    versionTimerRef.current = setInterval(() => {
      saveVersionSnapshot(doc);
    }, VERSION_INTERVAL);
    return () => clearInterval(versionTimerRef.current);
  }, [doc, userId, saveVersionSnapshot]);

  // Save immediately (called by Ctrl+S)
  const saveNow = useCallback(() => {
    clearTimeout(timerRef.current);
    if (doc) save(doc);
  }, [doc, save]);

  return { saveNow };
};
