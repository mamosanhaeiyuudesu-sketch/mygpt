/**
 * MyGPT Cloudflare Workers API
 * OpenAI Conversations API + D1を使ったチャットバックエンド
 */

// 型定義
export interface Env {
  DB: D1Database;
  OPENAI_API_KEY: string;
}

interface Chat {
  id: string;
  conversation_id: string;
  name: string;
  vector_store_id: string | null;
  created_at: number;
  updated_at: number;
}

interface Message {
  id: string;
  chat_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: number;
}

// CORS設定
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, PATCH, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

/**
 * ユニークID生成（簡易版）
 */
function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * OpenAI Conversations API: Conversation作成
 */
async function createConversation(apiKey: string, name: string): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/conversations', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      metadata: { name }
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${error}`);
  }

  const data = await response.json() as { id: string };
  return data.id;
}

/**
 * OpenAI Responses API: メッセージ送信
 */
async function sendMessage(
  apiKey: string,
  conversationId: string,
  message: string
): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      conversation: conversationId,
      input: message
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${error}`);
  }

  const data = await response.json() as { output: { content: string } };
  return data.output.content;
}

/**
 * ルーティング処理
 */
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // CORS Preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    try {
      // GET /api/chats - チャット一覧取得
      if (method === 'GET' && path === '/api/chats') {
        const result = await env.DB.prepare(`
          SELECT
            c.id,
            c.name,
            c.updated_at,
            (SELECT content FROM messages WHERE chat_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message
          FROM chats c
          ORDER BY c.updated_at DESC
        `).all();

        const chats = (result.results as any[]).map(row => ({
          id: row.id,
          name: row.name,
          lastMessage: row.last_message || '',
          updatedAt: row.updated_at
        }));

        return new Response(JSON.stringify({ chats }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // POST /api/chats - 新しいチャット作成
      if (method === 'POST' && path === '/api/chats') {
        const body = await request.json() as { name?: string };
        const chatName = body.name || 'New Chat';
        const chatId = generateId('chat');
        const now = Date.now();

        // OpenAI Conversationを作成
        const conversationId = await createConversation(env.OPENAI_API_KEY, chatName);

        // D1に保存
        await env.DB.prepare(`
          INSERT INTO chats (id, conversation_id, name, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?)
        `).bind(chatId, conversationId, chatName, now, now).run();

        return new Response(JSON.stringify({ chatId, conversationId }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // DELETE /api/chats/:id - チャット削除
      if (method === 'DELETE' && path.startsWith('/api/chats/')) {
        const chatId = path.split('/')[3];

        await env.DB.prepare('DELETE FROM chats WHERE id = ?').bind(chatId).run();

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // PATCH /api/chats/:id - チャット名変更
      if (method === 'PATCH' && path.startsWith('/api/chats/') && !path.includes('/messages')) {
        const chatId = path.split('/')[3];
        const body = await request.json() as { name: string };

        await env.DB.prepare('UPDATE chats SET name = ? WHERE id = ?')
          .bind(body.name, chatId)
          .run();

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // GET /api/chats/:id/messages - メッセージ履歴取得
      if (method === 'GET' && path.match(/^\/api\/chats\/[^/]+\/messages$/)) {
        const chatId = path.split('/')[3];

        const result = await env.DB.prepare(`
          SELECT id, role, content, created_at
          FROM messages
          WHERE chat_id = ?
          ORDER BY created_at ASC
        `).bind(chatId).all();

        const messages = (result.results as any[]).map(row => ({
          id: row.id,
          role: row.role,
          content: row.content,
          createdAt: row.created_at
        }));

        return new Response(JSON.stringify({ messages }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // POST /api/chats/:id/messages - メッセージ送信
      if (method === 'POST' && path.match(/^\/api\/chats\/[^/]+\/messages$/)) {
        const chatId = path.split('/')[3];
        const body = await request.json() as { message: string };
        const now = Date.now();

        // チャットからconversation_idを取得
        const chatResult = await env.DB.prepare(
          'SELECT conversation_id FROM chats WHERE id = ?'
        ).bind(chatId).first() as { conversation_id: string } | null;

        if (!chatResult) {
          return new Response(JSON.stringify({ error: 'Chat not found' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const conversationId = chatResult.conversation_id;

        // OpenAI APIにメッセージ送信
        const assistantResponse = await sendMessage(
          env.OPENAI_API_KEY,
          conversationId,
          body.message
        );

        // ユーザーメッセージとAIレスポンスをD1に保存
        const userMessageId = generateId('msg');
        const assistantMessageId = generateId('msg');

        await env.DB.batch([
          // ユーザーメッセージを保存
          env.DB.prepare(`
            INSERT INTO messages (id, chat_id, role, content, created_at)
            VALUES (?, ?, 'user', ?, ?)
          `).bind(userMessageId, chatId, body.message, now),

          // アシスタントメッセージを保存
          env.DB.prepare(`
            INSERT INTO messages (id, chat_id, role, content, created_at)
            VALUES (?, ?, 'assistant', ?, ?)
          `).bind(assistantMessageId, chatId, assistantResponse, now + 1),

          // チャットのupdated_atを更新
          env.DB.prepare(`
            UPDATE chats SET updated_at = ? WHERE id = ?
          `).bind(now + 1, chatId)
        ]);

        // アシスタントメッセージを返す
        return new Response(JSON.stringify({
          id: assistantMessageId,
          role: 'assistant',
          content: assistantResponse,
          createdAt: now + 1
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // 404 Not Found
      return new Response('Not Found', {
        status: 404,
        headers: corsHeaders
      });

    } catch (error) {
      console.error('API Error:', error);
      return new Response(JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal Server Error'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }
};
