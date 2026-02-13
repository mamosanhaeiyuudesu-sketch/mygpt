/**
 * 多言語対応 Composable
 */
import type { Language } from '~/types';

// 翻訳データ
const translations: Record<Language, Record<string, string>> = {
  ja: {
    // AccountBadge
    'logout': 'ログアウト',
    'logout.confirm': 'ログアウトしますか？',

    // AccountSetupDialog
    'account': 'アカウント',
    'account.description': 'アカウント名を入力してログインまたは新規作成してください。',
    'account.name': 'アカウント名',
    'account.name.placeholder': '名前を入力',
    'account.login': 'ログイン',
    'account.create': '作成',
    'account.processing': '処理中...',

    // Sidebar
    'sidebar.newChat': '新規チャット',
    'sidebar.deleteChat.confirm': 'このチャットを削除しますか?',

    // ChatInput
    'chat.input.placeholder': 'メッセージを入力...',
    'chat.input.send': '送信',

    // ChatMessage
    'chat.copy': 'コピー',
    'chat.copied': 'コピーしました',

    // HomeView
    'home.title': '新しいチャットを開始',
    'home.selectModel': 'モデルを選択',

    // ModelSelectorDialog
    'model.select': 'モデル選択',
    'model.systemPrompt': 'AIの性格・ふるまい',
    'model.systemPrompt.placeholder': 'AIにどんな話し方や役割をさせたいか入力（任意）',
    'model.vectorStoreId': 'Vector Store ID',
    'model.vectorStoreId.placeholder': 'Vector Store IDを入力（任意）',
    'model.cancel': 'キャンセル',
    'model.create': '作成',

    // SettingsEditorDialog
    'settings.title': 'チャット設定',
    'settings.preset': 'ペルソナ',
    'settings.preset.custom': 'カスタム',
    'settings.preset.delete': '削除',
    'settings.preset.deleteConfirm': 'このペルソナを削除しますか？',
    'settings.model': 'モデル',
    'settings.systemPrompt.placeholder': 'AIにどんな話し方や役割をさせたいか入力（空欄でデフォルト）',
    'settings.vectorStoreId.label': 'Vector Store ID（RAG用）',
    'settings.vectorStoreId.placeholder': 'vs_xxxxxxxxxxxxxxxx（空欄で無効）',
    'settings.vectorStoreId.description': '設定すると、毎回ファイル検索（RAG）を実行して回答します',
    'settings.useContext': '文脈保持',
    'settings.useContext.description': 'ONにすると会話の流れを記憶します。OFFにすると毎回独立した質問として処理します',
    'settings.saveAsPreset': 'この設定をペルソナとして保存',
    'settings.presetName.placeholder': 'ペルソナ名を入力',
    'settings.save': '保存',

    // ChatHeader
    'header.model': 'Model:',
    'header.customPrompt': 'AIの性格設定あり',
    'header.rag': 'RAG有効（Vector Store）',
    'header.fast': '文脈なし（高速モード）',
    'header.editSettings': '設定を編集',
    'header.showDetails': '詳細',
    'header.hideDetails': '閉じる',

    // Common
    'button.cancel': 'キャンセル',

    // Navigation
    'nav.prevQuestion': '前の質問へ',
    'nav.nextQuestion': '次の質問へ',
    'nav.chat': 'チャット',
    'nav.diary': '音声日記',
    'nav.mindmap': '心の地図',

    // Errors
    'error.chatCreate': 'チャットの作成に失敗しました',
    'error.chatDelete': 'チャットの削除に失敗しました',
    'error.messageSend': 'メッセージの送信に失敗しました',
    'error.settingsSave': '設定の保存に失敗しました',

    // PresetManager (ペルソナ管理)
    'presetManager.title': 'ペルソナ管理',
    'presetManager.add': '新規ペルソナ',
    'presetManager.editTitle': 'ペルソナ編集',
    'presetManager.addTitle': 'ペルソナ新規作成',
    'presetManager.edit': '編集',
    'presetManager.delete': '削除',
    'presetManager.deleteConfirm': 'このペルソナを削除しますか？',
    'presetManager.save': '保存',
    'presetManager.cancel': 'キャンセル',
    'presetManager.name': 'ペルソナ名',
    'presetManager.name.placeholder': 'ペルソナ名を入力',

    'presetManager.systemPrompt': 'AIの性格・ふるまい',
    'presetManager.systemPrompt.placeholder': 'AIにどんな話し方や役割をさせたいか入力（空欄でデフォルト）',
    'presetManager.vectorStoreId': 'Vector Store ID（RAG用）',
    'presetManager.vectorStoreId.placeholder': 'vs_xxxxxxxxxxxxxxxx（空欄で無効）',
    'presetManager.image': '画像',
    'presetManager.imageUpload': '画像アップロード',
    'presetManager.empty': 'ペルソナがありません',
    'presetManager.close': '閉じる',

    // Auth
    'auth.placeholder': 'パスワードを入力',
    'auth.login': 'ログイン',
    'auth.error': 'パスワードが正しくありません',

    // Diary
    'diary.startRecording': '録音開始',
    'diary.stopRecording': '録音停止',
    'diary.transcribing': '文字起こし中...',
    'diary.empty': 'まだ日記がありません',
    'diary.deleteConfirm': 'この日記を削除しますか？',
    'diary.micPermissionError': 'マイクの使用許可が必要です',
    'diary.seconds': '秒',

    // Mobile Header Menu
    'menu.rename': '名前を変更',
    'menu.delete': '削除',
    'menu.renamePrompt': '新しい名前を入力',

    // Language
    'language': '言語',

    // Font Size
    'fontSize': '文字サイズ',
    'fontSize.small': '小',
    'fontSize.medium': '中',
    'fontSize.large': '大',
    'fontSize.xlarge': '極大',
  },
  ko: {
    // AccountBadge
    'logout': '로그아웃',
    'logout.confirm': '로그아웃 하시겠습니까?',

    // AccountSetupDialog
    'account': '계정',
    'account.description': '계정 이름을 입력하여 로그인하거나 새로 만드세요.',
    'account.name': '계정 이름',
    'account.name.placeholder': '이름 입력',
    'account.login': '로그인',
    'account.create': '만들기',
    'account.processing': '처리 중...',

    // Sidebar
    'sidebar.newChat': '새 채팅',
    'sidebar.deleteChat.confirm': '이 채팅을 삭제하시겠습니까?',

    // ChatInput
    'chat.input.placeholder': '메시지 입력...',
    'chat.input.send': '보내기',

    // ChatMessage
    'chat.copy': '복사',
    'chat.copied': '복사됨',

    // HomeView
    'home.title': '새 채팅 시작',
    'home.selectModel': '모델 선택',

    // ModelSelectorDialog
    'model.select': '모델 선택',
    'model.systemPrompt': 'AI 성격·행동',
    'model.systemPrompt.placeholder': 'AI에게 어떤 말투나 역할을 원하는지 입력 (선택)',
    'model.vectorStoreId': 'Vector Store ID',
    'model.vectorStoreId.placeholder': 'Vector Store ID 입력 (선택)',
    'model.cancel': '취소',
    'model.create': '만들기',

    // SettingsEditorDialog
    'settings.title': '채팅 설정',
    'settings.preset': '페르소나',
    'settings.preset.custom': '커스텀',
    'settings.preset.delete': '삭제',
    'settings.preset.deleteConfirm': '이 페르소나를 삭제하시겠습니까?',
    'settings.model': '모델',
    'settings.systemPrompt.placeholder': 'AI에게 어떤 말투나 역할을 원하는지 입력 (빈칸이면 기본값)',
    'settings.vectorStoreId.label': 'Vector Store ID (RAG용)',
    'settings.vectorStoreId.placeholder': 'vs_xxxxxxxxxxxxxxxx (빈칸이면 비활성)',
    'settings.vectorStoreId.description': '설정하면 매번 파일 검색(RAG)을 실행하여 답변합니다',
    'settings.useContext': '컨텍스트 유지',
    'settings.useContext.description': 'ON이면 대화 흐름을 기억합니다. OFF이면 매번 독립적인 질문으로 처리합니다',
    'settings.saveAsPreset': '이 설정을 페르소나로 저장',
    'settings.presetName.placeholder': '페르소나 이름 입력',
    'settings.save': '저장',

    // ChatHeader
    'header.model': 'Model:',
    'header.customPrompt': 'AI 성격 설정됨',
    'header.rag': 'RAG 활성화 (Vector Store)',
    'header.fast': '컨텍스트 없음 (고속 모드)',
    'header.editSettings': '설정 편집',
    'header.showDetails': '상세',
    'header.hideDetails': '닫기',

    // Common
    'button.cancel': '취소',

    // Navigation
    'nav.prevQuestion': '이전 질문으로',
    'nav.nextQuestion': '다음 질문으로',
    'nav.chat': '채팅',
    'nav.diary': '음성일기',
    'nav.mindmap': '마음의 지도',

    // Errors
    'error.chatCreate': '채팅 생성에 실패했습니다',
    'error.chatDelete': '채팅 삭제에 실패했습니다',
    'error.messageSend': '메시지 전송에 실패했습니다',
    'error.settingsSave': '설정 저장에 실패했습니다',

    // PresetManager (페르소나 관리)
    'presetManager.title': '페르소나 관리',
    'presetManager.add': '새 페르소나',
    'presetManager.editTitle': '페르소나 편집',
    'presetManager.addTitle': '페르소나 새로 만들기',
    'presetManager.edit': '편집',
    'presetManager.delete': '삭제',
    'presetManager.deleteConfirm': '이 페르소나를 삭제하시겠습니까?',
    'presetManager.save': '저장',
    'presetManager.cancel': '취소',
    'presetManager.name': '페르소나 이름',
    'presetManager.name.placeholder': '페르소나 이름 입력',
    'presetManager.systemPrompt': 'AI 성격·행동',
    'presetManager.systemPrompt.placeholder': 'AI에게 어떤 말투나 역할을 원하는지 입력 (빈칸이면 기본값)',
    'presetManager.vectorStoreId': 'Vector Store ID (RAG용)',
    'presetManager.vectorStoreId.placeholder': 'vs_xxxxxxxxxxxxxxxx (빈칸이면 비활성)',
    'presetManager.image': '이미지',
    'presetManager.imageUpload': '이미지 업로드',
    'presetManager.empty': '페르소나가 없습니다',
    'presetManager.close': '닫기',

    // Auth
    'auth.placeholder': '비밀번호 입력',
    'auth.login': '로그인',
    'auth.error': '비밀번호가 올바르지 않습니다',

    // Diary
    'diary.startRecording': '녹음 시작',
    'diary.stopRecording': '녹음 중지',
    'diary.transcribing': '텍스트 변환 중...',
    'diary.empty': '아직 일기가 없습니다',
    'diary.deleteConfirm': '이 일기를 삭제하시겠습니까?',
    'diary.micPermissionError': '마이크 사용 권한이 필요합니다',
    'diary.seconds': '초',

    // Mobile Header Menu
    'menu.rename': '이름 변경',
    'menu.delete': '삭제',
    'menu.renamePrompt': '새 이름 입력',

    // Language
    'language': '언어',

    // Font Size
    'fontSize': '글자 크기',
    'fontSize.small': '소',
    'fontSize.medium': '중',
    'fontSize.large': '대',
    'fontSize.xlarge': '특대',
  },
  en: {
    // AccountBadge
    'logout': 'Logout',
    'logout.confirm': 'Are you sure you want to logout?',

    // AccountSetupDialog
    'account': 'Account',
    'account.description': 'Enter your account name to login or create a new one.',
    'account.name': 'Account Name',
    'account.name.placeholder': 'Enter name',
    'account.login': 'Login',
    'account.create': 'Create',
    'account.processing': 'Processing...',

    // Sidebar
    'sidebar.newChat': 'New Chat',
    'sidebar.deleteChat.confirm': 'Delete this chat?',

    // ChatInput
    'chat.input.placeholder': 'Enter message...',
    'chat.input.send': 'Send',

    // ChatMessage
    'chat.copy': 'Copy',
    'chat.copied': 'Copied',

    // HomeView
    'home.title': 'Start a new chat',
    'home.selectModel': 'Select Model',

    // ModelSelectorDialog
    'model.select': 'Select Model',
    'model.systemPrompt': 'AI Personality',
    'model.systemPrompt.placeholder': 'Describe how the AI should talk or behave (optional)',
    'model.vectorStoreId': 'Vector Store ID',
    'model.vectorStoreId.placeholder': 'Enter Vector Store ID (optional)',
    'model.cancel': 'Cancel',
    'model.create': 'Create',

    // SettingsEditorDialog
    'settings.title': 'Chat Settings',
    'settings.preset': 'Persona',
    'settings.preset.custom': 'Custom',
    'settings.preset.delete': 'Delete',
    'settings.preset.deleteConfirm': 'Delete this persona?',
    'settings.model': 'Model',
    'settings.systemPrompt.placeholder': 'Describe how the AI should talk or behave (blank for default)',
    'settings.vectorStoreId.label': 'Vector Store ID (for RAG)',
    'settings.vectorStoreId.placeholder': 'vs_xxxxxxxxxxxxxxxx (blank to disable)',
    'settings.vectorStoreId.description': 'When set, file search (RAG) is always used for every response',
    'settings.useContext': 'Context Retention',
    'settings.useContext.description': 'ON remembers conversation flow. OFF treats each message as independent',
    'settings.saveAsPreset': 'Save this setting as a persona',
    'settings.presetName.placeholder': 'Enter persona name',
    'settings.save': 'Save',

    // ChatHeader
    'header.model': 'Model:',
    'header.customPrompt': 'AI personality set',
    'header.rag': 'RAG enabled (Vector Store)',
    'header.fast': 'No context (fast mode)',
    'header.editSettings': 'Edit Settings',
    'header.showDetails': 'Details',
    'header.hideDetails': 'Hide',

    // Common
    'button.cancel': 'Cancel',

    // Navigation
    'nav.prevQuestion': 'Previous question',
    'nav.nextQuestion': 'Next question',
    'nav.chat': 'Chat',
    'nav.diary': 'Voice Diary',
    'nav.mindmap': 'Mind Map',

    // Errors
    'error.chatCreate': 'Failed to create chat',
    'error.chatDelete': 'Failed to delete chat',
    'error.messageSend': 'Failed to send message',
    'error.settingsSave': 'Failed to save settings',

    // PresetManager (Persona Manager)
    'presetManager.title': 'Persona Manager',
    'presetManager.add': 'New Persona',
    'presetManager.editTitle': 'Edit Persona',
    'presetManager.addTitle': 'New Persona',
    'presetManager.edit': 'Edit',
    'presetManager.delete': 'Delete',
    'presetManager.deleteConfirm': 'Delete this persona?',
    'presetManager.save': 'Save',
    'presetManager.cancel': 'Cancel',
    'presetManager.name': 'Persona Name',
    'presetManager.name.placeholder': 'Enter persona name',
    'presetManager.systemPrompt': 'AI Personality',
    'presetManager.systemPrompt.placeholder': 'Describe how the AI should talk or behave (blank for default)',
    'presetManager.vectorStoreId': 'Vector Store ID (for RAG)',
    'presetManager.vectorStoreId.placeholder': 'vs_xxxxxxxxxxxxxxxx (blank to disable)',
    'presetManager.image': 'Image',
    'presetManager.imageUpload': 'Upload Image',
    'presetManager.empty': 'No personas',
    'presetManager.close': 'Close',

    // Auth
    'auth.placeholder': 'Enter password',
    'auth.login': 'Login',
    'auth.error': 'Incorrect password',

    // Diary
    'diary.startRecording': 'Start Recording',
    'diary.stopRecording': 'Stop Recording',
    'diary.transcribing': 'Transcribing...',
    'diary.empty': 'No diary entries yet',
    'diary.deleteConfirm': 'Delete this diary entry?',
    'diary.micPermissionError': 'Microphone permission is required',
    'diary.seconds': 'sec',

    // Mobile Header Menu
    'menu.rename': 'Rename',
    'menu.delete': 'Delete',
    'menu.renamePrompt': 'Enter new name',

    // Language
    'language': 'Language',

    // Font Size
    'fontSize': 'Font Size',
    'fontSize.small': 'S',
    'fontSize.medium': 'M',
    'fontSize.large': 'L',
    'fontSize.xlarge': 'XL',
  },
};

