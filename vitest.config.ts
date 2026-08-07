import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  test: {
    environment: 'node',
    env: {
      NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
      ANTHROPIC_API_KEY: 'test-anthropic-key',
      // Any valid base64 secret. Tests sign their own requests with it, so the
      // real production secret is never needed and never referenced here.
      RESEND_INBOUND_WEBHOOK_SECRET: 'whsec_dGVzdC1pbmJvdW5kLXdlYmhvb2stc2VjcmV0',
    },
  },
})
