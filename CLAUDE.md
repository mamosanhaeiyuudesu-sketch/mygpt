# CLAUDE.md

このファイルは、Claude Code (claude.ai/code) がこのリポジトリで作業する際のガイダンスを提供します。

## コマンド

```bash
# 依存関係のインストール（パッケージマネージャーはyarn v4.9.1）
yarn install

# Nuxt開発サーバーを起動（ポート3000）
yarn dev

# 本番用ビルド
yarn build

# 本番ビルドのプレビュー
yarn preview

# 型チェック
npx nuxi typecheck

# Nuxtの準備（.nuxtの型を生成）
npx nuxt prepare
```

### Cloudflare Workers（ローカル開発では別プロセス）

Workers API（`workers/api.ts`）は**レガシーなスタンドアロンエントリーポイント**です。ローカルの`yarn dev`では使用されません。`src/server/api/`配下のNuxtサーバールートがローカルでのすべてのAPIリクエストを処理します。`workers/api.ts`は参考用に残していますが、実際に使用されているバックエンドはNuxtサーバーディレクトリです。

```bash
# Workersをデプロイ（本番環境のみ）
npx wrangler deploy

# NuxtをCloudflare Pagesにデプロイ（本番環境のみ）
yarn build && npx wrangler pages deploy dist
```

### D1データベース（初回セットアップのみ）

```bash
npx wrangler d1 create mygpt
npx wrangler d1 execute mygpt --file=schema.sql
npx wrangler secret put OPENAI_API_KEY
```

## アーキテクチャ

### 技術スタック

- **フロントエンド**: Nuxt 3 + Vue 3（TypeScript）、ソースは`src/`配下
- **バックエンド**: Nuxtサーバールート（`src/server/api/`）— 本番ではCloudflare D1、ローカルではインメモリフォールバック
- **データベース**: Cloudflare D1（SQLite）。スキーマは`schema.sql`。テーブル: `chats`, `messages`, `presets`
- **AI**: OpenAI Conversations API（コンテキスト管理）+ Responses API（ストリーミング応答）
- **スタイリング**: Tailwind CSS、Markdownレンダリング用に`@tailwindcss/typography`。ダークテーマの色は`tailwind.config.js`で定義

### ソース構成

```
src/
├── pages/
│   ├── index.vue              # /chat へリダイレクト
│   └── chat/[[id]].vue        # メインチャットページ（すべてのUIロジックはここ）
├── components/
│   ├── chat/                  # ChatInput, ChatMessage, ChatHeader, LoadingIndicator
│   ├── sidebar/               # Sidebar, ChatListItem, MobileHeader
│   ├── home/                  # HomeView（チャット未選択時のランディング）
│   └── dialogs/               # ModelSelectorDialog, SettingsEditorDialog
├── composables/
│   ├── useChat.ts             # コアのチャット状態・ロジックのcomposable
│   └── usePresets.ts          # プリセット管理のcomposable
├── types/
│   └── index.ts               # 共通型定義
├── utils/
│   └── environment.ts         # 環境判定ユーティリティ
└── server/
    ├── api/                   # Nuxtサーバールート（下記参照）
    └── utils/
        ├── db.ts              # D1データベース操作（+ インメモリフォールバック）
        ├── openai.ts          # OpenAI APIヘルパー（会話作成、ストリーミング）
        └── env.ts             # 環境変数アクセス（CF Workers vs ローカル）
```

### 主要なアーキテクチャ上の決定

1. **デュアル環境データレイヤー**: `useChat.ts`（composable）と`src/server/utils/db.ts`の両方が環境に応じて分岐します。ローカル（`localhost`）では、composableがチャット/メッセージの永続化に`localStorage`を使用し、インメモリストアを使うNuxtサーバールートを呼び出します。本番では、すべて同じサーバールート経由でD1に接続します。

