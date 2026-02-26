import { supabase } from "../lib/supabase";

/**
 * Sanitize document content before saving.
 * Prevents storing runaway content over 500KB.
 */
const sanitizeDoc = (doc) => ({
  title: (doc.title || "Untitled").slice(0, 200),
  content: (doc.content || "").slice(0, 500000),
});

/**
 * Fetch all documents for the current user
 */
export const fetchDocuments = async () => {
  const { data, error } = await supabase
    .from("documents")
    .select("id, title, content, created_at, updated_at")
    .eq("is_deleted", false)
    .order("updated_at", { ascending: false });

  if (error) return { docs: [], error: error.message };
  return { docs: data, error: null };
};

/**
 * Create a new document in the cloud
 */
export const createDocument = async (doc) => {
  const clean = sanitizeDoc(doc);
  const { data, error } = await supabase
    .from("documents")
    .insert({ ...clean, id: doc.id })
    .select()
    .single();

  if (error) return { doc: null, error: error.message };
  return { doc: data, error: null };
};

/**
 * Update an existing document
 */
export const updateDocument = async (id, updates) => {
  const clean = sanitizeDoc(updates);
  const { data, error } = await supabase
    .from("documents")
    .update(clean)
    .eq("id", id)
    .select()
    .single();

  if (error) return { doc: null, error: error.message };
  return { doc: data, error: null };
};

/**
 * Soft-delete a document
 */
export const deleteDocument = async (id) => {
  const { error } = await supabase
    .from("documents")
    .update({ is_deleted: true })
    .eq("id", id);

  return { error: error?.message || null };
};

/**
 * Save a version snapshot of a document
 */
export const saveVersion = async ({ documentId, userId, title, content, label }) => {
  const { data, error } = await supabase
    .from("document_versions")
    .insert({
      document_id: documentId,
      user_id: userId,
      title,
      content: content.slice(0, 500000),
      version_label: label || "",
    })
    .select()
    .single();

  if (error) return { version: null, error: error.message };
  return { version: data, error: null };
};

/**
 * Fetch version history for a document (last 20)
 */
export const fetchVersions = async (documentId) => {
  const { data, error } = await supabase
    .from("document_versions")
    .select("id, title, content, version_label, created_at")
    .eq("document_id", documentId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) return { versions: [], error: error.message };
  return { versions: data, error: null };
};
