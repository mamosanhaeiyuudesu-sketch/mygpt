# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install dependencies (yarn is the package manager, v4.9.1)
yarn install

# Start Nuxt dev server (port 3000)
yarn dev

# Build for production
yarn build

# Preview production build
yarn preview

# Type checking
npx nuxi typecheck

# Prepare Nuxt (generates .nuxt types)
npx nuxt prepare
```

### Cloudflare Workers (separate process for local dev)

The Workers API (`workers/api.ts`) is a **legacy standalone entry point** — it is not used during local `yarn dev`. The Nuxt server routes under `src/server/api/` handle all API requests locally. `workers/api.ts` is kept for reference but the active backend is the Nuxt server directory.

```bash
# Deploy Workers (production only)
npx wrangler deploy

# Deploy Nuxt to Cloudflare Pages (production only)
yarn build && npx wrangler pages deploy dist
```

### D1 Database (one-time setup)

```bash
npx wrangler d1 create mygpt
npx wrangler d1 execute mygpt --file=schema.sql
npx wrangler secret put OPENAI_API_KEY
```

## Architecture

### Tech Stack

- **Frontend**: Nuxt 3 + Vue 3 (TypeScript), source in `src/`
- **Backend**: Nuxt server routes (`src/server/api/`) — uses Cloudflare D1 in production, in-memory fallback locally
- **Database**: Cloudflare D1 (SQLite). Schema in `schema.sql`. Tables: `chats`, `messages`, `presets`
- **AI**: OpenAI Conversations API (context management) + Responses API (streaming replies)
- **Styling**: Tailwind CSS with `@tailwindcss/typography` for markdown rendering. Dark theme colors defined in `tailwind.config.js`

### Source Layout

```
src/
├── pages/
│   ├── index.vue              # Redirects to /chat
│   └── chat/[[id]].vue        # Main chat page (all UI logic lives here)
├── components/
│   ├── chat/                  # ChatInput, ChatMessage, ChatHeader, LoadingIndicator
│   ├── sidebar/               # Sidebar, ChatListItem, MobileHeader
│   ├── home/                  # HomeView (landing when no chat selected)
│   └── dialogs/               # ModelSelectorDialog, SettingsEditorDialog
├── composables/
│   └── useChat.ts             # Core chat state & logic composable
└── server/
    ├── api/                   # Nuxt server routes (see below)
    └── utils/
        ├── db.ts              # D1 database operations (+ in-memory fallback)
        ├── openai.ts          # OpenAI API helpers (create conversation, streaming)
        └── env.ts             # Environment variable access (CF Workers vs local)
```

### Key Architectural Decisions

1. **Dual-environment data layer**: `useChat.ts` (composable) and `src/server/utils/db.ts` both branch on environment. Locally (`localhost`), the composable uses `localStorage` for chat/message persistence and calls Nuxt server routes that use an in-memory store. In production, everything goes through D1 via the same server routes.

2. **Streaming flow**: Message sending is split into two steps:
   - `POST /api/chats/:id/messages-stream` (or `/api/messages-stream` locally) — streams the OpenAI Responses API SSE directly back to the client.
   - `POST /api/chats/:id/messages-save` — called after streaming completes to persist both user and assistant messages to D1.
   - The composable's `parseSSEStream` parses `response.output_text.delta` events and reactively updates the message array by replacing the entire array (to trigger Vue reactivity).

3. **OpenAI Conversations API for context**: Each chat is backed by an OpenAI Conversation ID. Passing `conversation` in the Responses API request lets OpenAI manage conversation history automatically. When `useContext` is `false`, the conversation ID is omitted, making each message stateless.

4. **RAG support**: If a `vectorStoreId` is set on a chat, the Responses API request includes a `file_search` tool and appended instructions to use it.

### Server API Routes

| Route | Handler | Purpose |
|---|---|---|
| `GET /api/chats` | `chats/index.get.ts` | List all chats with last message |
| `POST /api/chats` | `chats/index.post.ts` | Create chat (creates OpenAI Conversation + DB row) |
| `PATCH /api/chats/:id` | `chats/[id].patch.ts` | Update name/model/systemPrompt/vectorStoreId |
| `DELETE /api/chats/:id` | `chats/[id].delete.ts` | Delete chat (CASCADE deletes messages) |
| `GET /api/chats/:id/messages` | `chats/[id]/messages.get.ts` | Fetch message history from DB |
| `POST /api/chats/:id/messages-stream` | `chats/[id]/messages-stream.post.ts` | Stream OpenAI response (production path) |
| `POST /api/chats/:id/messages-save` | `chats/[id]/messages-save.post.ts` | Persist messages after streaming |
| `POST /api/conversations` | `conversations.post.ts` | Create OpenAI Conversation only (local path) |
| `POST /api/messages-stream` | `messages-stream.post.ts` | Stream with full params in body (local path) |
| `POST /api/generate-title` | `generate-title.post.ts` | Generate chat title via Chat Completions API |
| `GET /api/models` | `models.get.ts` | Static list of 6 available models |
| `GET/POST/DELETE /api/presets` | `presets/` | CRUD for chat presets |

### Component Notes

- `chat/[[id]].vue` is the central page component. It owns all event handlers and wires `useChat()` to the UI. The optional `[id]` segment allows `/chat` (no selection) and `/chat/:id` (chat selected).
- `components` have `pathPrefix: false` in nuxt config, so they are imported by bare name (e.g., `<Sidebar>` not `<SidebarSidebar>`).
- `ChatMessage.vue` uses `marked` to render assistant messages as Markdown.

### Environment & Config

- `nuxt.config.ts`: `srcDir` is `src/`, nitro preset is `cloudflare-module`.
- OpenAI API key: accessed via `getOpenAIKey()` in server routes. In production it comes from `event.context.cloudflare.env.NUXT_OPENAI_API_KEY`; locally from `runtimeConfig.openaiApiKey` (set via `NUXT_OPENAI_API_KEY` env var).
- `tsconfig.json` includes `@cloudflare/workers-types` for D1Database types.
- localStorage retention: chats older than 730 days are auto-pruned on load.
