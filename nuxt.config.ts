// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  // Source directory
  srcDir: 'src/',
  serverDir: 'src/server/',

  // Nuxt modules
  modules: ['@nuxtjs/tailwindcss'],

  // Components configuration - disable path prefix for cleaner imports
  components: {
    dirs: [
      {
        path: '~/components',
        pathPrefix: false
      }
    ]
  },

  // Cloudflare Workers deployment
  nitro: {
    preset: 'cloudflare-module'
  },

  // Runtime configuration
  runtimeConfig: {
    // サーバー側のみ（NUXT_OPENAI_API_KEY 環境変数で設定）
    openaiApiKey: ''
  },

  // App configuration
  app: {
    head: {
      title: 'MyGPT',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'OpenAI Conversations APIを使った自前ChatGPTアプリケーション' }
      ]
    }
  },

  // TypeScript configuration
  typescript: {
    strict: true,
    typeCheck: false
  },

  // Development server configuration
  devServer: {
    port: 3000
  },

  compatibilityDate: '2024-01-01'
})
