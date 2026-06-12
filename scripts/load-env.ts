import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const REQUIRED = ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'ANTHROPIC_API_KEY']

for (const key of REQUIRED) {
  if (!process.env[key]) {
    console.error(`ERROR: missing required environment variable ${key} (set it in .env.local or your shell)`)
    process.exit(1)
  }
}
