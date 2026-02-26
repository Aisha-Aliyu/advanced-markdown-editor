# Inkwell ✍️

**A production-ready markdown editor with real-time collaboration, cloud sync, and four distinct themes.**

🔗 **Live:** [inkwell-steel-kappa.vercel.app](https://inkwell-steel-kappa.vercel.app)

-----

## Why I Built This

Most markdown editors are either too minimal (no cloud save, no collaboration) or too bloated (Notion-level complexity). I wanted something in between — a focused writing tool that gets out of your way but has real production features underneath: auth, versioning, real-time presence, and exports that actually look good.

I also used it as a challenge to build a full-stack product from scratch in five days, making every architectural decision myself: which packages to reach for, how to structure the auth flow, how to handle offline state, where the security boundaries live.

-----

## Live Demo

|URL       |[inkwell-steel-kappa.vercel.app](https://inkwell-steel-kappa.vercel.app)|
|----------|------------------------------------------------------------------------|
|Auth      |Sign up with email or use magic link (no password needed)               |
|Guest mode|Works fully offline, docs saved to localStorage                        |

-----

## Features

**Editor**

- CodeMirror 6: the same engine powering VS Code and Replit
- Live split-pane preview (editor / split / preview modes)
- Slash commands: type `/` to insert headings, tables, code blocks, callouts
- Command palette: `Ctrl+K` to search all commands and themes
- Full formatting toolbar with mobile bottom sheet
- Keyboard shortcuts (`Ctrl+B`, `Ctrl+I`, `Ctrl+S`, `Ctrl+Shift+F`)
- Focus mode: hides all chrome for distraction-free writing
- Line numbers, syntax highlighting, word wrap

**Documents**

- Sidebar with create, rename, duplicate, delete, and full-text search
- Autosave: debounced 3 seconds after last keystroke
- Version history: automatic snapshot every 5 minutes, with preview and one-click restore
- Offline-first: works without internet, syncs when back online

**Themes**

- 🌑 **Dark** — deep purple accent, professional
- 🌈 **Kids** — warm amber tones, Ciguatera font throughout
- 🌸 **Women** — rose palette, elegant Palatino prose
- 🌊 **Men** — navy blue, clean Inter sans-serif

Every theme is implemented as a CSS custom property set, swapping themes is a single `data-theme` attribute change with zero JavaScript re-renders.

**Collaboration**

- Supabase Realtime presence — see who’s in the document live
- Colour-coded avatar stack per document
- Live join/leave events with animated indicators

**Export**

- Markdown `.md` — raw file, works with Obsidian, Bear, any editor
- HTML `.html` — fully self-contained with theme-matched styles
- PDF — browser print dialog, `@page` margins, print-optimised typography
- Word `.docx` — XML-based, preserves headings, lists, blockquotes

**Images**

- Drag-and-drop or click-to-browse upload
- Stored in Supabase Storage under `userId/filename`
- File type allowlist: JPEG, PNG, GIF, WebP
- 5MB size limit enforced client-side before upload
- URL insertion as fallback (no auth required)

**Visual Table Editor**

- Add and remove rows and columns interactively
- Live Markdown preview as you edit
- Max 8 columns × 12 rows with sensible guards

-----

## Tech Stack

|Layer    |Choice                                  |Why                                              |
|---------|----------------------------------------|-------------------------------------------------|
|Framework|React 18 + Vite                         |Fast HMR, small bundles, no CRA baggage          |
|Editor   |CodeMirror 6                            |Modular, mobile-friendly, best-in-class perf     |
|Markdown |marked v12 + DOMPurify v3               |Fast parse, XSS-safe sanitization                |
|Auth & DB|Supabase (Postgres + RLS)               |Auth, storage, and realtime in one platform      |
|Realtime |Supabase Realtime channels              |Presence tracking without a WebSocket server     |
|Storage  |Supabase Storage                        |Co-located with auth, easy RLS policies          |
|Styling  |CSS Modules + CSS custom properties     |Scoped styles, zero runtime overhead             |
|Font     |Ciguatera (display), system-ui fallbacks|Distinctive brand feel                           |
|Export   |file-saver + browser print API          |No server needed for any export format           |
|PWA      |vite-plugin-pwa + Workbox               |Installable, offline-capable                     |
|Deploy   |Vercel                                  |Edge CDN, auto-deploy on push, env var management|

-----

## Architecture Decisions

**Why CSS custom properties for themes instead of styled-components or Tailwind?**
Theme switching with CSS variables is instant — no re-render, no class toggling on hundreds of elements. One attribute change on `<html>` cascades everywhere. It also means the theme works inside the CodeMirror editor without any JS bridge.

**Why Supabase over Firebase?**
Postgres means real relational data with row-level security policies — a single SQL line like `auth.uid() = user_id` enforces access control at the database level, not the application level. That’s a meaningful security boundary that Firebase’s client SDK can’t match.

**Why offline-first with localStorage?**
Most writing happens without interruption, but auth sessions expire, servers go down, and mobile connections drop. By writing to localStorage first and syncing to Supabase second, the editor never loses a character. The autosave hook treats localStorage as the source of truth and Supabase as the backup.

**Why a custom autosave hook instead of a library?**
The logic has three independent concerns: debouncing keystrokes (3s), periodic version snapshots (5min), and online/offline detection. A single custom hook keeps all three co-located and testable in isolation.

-----

## Project Structure

```
inkwell/
├── public/
│   ├── fonts/               # Ciguatera font files
│   └── icons/icon.svg       # PWA icon
├── src/
│   ├── components/
│   │   ├── Auth/            # Login modal (email, password, magic link)
│   │   ├── Collaboration/   # Presence avatars
│   │   ├── Editor/          # CodeMirror wrapper, slash menu, image upload, table editor
│   │   ├── Export/          # Export modal (MD, HTML, PDF, DOCX)
│   │   ├── Layout/          # Status bar
│   │   ├── Preview/         # Sanitized HTML preview
│   │   ├── Sidebar/         # Document list, theme switcher, user profile
│   │   ├── Toolbar/         # Formatting toolbar + mobile bottom sheet
│   │   ├── UI/              # Command palette
│   │   └── Versions/        # Version history panel
│   ├── hooks/
│   │   ├── useAutosave.js       # Debounced save + version snapshots
│   │   ├── useCollaboration.js  # Supabase Realtime presence
│   │   ├── useEditor.js         # CodeMirror 6 setup
│   │   ├── useOnlineStatus.js
│   │   └── useSlashCommands.js
│   ├── lib/supabase.js          # Client with graceful degradation
│   ├── services/
│   │   ├── authService.js
│   │   ├── documentService.js   # CRUD + version saves
│   │   └── imageService.js      # Upload with validation
│   ├── store/useStore.js        # Global state (no Redux)
│   ├── themes/                  # One CSS file per theme
│   ├── utils/
│   │   ├── exportUtils.js       # All four export formats
│   │   ├── markdownUtils.js     # parse, sanitize, toolbar actions
│   │   └── rateLimiter.js
│   └── App.jsx
├── vercel.json                  # Security headers + SPA rewrites
└── vite.config.js               # PWA plugin + Workbox config
```

-----

## Local Setup

```bash
git clone https://github.com/Aisha-Aliyu/advanced-markdown-editor.git
cd inkwell
npm install
```

Create `.env`:

```env
VITE_APP_NAME=Inkwell
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Run the database setup SQL in **Supabase → SQL Editor**:

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

```bash
npm run dev
```

-----

## Security

Built security-first throughout, not bolted on at the end.

|Area          |Approach                                                                       |
|--------------|-------------------------------------------------------------------------------|
|XSS           |All markdown parsed through `DOMPurify.sanitize()` before any DOM insertion    |
|SQL injection |Supabase JS SDK parameterized queries — no string-concatenated SQL             |
|Access control|Row Level Security on every table — `auth.uid() = user_id` enforced at DB level|
|File uploads  |MIME type allowlist, 5MB cap, sanitized filenames, user-scoped storage paths   |
|Auth          |Supabase-managed sessions, `autoRefreshToken`, no custom JWT handling          |
|Content limits|Title capped at 200 chars, content at 500KB before any write                   |
|HTTP headers  |CSP, HSTS, X-Frame-Options, Permissions-Policy via Vercel edge config          |
|API keys      |Supabase anon key is public by design — all protection lives in RLS policies   |


> **Note:** The `VITE_SUPABASE_ANON_KEY` in the frontend is intentionally public. It only permits what the RLS policies allow. The `service_role` key is never used in client code.

-----

## What I’d Add Next

- **Supabase Edge Functions** for server-side document validation, currently the 500KB cap is client-side only
- **Y.js** for true concurrent editing with cursor merging, not just presence indicators
- **Nonce-based CSP** to replace `unsafe-inline`, the last remaining XSS vector class
- **Mobile swipe gestures** — swipe right to open sidebar, swipe left to switch view mode
- **Per-document social previews** via a Vercel Edge Function generating `og:image` on the fly

-----

## License

MIT — use it, fork it, build on it.