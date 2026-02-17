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

### Cloudflare Pagesデプロイ（本番環境のみ）

```bash
yarn build && npx wrangler pages deploy dist
```

### D1データベース（初回セットアップのみ）

```bash
npx wrangler d1 create mygpt
npx wrangler d1 execute mygpt --file=create.sql
npx wrangler secret put OPENAI_API_KEY
```

## アーキテクチャ

### 技術スタック

- **フロントエンド**: Nuxt 3 + Vue 3（TypeScript）、ソースは`src/`配下
- **バックエンド**: Nuxtサーバールート（`src/server/api/`）— 本番ではCloudflare D1、ローカルではインメモリフォールバック
- **データベース**: Cloudflare D1（SQLite）。スキーマは`create.sql`。テーブル: `users`, `chats`, `messages`, `personas`, `diaries`
- **AI**: OpenAI Chat Completions API + Anthropic Messages API（マルチプロバイダー対応）。過去メッセージ履歴ベースのコンテキスト管理（最大N往復、`NUXT_MAX_HISTORY_ROUNDS`で設定可能）
- **スタイリング**: Tailwind CSS、Markdownレンダリング用に`@tailwindcss/typography`。ダークテーマの色は`tailwind.config.js`で定義
- **認証**: Cookieベースのセッション管理、パスワード保護（オプション）
- **i18n**: `useI18n` composableで日本語・韓国語・英語をサポート
- **暗号化**: チャット名・コンテンツ・システムプロンプトを暗号化して保存

### ソース構成

```
src/
├── assets/
│   └── css/global.css            # グローバルCSS
├── pages/
│   ├── index.vue                 # /chat へリダイレクト
│   ├── chat/[[id]].vue           # メインチャットページ
│   ├── diary/[[id]].vue          # 日記ページ
│   ├── mindmap.vue               # マインドマップページ
│   └── password.vue              # パスワード認証ページ
├── components/
│   ├── chat/                     # ChatInput, ChatMessage, ChatHeader, ChatSettingsForm, LoadingIndicator
│   ├── sidebar/                  # ChatSidebar, ChatListItem, DiarySidebar, DiaryListItem, MobileHeader, SidebarFooterMenu
│   ├── home/                     # HomeView（チャット未選択時のランディング）
│   ├── navigation/               # AppNavigation
│   ├── ui/                       # ToggleSwitch, PersonaCardGrid（共通UIコンポーネント）
│   └── dialogs/                  # AccountSetupDialog, PersonaManagerDialog, SettingsEditorDialog
├── composables/
│   ├── useAccount.ts             # アカウント管理（ログイン/サインアップ/ログアウト）
│   ├── useChat.ts                # コアのチャット状態・ロジック調整
│   ├── useChatLocal.ts           # ローカル永続化（localStorage）
│   ├── useChatRemote.ts          # リモートAPI操作
│   ├── useChatPage.ts            # チャットページのUIロジック
│   ├── useChatStream.ts          # SSEストリーム解析・メッセージ送信共通ロジック
│   ├── useDiary.ts               # 日記エントリ管理
│   ├── useI18n.ts                # 多言語対応（翻訳データはsrc/locales/*.json）
│   ├── usePageAuth.ts            # ページレベル認証チェック
│   ├── usePersonas.ts            # ペルソナ管理
│   └── useQuestionNavigation.ts  # 質問ナビゲーション
├── types/
│   └── index.ts                  # 共通型定義
├── locales/
│   ├── ja.json                   # 日本語翻訳
│   ├── ko.json                   # 韓国語翻訳
│   └── en.json                   # 英語翻訳
├── utils/
│   ├── dateFormat.ts             # 日付フォーマット
│   ├── diaryStorage.ts           # 日記ローカルストレージ
│   ├── environment.ts            # 環境判定ユーティリティ
│   └── storage.ts                # 汎用ローカルストレージ
├── middleware/
│   └── auth.global.ts            # グローバル認証ミドルウェア
└── server/
    ├── api/                      # Nuxtサーバールート（下記参照）
    └── utils/
        ├── auth.ts               # 認証・認可ユーティリティ（requireAuth, assertChatOwner, assertDiaryOwner）
        ├── db/
        │   ├── common.ts         # 型定義、インメモリストレージ、D1アクセス、useContextToBoolean
        │   ├── chats.ts          # チャットCRUD操作
        │   ├── messages.ts       # メッセージCRUD操作
        │   ├── personas.ts       # ペルソナCRUD操作
        │   ├── users.ts          # ユーザーCRUD操作
        │   └── diary.ts          # 日記エントリCRUD操作
        ├── constants.ts          # 定数（Cookie名、有効期限等）
        ├── crypto.ts             # 暗号化/復号化ユーティリティ
        ├── openai.ts             # AI APIヘルパー（OpenAI Chat Completions + Anthropic Messages + SSE正規化）
        ├── providers.ts          # プロバイダー判定（detectProvider, supportsRAG）
        ├── history.ts            # メッセージ履歴管理（getContextMessages, buildMessagesWithHistory）
        └── env.ts                # 環境変数アクセス（CF Workers vs ローカル）
```

