import { supabase } from "../lib/supabase";

const MAX_SIZE_MB = 5;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

/**
 * Validate file before upload
 */
const validateFile = (file) => {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return "Only JPEG, PNG, GIF, and WebP images are allowed.";
  }
  if (file.size > MAX_SIZE_MB * 1024 * 1024) {
    return `Image must be under ${MAX_SIZE_MB}MB.`;
  }
  return null;
};

/**
 * Upload an image to Supabase Storage.
 * Returns the public URL on success.
 */
export const uploadImage = async (file, userId) => {
  const validationError = validateFile(file);
  if (validationError) return { url: null, error: validationError };

  if (!supabase) return { url: null, error: "Storage not available." };

  // Sanitize filename: strip anything that's not alphanumeric/dash/dot
  const ext      = file.name.split(".").pop().toLowerCase().replace(/[^a-z0-9]/g, "");
  const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const path     = `${userId}/${safeName}`;

  const { error } = await supabase.storage
    .from("document-images")
    .upload(path, file, { contentType: file.type, upsert: false });

  if (error) return { url: null, error: error.message };

  const { data } = supabase.storage
    .from("document-images")
    .getPublicUrl(path);

  return { url: data.publicUrl, error: null };
};
