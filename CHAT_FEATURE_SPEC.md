# チャット機能 移植仕様書

このドキュメントは、mygpt のチャット機能を別のツールに移植するための仕様をまとめたものです。

---

## 目次

1. [機能概要](#1-機能概要)
2. [アーキテクチャ](#2-アーキテクチャ)
3. [データモデル](#3-データモデル)
4. [データ永続化](#4-データ永続化)
5. [ストリーミング](#5-ストリーミング)
6. [チャット履歴・カレンダーナビゲーション（新機能）](#6-チャット履歴カレンダーナビゲーション新機能)
7. [多言語対応](#7-多言語対応)
8. [フォントサイズ調整](#8-フォントサイズ調整)
9. [UI コンポーネント仕様](#9-ui-コンポーネント仕様)
10. [サーバーAPI仕様](#10-サーバーapi仕様)
11. [AI プロバイダー](#11-ai-プロバイダー)
12. [除外する機能](#12-除外する機能)

---

## 1. 機能概要

| 機能 | 説明 |
|------|------|
| チャット作成・選択・削除・リネーム | 複数チャットを管理 |
| メッセージ送受信（SSEストリーミング） | AI応答をリアルタイムに表示 |
| 生成停止 | ストリーミング中に AbortController で中断 |
| コンテキスト保持 ON/OFF | 過去メッセージを履歴として送信するかどうか |
| モデル選択 | OpenAI / Anthropic の複数モデルを切り替え |
| システムプロンプト設定 | チャットごとにAIの動作を指定 |
| チャット並び替え（ドラッグ&ドロップ） | サイドバーでチャット順序を変更 |
| タイトル自動生成 | 最初のメッセージからAIがタイトルを生成 |
| チャット履歴カレンダーナビゲーション | 日付カレンダーでその日のチャットへジャンプ |
| 質問間ナビゲーション | ↑↓ボタンでチャット内の質問間をスクロール |
| Markdownレンダリング | アシスタント応答を marked でレンダリング |
| 音声入力・文字起こし | マイクで録音 → Whisper API で文字起こし |
| 多言語対応 | 日本語・韓国語・英語 |
| フォントサイズ調整 | small / medium / large / xlarge の4段階 |

---

## 2. アーキテクチャ

### デュアル環境データレイヤー

```
isLocalEnvironment()
├── true  → useChatLocal  （localStorage + Nuxt インメモリ API）
└── false → useChatRemote （Cloudflare D1 API）
```

環境判定は `window.location.hostname === 'localhost'` などで行う。

### composable 構成

```
useChat.ts                  ← 統合コーディネーター（環境分岐）
├── useChatLocal.ts         ← ローカル環境の実装
├── useChatRemote.ts        ← リモート環境の実装
└── useChatStream.ts        ← SSEパース・sendMessage共通ロジック
```

### 状態管理

- `chats: Ref<Chat[]>` — チャット一覧
- `currentChatId: Ref<string | null>` — 選択中のチャットID
- `messages: Ref<Message[]>` — 現在のチャットのメッセージ
- `isLoading: Ref<boolean>` — ストリーミング中フラグ
- `abortController: Ref<AbortController | null>` — 生成停止用

---

## 3. データモデル

### TypeScript 型定義

```typescript
// ユーザー
interface User {
  id: string;
  name: string;
  language?: 'ja' | 'ko' | 'en';
  createdAt: number;
}

// チャット
interface Chat {
  id: string;
  userId: string;
  title: string;
  model: string;              // 例: 'gpt-4o-mini', 'claude-haiku-4-5-20251001'
  systemPrompt?: string | null;
  vectorStoreId?: string | null;  // RAG用（OpenAIのみ）
  useContext: boolean;        // 過去履歴を送信するか
  personaId?: string | null;  // 移植先では不要
  lastMessage?: string;       // サイドバー表示用（50文字）
  createdAt: number;          // UNIXタイムスタンプ（ミリ秒）
  updatedAt: number;
}

// メッセージ
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt?: number;
}

// モデル情報
interface Model {
  id: string;
  name: string;
  inputPrice: string;
  outputPrice: string;
  contextWindow: string;
  description: string;
}

// ローカルストレージ用
interface StoredData {
  user?: User;
  chats: Chat[];
  messages: Record<string, Message[]>;  // chatId → Messages
}
```

### DBスキーマ（Cloudflare D1 / SQLite）

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  language TEXT NOT NULL DEFAULT 'ja',
  created_at INTEGER NOT NULL
);

CREATE TABLE chat_entries (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  model TEXT,
  system_prompt TEXT,
  vector_store_id TEXT,
  use_context INTEGER NOT NULL DEFAULT 1,   -- 1=ON, 0=OFF
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX idx_chat_entries_user_updated ON chat_entries(user_id, updated_at DESC);

CREATE TABLE chat_messages (
  id TEXT PRIMARY KEY,
  chat_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY(chat_id) REFERENCES chat_entries(id) ON DELETE CASCADE
);
CREATE INDEX idx_chat_messages_chat_created ON chat_messages(chat_id, created_at);
```

---

## 4. データ永続化

### ローカル環境（localStorage）

ストレージキー: `mygpt_data`

```typescript
// 読み込み（期限切れチャットを自動削除）
function loadFromStorage(): StoredData {
  const RETENTION_MS = 730 * 24 * 60 * 60 * 1000; // 730日
  // ...期限切れ(updatedAt < now - RETENTION_MS)のチャットとメッセージを削除して返す
}

// 保存
function saveToStorage(data: StoredData): void {
  localStorage.setItem('mygpt_data', JSON.stringify(data));
}
```

**チャット作成時のフロー（ローカル）:**
1. `generateUUID()` でIDを生成
2. `loadFromStorage()` でデータ取得
3. `data.chats.push(newChat)` / `data.messages[chatId] = []`
4. `saveToStorage(data)`
5. `chats.value` を `updatedAt` 降順でソートして更新

**メッセージ送信後のフロー（ローカル）:**
1. ストリーミング完了後 `onSuccess` コールバックを呼ぶ
2. `loadFromStorage()` で最新データを再取得
3. ユーザー・アシスタントメッセージを `data.messages[chatId]` に追記
4. `data.chats[chatIndex].lastMessage` / `updatedAt` を更新
5. `saveToStorage(data)`

### リモート環境（Cloudflare D1）

**ストリーミング完了後の2ステップ保存:**
1. `POST /api/chats/:id/messages-stream` — SSEストリーミング（保存なし）
2. `POST /api/chats/:id/messages-save` — 完了後にユーザー+アシスタントを一括保存

```typescript
// messages-save のリクエストボディ
interface SaveMessagesRequest {
  userMessage: string;
  assistantMessage: string;
}
```

---

## 5. ストリーミング

### SSEフォーマット（サーバー側で正規化済み）

クライアントは常に以下の統一フォーマットを受け取る:
```
data: {"type":"text.delta","delta":"テキスト片"}
data: [DONE]
```

### クライアント側パーサー（`parseSSEStream`）

```typescript
async function parseSSEStream(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  onChunk: (text: string) => void
): Promise<string> {
  const decoder = new TextDecoder();
  let buffer = '';
  let fullContent = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6);
        if (data === '[DONE]') continue;
        try {
          const parsed = JSON.parse(data);
          if (parsed.type === 'text.delta' && parsed.delta) {
            fullContent += parsed.delta;
            onChunk(fullContent);  // 累積テキストを渡す
          }
        } catch { /* ignore */ }
      }
    }
  }
  return fullContent;
}
```

### 生成停止

```typescript
// stopGeneration を呼ぶと AbortController.abort() が発火
const stopGeneration = () => {
  abortController.value?.abort();
};

// abort後の処理（useChatStream.ts より）
if (controller.signal.aborted) {
  const currentContent = messages.value.find(m => m.id === assistantMessage.id)?.content || '';
  if (currentContent) {
    await onSuccess(userMessage, currentContent);  // 途中コンテンツを保存
  } else {
    // 何も生成されていなければメッセージを削除
    messages.value = messages.value.filter(m => m.id !== userMessage.id && m.id !== assistantMessage.id);
  }
}
```

### コンテキスト履歴

- `useContext = true` の場合: 全過去メッセージを `history` として送信
- `useContext = false` の場合: `history = []`（ステートレス）
- サーバー側で `NUXT_MAX_HISTORY_ROUNDS`（デフォルト20往復=40メッセージ）に切り詰め

```typescript
// ローカルパスでのリクエストボディ
{
  history: [{ role: 'user'|'assistant', content: string }],  // useContextがtrueの場合
  message: string,
  model: string,
  systemPrompt?: string,
  vectorStoreId?: string
}

// リモートパスでのリクエストボディ
{
  message: string,
  model: string,
  useContext: boolean  // サーバー側でDB履歴を取得
}
```

---

## 6. チャット履歴・カレンダーナビゲーション（新機能）

> **現行実装には存在しない。移植先での新規実装が必要。**

### 概要

- サイドバーのチャット一覧に、デフォルトで**直近7日分**のチャットを表示
- カレンダーアイコンをクリックすると日付ピッカーが開く
- 日付を選択すると、その日のチャットが一覧に表示されてスクロール位置もその日の最初のチャットに移動

### サイドバーのチャット表示ロジック

```typescript
// 表示するチャットのフィルタリング
const INITIAL_DAYS = 7;

const visibleChats = computed(() => {
  if (selectedDate.value) {
    // カレンダーで選択した日のチャット
    const start = startOfDay(selectedDate.value).getTime();
    const end = endOfDay(selectedDate.value).getTime();
    return chats.value.filter(c => c.updatedAt >= start && c.updatedAt <= end);
  }
  // デフォルト: 直近7日
  const cutoff = Date.now() - INITIAL_DAYS * 24 * 60 * 60 * 1000;
  return chats.value.filter(c => c.updatedAt >= cutoff);
});
```

### カレンダー UI 仕様

```
サイドバー上部（New Chatボタンの下）に配置:

[ + 新しいチャット ]
[ 📅 2026年2月 ] ← クリックでカレンダー展開

カレンダー展開時:
┌────────────────────┐
│  ◁  2026年2月  ▷  │
│ 日 月 火 水 木 金 土│
│              1   2 │
│  3  4  5  6  7  8  9│
│ 10 11 12 13 14 15 16│
│ 17●18 19 20 21 22 23│ ← ●はチャットのある日
│ 24 25 26 27         │
└────────────────────┘
```

### カレンダーのデータ取得

```typescript
// チャットが存在する日付のSet（ハイライト表示に使用）
const datesWithChats = computed((): Set<string> => {
  const dates = new Set<string>();
  for (const chat of chats.value) {
    const d = new Date(chat.updatedAt);
    dates.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
  }
  return dates;
});
```

### 日付選択後のスクロール

```typescript
const handleDateSelect = async (date: Date) => {
  selectedDate.value = date;
  calendarOpen.value = false;

  // フィルタされたチャット一覧の先頭にスクロール
  await nextTick();
  sidebarListRef.value?.scrollTo({ top: 0, behavior: 'smooth' });
};

const handleResetDate = () => {
  selectedDate.value = null;  // 直近7日に戻す
};
```

### サイドバー UI の状態

```typescript
const selectedDate = ref<Date | null>(null);
const calendarOpen = ref(false);
const calendarMonth = ref(new Date());  // カレンダーの表示月

// 表示中の期間ラベル
const periodLabel = computed(() => {
  if (selectedDate.value) {
    return formatDate(selectedDate.value);  // 例: "2/15"
  }
  return t('sidebar.last7days');  // "直近7日"
});
```

---

## 7. 多言語対応

### 設定

```typescript
type Language = 'ja' | 'ko' | 'en';
type FontSize = 'small' | 'medium' | 'large' | 'xlarge';

// グローバル状態（モジュールレベルシングルトン）
const currentLanguage = ref<Language>('ja');
const currentFontSize = ref<FontSize>('medium');

const useI18n = () => {
  const t = (key: string): string => {
    return translations[currentLanguage.value][key] || key;
  };
  // ...
};
```

### 翻訳ファイル構造（抜粋）

```json
// src/locales/ja.json
{
  "chat.input.placeholder": "メッセージを入力...",
  "chat.input.send": "送信",
  "chat.input.stop": "停止",
  "chat.copy": "コピー",
  "chat.copied": "コピーしました",
  "sidebar.newChat": "新しいチャット",
  "sidebar.last7days": "直近7日",
  "sidebar.calendar": "カレンダー",
  "settings.model": "モデル",
  "settings.useContext": "文脈保持",
  "settings.useContext.description": "過去のメッセージをAIに送信します",
  "model.systemPrompt": "AIの性格（システムプロンプト）",
  "fontSize.small": "小",
  "fontSize.medium": "中",
  "fontSize.large": "大",
  "fontSize.xlarge": "特大"
}
```

### 言語はユーザー設定として永続化

- ローカル: `StoredData.user.language` に保存
- リモート: `PATCH /api/users/language` でDB更新

---

## 8. フォントサイズ調整

### 実装

```typescript
const setFontSize = (size: FontSize) => {
  currentFontSize.value = size;
  // data属性でCSS変数を切り替え
  document.documentElement.dataset.fontSize = size;
  // localStorage に保存
  localStorage.setItem('mygpt_fontSize', size);
};

// 初期化時に復元
const initFontSize = () => {
  const saved = localStorage.getItem('mygpt_fontSize') as FontSize | null;
  if (saved) setFontSize(saved);
};
```

### CSS

```css
/* tailwind.config.js で定義、またはグローバルCSSで定義 */
html[data-font-size="small"]  { font-size: 13px; }
html[data-font-size="medium"] { font-size: 15px; }
html[data-font-size="large"]  { font-size: 17px; }
html[data-font-size="xlarge"] { font-size: 20px; }
```

### UI

フッターメニューまたは設定パネルに4段階ボタンを配置:
```
文字サイズ: [ 小 ] [ 中 ] [ 大 ] [ 特大 ]
```

---

## 9. UI コンポーネント仕様

### ChatMessage

- ユーザーメッセージ: 右寄せ、`bg-zinc-800` で囲み、`whitespace-pre-wrap`
- アシスタントメッセージ: `marked` でMarkdownレンダリング（`prose prose-invert`）
- コピーボタン（クリップボードAPI）、2秒後に元に戻る
- タイムスタンプ（M/D HH:MM形式）
- **日本語テキスト前処理**（以下の変換を適用してからMarkdownをレンダリング）:
  - 句点（。）の後に改行を追加
  - 読点（、）で行の30%超の位置にある場合に改行
  - 2行以上続く段落の句点後に空白行を挿入
  - `**text**` を `<strong>text</strong>` に変換

### ChatInput

- `textarea`（auto-resize、max-height: 8行相当）
- Enter で送信（Shift+Enter は改行）、IME変換中は無視
- 左上に音声録音ボタン（マイクアイコン）
- ストリーミング中は送信ボタンの代わりに赤い「停止」ボタン
- 録音中: 経過時間表示（MM:SS）、停止ボタン
- 文字起こし中: スピナー表示

### ChatSidebar

- チャット一覧（ドラッグ&ドロップで並び替え）
- 各アイテム: タイトル + 最後のメッセージのプレビュー
- 長押し/右クリック or ホバーでリネーム・削除メニュー
- フッター: ユーザー名、歯車アイコン（設定）、言語切り替え

### 質問ナビゲーション

チャットエリア右端に固定配置（`sticky top-2`）の↑↓ボタン:
```typescript
// ユーザーメッセージ間を移動
goToPreviousQuestion()  // ↑ canGoPrevious が false なら disabled
goToNextQuestion()      // ↓ canGoNext が false なら disabled
```

スクロール位置を監視して `currentQuestionIndex` を更新（デバウンス100ms）。

### SettingsEditorDialog

チャット選択時に歯車アイコンから開くダイアログ:
- モデル選択（`<select>`）
- システムプロンプト（`<textarea>`）
- Vector Store ID（`<input>`）— RAG、詳細トグルで表示/非表示
- 文脈保持 ON/OFF（トグルスイッチ）

---

## 10. サーバーAPI仕様

### チャット管理

| メソッド | パス | 説明 |
|---------|------|------|
| `GET` | `/api/chats` | チャット一覧（`lastMessage`付き） |
| `POST` | `/api/chats` | チャット作成 |
| `PATCH` | `/api/chats/:id` | タイトル/モデル/設定の更新 |
| `DELETE` | `/api/chats/:id` | チャット削除（CASCADE） |
| `GET` | `/api/chats/:id/messages` | メッセージ一覧 |
| `POST` | `/api/chats/:id/messages-stream` | ストリーミング（リモート） |
| `POST` | `/api/chats/:id/messages-save` | メッセージ永続化 |
| `POST` | `/api/messages-stream` | ストリーミング（ローカル、履歴をbodyで送信） |

### その他

| メソッド | パス | 説明 |
|---------|------|------|
| `GET` | `/api/models` | 利用可能モデル一覧（静的リスト） |
| `POST` | `/api/generate-title` | AIでタイトル生成 |
| `POST` | `/api/transcribe` | Whisper APIで音声文字起こし |

### ストリーミングAPIのレスポンス形式

```
HTTP/1.1 200 OK
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive

data: {"type":"text.delta","delta":"こんにちは"}
data: {"type":"text.delta","delta":"、"}
data: {"type":"text.delta","delta":"世界"}
data: [DONE]
```

---

## 11. AI プロバイダー

### プロバイダー判定

```typescript
// モデル名のプレフィックスでプロバイダーを判定
function detectProvider(model: string): 'openai' | 'anthropic' {
  return model.startsWith('claude-') ? 'anthropic' : 'openai';
}
```

### 対応モデル（2026年2月現在）

| モデルID | 名前 | コンテキスト | RAG |
|---------|------|------------|-----|
| `gpt-4o-mini` | GPT-4o Mini | 128K | ✓ |
| `gpt-4o` | GPT-4o | 128K | ✓ |
| `gpt-5.2` | GPT-5.2 | 400K | ✓ |
| `claude-haiku-4-5-20251001` | Claude Haiku 4.5 | 200K | ✗ |
| `claude-sonnet-4-5-20250929` | Claude Sonnet 4.5 | 200K | ✗ |

### SSE正規化

サーバー側でプロバイダーごとのSSEフォーマットを統一フォーマットに変換:

- **OpenAI Responses API**: `response.output_text.delta` イベントから `delta` を抽出
- **Anthropic Messages API**: `content_block_delta` + `text_delta` から `delta.text` を抽出

クライアントはプロバイダーを意識せず、統一フォーマットを処理する。

### 環境変数

```bash
NUXT_OPENAI_API_KEY=sk-...          # OpenAI APIキー（必須）
NUXT_ANTHROPIC_API_KEY=sk-ant-...   # Anthropic APIキー（Claudeモデル使用時）
NUXT_MAX_HISTORY_ROUNDS=20          # 履歴保持ラウンド数（デフォルト20）
NUXT_APP_PASSWORD=                  # アプリパスワード（オプション）
```

---

## 12. 除外する機能

移植先では以下の機能は**不要**:

| 機能 | 理由 |
|------|------|
| ペルソナ管理 | 不要と明記 |
| RAG（Vector Store） | ペルソナ機能と連携するため一緒に除外可 |
| 画像生成（DALL-E） | チャット機能と無関係 |
| 日記機能 | 別機能 |
| マインドマップ | 別機能 |
| `personaId` フィールド | DB・型定義から除去 |

---

## 13. 移植チェックリスト

### フロントエンド

- [ ] `useChat.ts` + `useChatLocal.ts` + `useChatRemote.ts` + `useChatStream.ts` の実装
- [ ] `ChatMessage.vue` — Markdownレンダリング + 日本語前処理
- [ ] `ChatInput.vue` — textarea autoResize + 停止ボタン + 音声入力
- [ ] `ChatSidebar.vue` — ドラッグ&ドロップ + **カレンダーナビゲーション（新規）**
- [ ] `useQuestionNavigation.ts` — ↑↓質問ナビゲーション
- [ ] `useI18n.ts` + 翻訳ファイル（ja/ko/en）
- [ ] フォントサイズ切り替え（data-font-size属性）
- [ ] `SettingsEditorDialog` — モデル/システムプロンプト/useContext設定

### バックエンド

- [ ] D1スキーマ（`create.sql` から persona/diary テーブルを除いたもの）
- [ ] `/api/messages-stream` — ローカルパス
- [ ] `/api/chats/:id/messages-stream` — リモートパス
- [ ] `/api/chats/:id/messages-save` — リモート保存
- [ ] `/api/chats` CRUD エンドポイント
- [ ] `/api/generate-title` — タイトル自動生成
- [ ] `/api/models` — モデル一覧
- [ ] `/api/transcribe` — 音声文字起こし（オプション）
- [ ] SSE正規化ロジック（`openai.ts` / `normalizeSSEStream`）
- [ ] 認証ミドルウェア

### ストレージ

- [ ] `localStorage` ユーティリティ（730日保持、期限切れ自動削除）
- [ ] `isLocalEnvironment()` 判定ロジック