### 主要なアーキテクチャ上の決定

1. **デュアル環境データレイヤー**: `useChat.ts`（composable）と`src/server/utils/db/`の各モジュールが環境に応じて分岐します。ローカル（`localhost`）では、composableがチャット/メッセージの永続化に`localStorage`を使用し、インメモリストアを使うNuxtサーバールートを呼び出します。本番では、すべて同じサーバールート経由でD1に接続します。

2. **ストリーミングフロー**: メッセージ送信は2つのステップに分かれています:
   - `POST /api/chats/:id/messages-stream`（またはローカルでは`/api/messages-stream`）— サーバー側でSSEを統一フォーマット `{"type":"text.delta","delta":"..."}` に正規化してストリーミング
   - `POST /api/chats/:id/messages-save` — ストリーミング完了後に呼び出され、ユーザーとアシスタントの両方のメッセージをD1に永続化
   - `useChatStream.ts`の`parseSSEStream`は`text.delta`イベントをパースし、配列全体を置き換えることでメッセージ配列をリアクティブに更新（Vueのリアクティビティをトリガーするため）

3. **履歴ベースコンテキスト管理**: 過去メッセージ履歴を直接APIに送信する方式。`useContext`が`true`の場合、最大N往復分の履歴を送信（`NUXT_MAX_HISTORY_ROUNDS`環境変数で設定、デフォルト20往復=40メッセージ）。`useContext`が`false`の場合は履歴を送信せず、各メッセージがステートレスになります。

4. **マルチプロバイダー対応**: OpenAI（Chat Completions API）とAnthropic（Messages API）の両方をサポート。モデル名のプレフィックス（`claude-*`）でプロバイダーを自動判定。SSEレスポンスはサーバー側で統一フォーマットに正規化されるため、クライアント側はプロバイダーを意識しません。

5. **RAGサポート**: チャットに`vectorStoreId`が設定されている場合、OpenAI Chat Completions APIリクエストに`file_search`ツールが含まれます。Anthropic（Claude）モデルではRAGは非対応です。

6. **ユーザー認証**: Cookieベースのセッション管理。`auth.global.ts`ミドルウェアが全ルートに適用され、未認証ユーザーを`/password`にリダイレクト。サーバー側では`auth.ts`の`requireAuth()`で認証チェック、`assertChatOwner()`/`assertDiaryOwner()`でリソース所有者検証を行います。

7. **暗号化**: `crypto.ts`を使用してチャット名やコンテンツをサーバー側で暗号化して保存。

8. **チャットcomposableの分離**: チャットロジックを`useChatLocal.ts`（ローカル永続化）、`useChatRemote.ts`（API操作）、`useChatStream.ts`（SSE解析・メッセージ送信共通ロジック`executeSendMessage()`）、`useChatPage.ts`（UIロジック）に分離し、`useChat.ts`が全体を調整します。

9. **i18n翻訳データの外部化**: 翻訳データは`src/locales/{ja,ko,en}.json`に格納し、`useI18n.ts`はロジックのみを保持します。

10. **共通UIコンポーネント**: `ToggleSwitch.vue`（v-modelでboolean制御）と`PersonaCardGrid.vue`（ペルソナ選択グリッド）を共通化し、HomeView・SettingsEditorDialog・ChatSettingsForm等で再利用しています。

11. **DB型の統一**: `use_context`フィールドはDB側では`number | null`（0/1）で管理し、フロントエンドへの変換時に`useContextToBoolean()`を使用してbooleanに変換します。

### サーバーAPIルート