export type FontSize = 'small' | 'medium' | 'large' | 'xlarge';

// グローバル状態
const currentLanguage = ref<Language>('ja');
const currentFontSize = ref<FontSize>('medium');

export const useI18n = () => {
  /**
   * 翻訳を取得
   */
  const t = (key: string): string => {
    return translations[currentLanguage.value][key] || key;
  };

  /**
   * 言語を設定
   */
  const setLanguage = (lang: Language) => {
    currentLanguage.value = lang;
  };

  /**
   * 言語オプション
   */
  const languageOptions: { value: Language; label: string }[] = [
    { value: 'ja', label: '日' },
    { value: 'ko', label: '한' },
    { value: 'en', label: 'En' },
  ];

  /**
   * 文字サイズを設定（モバイル用）
   */
  const setFontSize = (size: FontSize) => {
    currentFontSize.value = size;
    if (typeof document !== 'undefined') {
      document.documentElement.dataset.fontSize = size;
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('mygpt_fontSize', size);
    }
  };

  /**
   * 保存済みの文字サイズを復元
   */
  const initFontSize = () => {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('mygpt_fontSize') as FontSize | null;
      if (saved && ['small', 'medium', 'large', 'xlarge'].includes(saved)) {
        setFontSize(saved);
      }
    }
  };

  /**
   * 文字サイズオプション
   */
  const fontSizeOptions: { value: FontSize; labelKey: string }[] = [
    { value: 'small', labelKey: 'fontSize.small' },
    { value: 'medium', labelKey: 'fontSize.medium' },
    { value: 'large', labelKey: 'fontSize.large' },
    { value: 'xlarge', labelKey: 'fontSize.xlarge' },
  ];

  return {
    t,
    currentLanguage: readonly(currentLanguage),
    setLanguage,
    languageOptions,
    currentFontSize: readonly(currentFontSize),
    setFontSize,
    initFontSize,
    fontSizeOptions,
  };
};
