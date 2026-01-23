/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./components/**/*.{js,vue,ts}",
    "./layouts/**/*.vue",
    "./pages/**/*.vue",
    "./plugins/**/*.{js,ts}",
    "./app.vue",
  ],
  theme: {
    extend: {
      // ChatGPT風のダークカラーパレット
      colors: {
        'chat-bg': '#0F172A',        // メイン背景
        'chat-sidebar': '#1E293B',   // サイドバー背景
        'chat-message': '#334155',   // メッセージ背景
        'chat-hover': '#475569',     // ホバー時
      },
    },
  },
  plugins: [],
}
