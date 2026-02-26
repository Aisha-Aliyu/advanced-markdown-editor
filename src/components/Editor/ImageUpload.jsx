import { useState, useRef } from "react";
import { uploadImage } from "../../services/imageService";
import { insertSnippet } from "../../utils/markdownUtils";
import styles from "./ImageUpload.module.css";

const ImageUpload = ({ isOpen, onClose, viewRef, userId }) => {
  const [tab, setTab] = useState("upload"); // "upload" | "url"
  const [url, setUrl] = useState("");
  const [alt, setAlt] = useState("");
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(null);
  const fileRef = useRef(null);

  if (!isOpen) return null;

  const insertImage = (imageUrl, altText) => {
    if (!imageUrl.trim()) return;
    const md = `![${altText || "image"}](${imageUrl})`;
    if (viewRef?.current) insertSnippet(md)(viewRef.current);
    onClose();
  };

  const handleFile = async (file) => {
    if (!file) return;
    setError("");

    // Local preview while uploading
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target.result);
    reader.readAsDataURL(file);

    setUploading(true);
    const { url: uploadedUrl, error: err } = await uploadImage(file, userId || "anonymous");
    setUploading(false);

    if (err) { setError(err); setPreview(null); return; }
    insertImage(uploadedUrl, alt || file.name.replace(/\.[^.]+$/, ""));
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  return (
    <div className={styles.overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h3 className={styles.title}>Insert Image</h3>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* Tabs */}
        <div className={styles.tabs}>
          {["upload", "url"].map((t) => (
            <button
              key={t}
              className={`${styles.tab} ${tab === t ? styles.tabActive : ""}`}
              onClick={() => { setTab(t); setError(""); }}
            >
              {t === "upload" ? "📁 Upload File" : "🔗 Paste URL"}
            </button>
          ))}
        </div>

        <div className={styles.body}>
          {tab === "upload" ? (
            <>
              <div
                className={`${styles.dropzone} ${dragging ? styles.dragging : ""}`}
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
              >
                {preview ? (
                  <img src={preview} alt="preview" className={styles.previewImg} />
                ) : (
                  <>
                    <div className={styles.dropIcon}>{uploading ? "⏳" : "🖼"}</div>
                    <p className={styles.dropText}>
                      {uploading ? "Uploading..." : "Drop image here or click to browse"}
                    </p>
                    <p className={styles.dropSub}>JPEG, PNG, GIF, WebP · Max 5MB</p>
                  </>
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                style={{ display: "none" }}
                onChange={(e) => handleFile(e.target.files[0])}
              />
            </>
          ) : (
            <div className={styles.urlForm}>
              <label className={styles.label}>Image URL</label>
              <input
                className={styles.input}
                type="url"
                placeholder="https://example.com/image.png"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                autoFocus
              />
              <label className={styles.label} style={{ marginTop: 12 }}>Alt text (optional)</label>
              <input
                className={styles.input}
                type="text"
                placeholder="Description of the image"
                value={alt}
                onChange={(e) => setAlt(e.target.value)}
              />
              <button
                className={styles.insertBtn}
                onClick={() => insertImage(url, alt)}
                disabled={!url.trim()}
              >
                Insert Image
              </button>
            </div>
          )}

          {error && <div className={styles.error}>⚠️ {error}</div>}
        </div>
      </div>
    </div>
  );
};

export default ImageUpload;
