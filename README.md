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
- **モデル選択機能**: チャット作成時にモデルを選択可能（一度選んだら変更不可）

## 対応モデル

本アプリケーションでは、コストと性能のバランスを考慮した6つのモデルを厳選して提供しています。

| モデル名 | 入力価格 ($/1M tokens) | 出力価格 ($/1M tokens) | コンテキスト | 特徴・用途 |
|---------|----------------------|----------------------|------------|----------|
| **gpt-4o-mini** | $0.15 | $0.60 | 128K | コスパ最強。日常的なタスクに最適。速度と価格のバランスが良い。チャットボット、簡単な分析、テキスト生成に。 |
| **gpt-4o** | $2.50 | $10.00 | 128K | バランス型の高性能モデル。マルチモーダル対応(テキスト・画像・音声)。GPT-5より安く、高品質な出力が必要な場合の中間選択肢。 |
| **gpt-5** | $1.25 | $10.00 | 400K | 最新の高性能モデル。数学、コーディング、視覚認識、健康分野で大幅な性能向上。GPT-4oより入力が半額で大容量コンテキスト。 |
| **gpt-5.2** | $1.75 | $14.00 | 400K | プロフェッショナル向け最新モデル。専門知識業務、長時間稼働エージェント、コーディング特化。GPT-5より40%高いが性能も向上。 |
| **o3-mini** | $0.40 | $1.60 | 200K | 推論特化の軽量版。論理的思考、計算、複雑な問題解決に最適。推論トークンを使用するため、簡単なタスクには不向き。 |
| **gpt-3.5-turbo** | $0.50 | $1.50 | 16K | レガシーだが最安。シンプルなタスクには十分。コスト下限の確認やベースライン比較用。 |

### モデル選択のポイント

- **日常使い**: `gpt-4o-mini` がコスパ最強
- **高品質な出力が必要**: `gpt-4o` または `gpt-5`
- **長文処理・大規模コンテキスト**: `gpt-5` または `gpt-5.2`（400Kトークン対応）
- **論理的推論・数学**: `o3-mini`
- **コスト最優先**: `gpt-3.5-turbo`

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