2. **ストリーミングフロー**: メッセージ送信は2つのステップに分かれています:
   - `POST /api/chats/:id/messages-stream`（またはローカルでは`/api/messages-stream`）— OpenAI Responses APIのSSEを直接クライアントにストリーミング
   - `POST /api/chats/:id/messages-save` — ストリーミング完了後に呼び出され、ユーザーとアシスタントの両方のメッセージをD1に永続化
   - composableの`parseSSEStream`は`response.output_text.delta`イベントをパースし、配列全体を置き換えることでメッセージ配列をリアクティブに更新（Vueのリアクティビティをトリガーするため）

3. **コンテキスト用のOpenAI Conversations API**: 各チャットはOpenAI Conversation IDに紐づいています。Responses APIリクエストで`conversation`を渡すことで、OpenAIが自動的に会話履歴を管理します。`useContext`が`false`の場合、conversation IDは省略され、各メッセージがステートレスになります。

4. **RAGサポート**: チャットに`vectorStoreId`が設定されている場合、Responses APIリクエストに`file_search`ツールと、それを使用するための追加指示が含まれます。

### サーバーAPIルート

| ルート | ハンドラー | 目的 |
|---|---|---|
| `GET /api/chats` | `chats/index.get.ts` | 最後のメッセージ付きで全チャット一覧取得 |
| `POST /api/chats` | `chats/index.post.ts` | チャット作成（OpenAI Conversation + DBレコード作成） |
| `PATCH /api/chats/:id` | `chats/[id].patch.ts` | 名前/モデル/システムプロンプト/vectorStoreIdの更新 |
| `DELETE /api/chats/:id` | `chats/[id].delete.ts` | チャット削除（メッセージもCASCADE削除） |
| `GET /api/chats/:id/messages` | `chats/[id]/messages.get.ts` | DBからメッセージ履歴取得 |
| `POST /api/chats/:id/messages-stream` | `chats/[id]/messages-stream.post.ts` | OpenAI応答をストリーミング（本番パス） |
| `POST /api/chats/:id/messages-save` | `chats/[id]/messages-save.post.ts` | ストリーミング後にメッセージを永続化 |
| `POST /api/conversations` | `conversations.post.ts` | OpenAI Conversationのみ作成（ローカルパス） |
| `POST /api/messages-stream` | `messages-stream.post.ts` | ボディに全パラメータを含めてストリーミング（ローカルパス） |
| `POST /api/generate-title` | `generate-title.post.ts` | Chat Completions APIでチャットタイトル生成 |
| `GET /api/models` | `models.get.ts` | 利用可能な6つのモデルの静的リスト |
| `GET/POST/DELETE /api/presets` | `presets/` | チャットプリセットのCRUD |

### コンポーネントノート

- `chat/[[id]].vue`が中心となるページコンポーネント。すべてのイベントハンドラーを持ち、`useChat()`をUIに接続します。オプショナルな`[id]`セグメントにより、`/chat`（未選択）と`/chat/:id`（チャット選択済み）の両方を許可します。
- `components`はnuxt configで`pathPrefix: false`に設定されているため、短い名前でインポートされます（例: `<SidebarSidebar>`ではなく`<Sidebar>`）。
- `ChatMessage.vue`は`marked`を使用してアシスタントメッセージをMarkdownとしてレンダリングします。

### 環境と設定

- `nuxt.config.ts`: `srcDir`は`src/`、nitroプリセットは`cloudflare-module`。
- OpenAI APIキー: サーバールートで`getOpenAIKey()`経由でアクセス。本番では`event.context.cloudflare.env.NUXT_OPENAI_API_KEY`から、ローカルでは`runtimeConfig.openaiApiKey`から取得（`NUXT_OPENAI_API_KEY`環境変数で設定）。
- `tsconfig.json`にはD1Database型用の`@cloudflare/workers-types`が含まれます。
- localStorageの保持期間: 730日以上前のチャットは読み込み時に自動的に削除されます。
