/**
 * GET /api/models - 利用可能なモデル一覧を取得（静的リスト）
 */

interface Model {
  id: string;
  name: string;
  inputPrice: string;
  outputPrice: string;
  contextWindow: string;
  description: string;
}

// 推奨モデル6選
const AVAILABLE_MODELS: Model[] = [
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    inputPrice: '$0.15',
    outputPrice: '$0.60',
    contextWindow: '128K',
    description: 'コスパ最強。日常的なタスクに最適。'
  },
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    inputPrice: '$2.50',
    outputPrice: '$10.00',
    contextWindow: '128K',
    description: 'バランス型の高性能モデル。マルチモーダル対応。'
  },
  // {
  //   id: 'gpt-5',
  //   name: 'GPT-5',
  //   inputPrice: '$1.25',
  //   outputPrice: '$10.00',
  //   contextWindow: '400K',
  //   description: '最新の高性能モデル。大容量コンテキスト。'
  // },
  {
    id: 'gpt-5.2',
    name: 'GPT-5.2',
    inputPrice: '$1.75',
    outputPrice: '$14.00',
    contextWindow: '400K',
    description: 'プロフェッショナル向け最新モデル。'
  },
  // {
  //   id: 'o3-mini',
  //   name: 'o3-mini',
  //   inputPrice: '$0.40',
  //   outputPrice: '$1.60',
  //   contextWindow: '200K',
  //   description: '推論特化の軽量版。論理的思考に最適。'
  // },
  // {
  //   id: 'gpt-3.5-turbo',
  //   name: 'GPT-3.5 Turbo',
  //   inputPrice: '$0.50',
  //   outputPrice: '$1.50',
  //   contextWindow: '16K',
  //   description: 'レガシーだが最安。シンプルなタスク向け。'
  // }
];

export default defineEventHandler(() => {
  return { models: AVAILABLE_MODELS };
});
