/**
 * 共通型定義
 */

// チャット
export interface Chat {
  id: string;
  name: string;
  conversationId: string;
  model: string;
  systemPrompt?: string | null;
  vectorStoreId?: string | null;
  useContext: boolean;
  lastMessage?: string;
  createdAt: number;
  updatedAt: number;
}

// メッセージ
export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: number;
}

// プリセット
export interface Preset {
  id: string;
  name: string;
  model: string;
  systemPrompt: string | null;
  vectorStoreId: string | null;
  useContext: boolean;
  createdAt?: number;
}

// モデル
export interface Model {
  id: string;
  name: string;
  inputPrice: string;
  outputPrice: string;
  contextWindow: string;
  description: string;
}

// ローカルストレージ用データ構造
export interface StoredData {
  chats: Chat[];
  messages: Record<string, Message[]>;
}

// API リクエスト型
export interface CreateChatRequest {
  name?: string;
  model: string;
  systemPrompt?: string;
  vectorStoreId?: string;
  useContext?: boolean;
}

export interface SendMessageRequest {
  conversationId?: string;
  message: string;
  model: string;
  systemPrompt?: string;
  vectorStoreId?: string;
  useContext?: boolean;
}

export interface UpdateChatSettingsRequest {
  model?: string;
  systemPrompt?: string | null;
  vectorStoreId?: string | null;
  useContext?: boolean;
}

export interface SaveMessagesRequest {
  userMessage: string;
  assistantMessage: string;
}

export interface CreatePresetRequest {
  name: string;
  model: string;
  systemPrompt?: string | null;
  vectorStoreId?: string | null;
  useContext?: boolean;
}

// API レスポンス型
export interface CreateChatResponse {
  chatId: string;
  conversationId: string;
}

export interface GetChatsResponse {
  chats: Chat[];
}

export interface GetMessagesResponse {
  messages: Message[];
}

export interface GetPresetsResponse {
  presets: Preset[];
}

export interface GenerateTitleResponse {
  title: string;
}
