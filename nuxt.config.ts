// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  // Nuxt modules
  modules: ['@nuxtjs/tailwindcss'],

  // Runtime configuration
  runtimeConfig: {
    public: {
      // Cloudflare Workers APIのベースURL（環境変数で上書き可能）
      apiBase: process.env.API_BASE || 'http://localhost:8787'
    }
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
