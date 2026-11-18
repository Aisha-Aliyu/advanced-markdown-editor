# Inkwell

A markdown editor with cloud sync, version history, live presence and four themes. You can use it as a guest without an account, or sign in to sync your documents.

Live demo: https://inkwell-steel-kappa.vercel.app

Sign up with email and a password, or with a magic link. As a guest, your documents stay in your browser's localStorage and everything works offline.

## Why I built it

Most markdown editors I tried were either too bare (no cloud saving, no collaboration) or too heavy, closer to Notion. I wanted something in between: a focused writing tool with real features underneath, like accounts, version history, live presence and exports that look good.

I also gave myself five days to build it from scratch as a full stack product, and I made every architecture call myself: which packages to use, how the auth flow works, how offline state is handled and where the security boundaries sit.

## Features

### Editor

- CodeMirror 6 for the editing itself.
- Editor, split and preview modes, with the preview updating as you type.
- Slash commands: type `/` to insert headings, tables, code blocks or callouts.
- A command palette on `Ctrl+K` for every command and theme.
- A formatting toolbar, which becomes a bottom sheet on mobile.
- Keyboard shortcuts such as `Ctrl+B`, `Ctrl+I`, `Ctrl+S` and `Ctrl+Shift+F`.
- Focus mode, which hides everything except the text.
- Line numbers, syntax highlighting and word wrap.

### Documents

- A sidebar to create, rename, duplicate, delete and search your documents.
- Autosave 3 seconds after you stop typing.
- Version history with a snapshot every 5 minutes. You can preview any version and restore it in one click.
- Offline first: it keeps working without internet and syncs when you're back online.

### Themes

- Dark, with a deep purple accent.
- Kids, in warm amber with the Ciguatera font throughout.
- Women, a rose palette with Palatino for the text.
- Men, navy blue with Inter.

Each theme is a set of CSS custom properties, so switching themes only changes one `data-theme` attribute and nothing re-renders.

### Collaboration

- Supabase Realtime presence shows who else has the document open.
- Each person gets a coloured avatar, and you can see people join and leave as it happens.

### Export

- Markdown (`.md`), which opens in Obsidian, Bear or any other editor.
- HTML (`.html`), a single self-contained file styled to match your theme.
- PDF through the browser's print dialog, with print margins and typography set up.
- Word (`.docx`), keeping headings, lists and blockquotes.

### Images

- Drag and drop an image, or click to browse.
- Uploads go to Supabase Storage under `userId/filename`.
- Only JPEG, PNG, GIF and WebP are allowed, and files over 5 MB are rejected before upload.
- You can also insert an image by URL, which doesn't need an account.

### Table editor

- Add and remove rows and columns visually, with a live markdown preview.
- Up to 8 columns and 12 rows.

## Tech stack

- React 18 and Vite.
- CodeMirror 6 for the editor.
- marked for parsing markdown, and DOMPurify to sanitise the HTML.
- Supabase for auth, the Postgres database with row level security, file storage and realtime presence.
- CSS Modules and CSS custom properties for styling.
- The Ciguatera display font, with system fonts as the fallback.
- file-saver and the browser's print API for exports, so no export needs a server.
- vite-plugin-pwa and Workbox, so it installs as an app and works offline.
- Vercel for hosting.

## Decisions I made

### Why CSS custom properties for themes?

Switching themes with CSS variables is instant. There's no re-render and no toggling classes on hundreds of elements, because one attribute change on `<html>` cascades everywhere. It also means the theme reaches inside the CodeMirror editor without any JavaScript bridge.

### Why Supabase?

It's real Postgres, and row level security lets one rule, `auth.uid() = user_id`, enforce access in the database instead of in app code.

### Why offline first with localStorage?

Sessions expire, servers go down and mobile connections drop. The editor writes to localStorage first and syncs to Supabase second, so none of that loses your work. The autosave hook treats localStorage as the source of truth and Supabase as the backup.

### Why a custom autosave hook?

It handles three separate jobs: debouncing keystrokes (3 seconds), taking version snapshots (every 5 minutes) and watching whether you're online. Keeping them in one hook keeps them together and easy to test on their own.

## Run it locally

```bash
git clone https://github.com/Aisha-Aliyu/advanced-markdown-editor.git
cd advanced-markdown-editor
npm install
```

Create a `.env` file:

```env
VITE_APP_NAME=Inkwell
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

In your Supabase project, open the SQL Editor and run this to create the tables and access rules:

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE documents (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL DEFAULT 'Untitled',
  content text NOT NULL DEFAULT '',
  is_deleted boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE document_versions (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  document_id uuid REFERENCES documents(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  version_label text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own documents" ON documents
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users own versions" ON document_versions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
```

Then start it with `npm run dev`.

## Security

- XSS: all markdown goes through `DOMPurify.sanitize()` before it touches the DOM.
- SQL injection: the Supabase JS client sends parameterised queries, never SQL built from strings.
- Access control: row level security on every table, with `auth.uid() = user_id` checked by the database.
- File uploads: a MIME type allowlist, a 5 MB cap, cleaned filenames and storage paths scoped to each user.
- Auth: sessions are managed by Supabase with `autoRefreshToken`, with no hand-rolled JWT code.
- Content limits: titles are capped at 200 characters and content at 500 KB before any write.
- HTTP headers: CSP, HSTS, X-Frame-Options and Permissions-Policy are set in `vercel.json`.
- API keys: the Supabase anon key is public by design. It can only do what the row level security policies allow, and the `service_role` key is never used in client code.

## What I'd add next

- Supabase Edge Functions to validate documents on the server. Right now the 500 KB cap is only checked in the browser.
- Y.js for true simultaneous editing with merged cursors, beyond presence.
- A nonce based CSP to replace `unsafe-inline`, the last class of XSS risk left.
- Swipe gestures on mobile: right to open the sidebar, left to switch view mode.
- Social preview images for each document, generated by a Vercel Edge Function.

## License

MIT. Use it, fork it, build on it.
