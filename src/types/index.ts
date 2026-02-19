/**
 * 共通型定義
 */

// 言語
export type Language = 'ja' | 'ko' | 'en';

// ユーザー
export interface User {
  id: string;
  name: string;
  language?: Language;
  createdAt: number;
}

// チャット
export interface Chat {
  id: string;
  userId: string;
  title: string;
  model: string;
  systemPrompt?: string | null;
  vectorStoreId?: string | null;
  useContext: boolean;
  personaId?: string | null;
  lastMessage?: string;
  createdAt: number;
  updatedAt: number;
}

// メッセージ
export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt?: number;
}

// 日記セクション（投稿ごとの区切り）
export interface DiarySection {
  id: string;
  text: string;
  duration?: number; // 録音秒数
  completedAt: number;
}

// 日記エントリ
export interface DiaryEntry {
  id: string;
  userId: string;
  title: string;
  sections: DiarySection[];
  createdAt: number;
  updatedAt: number;
}

// 日記エントリ（リスト表示用）
export interface DiaryEntryPreview {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
}

// チャット（リスト表示用）
export interface ChatPreview {
  id: string;
  title: string;
  lastMessage?: string;
  personaName?: string;
}

// ペルソナ
export interface Persona {
  id: string;
  name: string;
  systemPrompt: string | null;
  vectorStoreId: string | null;
  imageUrl: string | null;
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
  user?: User;
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
  personaId?: string;
}

export interface SendMessageRequest {
  history?: { role: string; content: string }[];
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
  personaId?: string | null;
}

export interface SaveMessagesRequest {
  userMessage: string;
  assistantMessage: string;
}

export interface CreatePersonaRequest {
  name: string;
  systemPrompt?: string | null;
  vectorStoreId?: string | null;
}

export interface CreateDiaryEntryRequest {
  text: string;
  duration?: number;
}

export interface GetDiaryEntriesResponse {
  entries: DiaryEntry[];
}

export interface TranscribeResponse {
  text: string;
}

export interface CreateUserRequest {
  name: string;
}

// API レスポンス型
export interface CreateChatResponse {
  chatId: string;
}

export interface GetChatsResponse {
  chats: Chat[];
}

export interface GetMessagesResponse {
  messages: Message[];
}

export interface GetPersonasResponse {
  personas: Persona[];
}

export interface GenerateTitleResponse {
  title: string;
}

export interface CreateUserResponse {
  user: User;
}

export interface GetUserResponse {
  user: User;
}
