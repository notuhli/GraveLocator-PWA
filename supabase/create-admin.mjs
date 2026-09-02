// ─────────────────────────────────────────────────────────────────────────────
// CREATE ADMIN — creates a confirmed user account directly and sets its
// profiles.role to 'admin', so you can skip the signup + email-confirmation
// + manual table-editing steps entirely.
//
// Setup: put this file in the same supabase/ folder as seed.mjs (it reuses
// the same .env — SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY).
//
// Usage:
//   node create-admin.mjs admin@calbayog.gov.ph SomeStrongPassword123
// ─────────────────────────────────────────────────────────────────────────────
import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env')
  process.exit(1)
}

const [, , email, password] = process.argv
if (!email || !password) {
  console.error('Usage: node create-admin.mjs <email> <password>')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

async function main() {
  // 1. Create the user, pre-confirmed (skips the "check your email" step).
  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (createError) throw createError
  const userId = created.user.id
  console.log(`✔ Created user ${email} (id: ${userId})`)

  // 2. The DB trigger auto-creates a profiles row on signup — give it a moment,
  //    then promote that row to admin.
  await new Promise((r) => setTimeout(r, 500))

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ role: 'admin' })
    .eq('id', userId)
  if (updateError) throw updateError

  console.log(`✔ Set role = 'admin' for ${email}`)
  console.log('\nDone. You can now log into the Admin dashboard with:')
  console.log(`  email:    ${email}`)
  console.log(`  password: ${password}`)
}

main().catch((err) => {
  console.error('Failed:', err.message)
  process.exit(1)
})
