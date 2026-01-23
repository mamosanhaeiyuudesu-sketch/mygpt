# MyGPT - 自前ChatGPTアプリケーション

OpenAI Conversations APIとCloudflare D1を組み合わせた、ChatGPT風のチャットアプリケーション。

## 技術スタック

- **フロントエンド**: Nuxt 3 (TypeScript, Vue 3)
- **バックエンド**: Cloudflare Workers
- **データベース**: Cloudflare D1 (SQLite)
- **API**: OpenAI Conversations API & Responses API
- **スタイリング**: Tailwind CSS

## アーキテクチャ

### ハイブリッド構成

1. **OpenAI Conversations API**
   - メッセージ送信時の唯一の情報源
   - 会話文脈を自動管理（conversation ID指定だけで履歴不要）
   - 永久保存

2. **Cloudflare D1**
   - 履歴表示用キャッシュ（OpenAI APIを叩かずに高速表示）
   - チャット一覧・管理
   - リクエスト・レスポンス両方のメッセージを保存

## セットアップ手順

### 1. 依存関係インストール

```bash
npm install
```

### 2. D1データベース作成（手動）

```bash
npx wrangler d1 create mygpt
```

出力例:
```
✅ Successfully created DB 'mygpt' in region APAC
Created your database using D1's new storage backend.

[[d1_databases]]
binding = "DB"
database_name = "mygpt"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

出力された `database_id` を `wrangler.toml` の `PLACEHOLDER` 部分に設定してください。

### 3. スキーマ適用（手動）

```bash
npx wrangler d1 execute mygpt --file=schema.sql
```

### 4. OpenAI APIキー設定（手動）

```bash
npx wrangler secret put OPENAI_API_KEY
```

プロンプトが表示されたら、OpenAI APIキーを入力してください。

### 5. 開発サーバー起動

2つのターミナルを使用します。

**ターミナル1: Cloudflare Workers**
```bash
npx wrangler dev workers/api.ts --port 8787
```

**ターミナル2: Nuxt 3**
```bash
npm run dev
```

### 6. ブラウザでアクセス

```
http://localhost:3000
```

## プロジェクト構造

```
/
├── schema.sql                    # D1のテーブル定義SQL
├── wrangler.toml                 # Cloudflare Workers設定ファイル
├── package.json                  # 依存関係とスクリプト
├── nuxt.config.ts                # Nuxt 3設定
├── tsconfig.json                 # TypeScript設定
├── tailwind.config.js            # Tailwind CSS設定
├── workers/
│   └── api.ts                   # Cloudflare Workers API（全エンドポイント実装）
├── composables/
│   └── useChat.ts               # チャット管理ロジック
└── pages/
    └── index.vue                # メインUI（ChatGPT風デザイン）
```

## API エンドポイント

### チャット管理

- `GET /api/chats` - チャット一覧取得
- `POST /api/chats` - 新しいチャット作成
- `DELETE /api/chats/:id` - チャット削除
- `PATCH /api/chats/:id` - チャット名変更

### メッセージ管理

- `GET /api/chats/:id/messages` - メッセージ履歴取得（D1から）
- `POST /api/chats/:id/messages` - メッセージ送信（OpenAI API経由）

## デプロイ（手動）

### Cloudflare Workers

```bash
npx wrangler deploy
```

### Nuxt 3 (Cloudflare Pages)

```bash
npm run build
npx wrangler pages deploy dist
```

デプロイ後、環境変数 `API_BASE` にデプロイされたWorkers URLを設定してください。

## 機能

- チャット作成・削除・名前変更
- リアルタイムメッセージ送受信
- 会話履歴の永続化
- ChatGPT風のダークモードUI
- 楽観的UI更新

## トラブルシューティング

### D1データベースに接続できない

1. `wrangler.toml` の `database_id` が正しく設定されているか確認
2. `npx wrangler d1 list` でデータベースが作成されているか確認

### OpenAI APIエラー

1. APIキーが正しく設定されているか確認: `npx wrangler secret list`
2. OpenAI APIのクォータを確認
3. Conversations APIがアカウントで有効になっているか確認

### CORSエラー

Workers APIが起動しているか確認してください。`http://localhost:8787` でアクセス可能である必要があります。

## ライセンス

MIT

## 作者

MyGPT Project