| ルート | ハンドラー | 目的 |
|---|---|---|
| `GET /api/auth/check` | `auth/check.get.ts` | 認証状態チェック |
| `POST /api/auth/verify` | `auth/verify.post.ts` | パスワード認証 |
| `POST /api/users` | `users/index.post.ts` | ユーザー作成 |
| `GET /api/users/me` | `users/me.get.ts` | ログインユーザー情報取得 |
| `POST /api/users/login` | `users/login.post.ts` | ログイン |
| `POST /api/users/logout` | `users/logout.post.ts` | ログアウト |
| `PATCH /api/users/language` | `users/language.patch.ts` | 言語設定の更新 |
| `GET /api/chats` | `chats/index.get.ts` | 最後のメッセージ付きで全チャット一覧取得 |
| `POST /api/chats` | `chats/index.post.ts` | チャット作成（DBレコード作成） |
| `PATCH /api/chats/:id` | `chats/[id].patch.ts` | 名前/モデル/システムプロンプト/vectorStoreIdの更新 |
| `DELETE /api/chats/:id` | `chats/[id].delete.ts` | チャット削除（メッセージもCASCADE削除） |
| `GET /api/chats/:id/messages` | `chats/[id]/messages.get.ts` | DBからメッセージ履歴取得 |
| `POST /api/chats/:id/messages-stream` | `chats/[id]/messages-stream.post.ts` | DB履歴取得→AI応答をストリーミング（本番パス） |
| `POST /api/chats/:id/messages-save` | `chats/[id]/messages-save.post.ts` | ストリーミング後にメッセージを永続化 |
| `POST /api/messages-stream` | `messages-stream.post.ts` | ボディに履歴+パラメータを含めてストリーミング（ローカルパス） |
| `POST /api/generate-title` | `generate-title.post.ts` | Chat Completions APIでチャットタイトル生成 |
| `GET /api/models` | `models.get.ts` | 利用可能なモデルの静的リスト |
| `POST /api/generate-image` | `generate-image.post.ts` | DALL-Eでペルソナ画像生成 |
| `GET/POST/PATCH/DELETE /api/personas` | `personas/` | ペルソナのCRUD |
| `GET /api/diary` | `diary/index.get.ts` | 日記エントリ一覧取得 |
| `POST /api/diary` | `diary/index.post.ts` | 日記エントリ作成 |
| `PATCH /api/diary/:id` | `diary/[id].patch.ts` | 日記エントリ更新 |
| `DELETE /api/diary/:id` | `diary/[id].delete.ts` | 日記エントリ削除 |
| `POST /api/diary/transcribe` | `diary/transcribe.post.ts` | 音声の文字起こし |

### コンポーネントノート

- `chat/[[id]].vue`が中心となるチャットページコンポーネント。`useChatPage()`をUIに接続します。オプショナルな`[id]`セグメントにより、`/chat`（未選択）と`/chat/:id`（チャット選択済み）の両方を許可します。
- `diary/[[id]].vue`が日記ページコンポーネント。音声録音と文字起こし機能を持ちます。
- `components`はnuxt configで`pathPrefix: false`に設定されているため、短い名前でインポートされます（例: `<SidebarSidebar>`ではなく`<Sidebar>`）。
- `ChatMessage.vue`は`marked`を使用してアシスタントメッセージをMarkdownとしてレンダリングします。
- `AppNavigation.vue`がチャット/日記/マインドマップ間のナビゲーションを提供します。

### 環境と設定

- `nuxt.config.ts`: `srcDir`は`src/`、nitroプリセットは`cloudflare-module`。
- OpenAI APIキー: サーバールートで`getOpenAIKey()`経由でアクセス。本番では`event.context.cloudflare.env.NUXT_OPENAI_API_KEY`から、ローカルでは`runtimeConfig.openaiApiKey`から取得（`NUXT_OPENAI_API_KEY`環境変数で設定）。
- Anthropic APIキー: `getAnthropicKey()`経由でアクセス（`NUXT_ANTHROPIC_API_KEY`環境変数で設定）。Claudeモデル使用時のみ必要。
- `NUXT_MAX_HISTORY_ROUNDS`: 履歴保持上限ラウンド数（デフォルト20。1ラウンド=ユーザー+アシスタント=2メッセージ）。
- `NUXT_APP_PASSWORD`: アプリケーションのパスワード保護（オプション）。
- `tsconfig.json`にはD1Database型用の`@cloudflare/workers-types`が含まれます。
- localStorageの保持期間: 730日以上前のチャットは読み込み時に自動的に削除されます。
