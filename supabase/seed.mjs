// ─────────────────────────────────────────────────────────────────────────────
// SEED SCRIPT — pushes the app's existing local seed data (blocks, lots,
// memorials) into your Supabase database, so the DB starts populated exactly
// like the current mock version instead of empty.
//
// Setup (run once, from inside the supabase/ folder):
//   npm install
//   cp .env.example .env      # then fill in the two values
//   node seed.mjs
//
// Requires (in supabase/.env):
//   SUPABASE_URL              — Project Settings → API → Project URL
//   SUPABASE_SERVICE_ROLE_KEY — Project Settings → API → service_role key
//                                (NOT the anon key — this bypasses RLS to seed)
// ─────────────────────────────────────────────────────────────────────────────
import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

import { BLOCKS } from '../User-Dashboard/frontend/src/data/blocks.js'
import { getLotsForBlock, ALL_GRID_BLOCK_IDS } from '../User-Dashboard/frontend/src/data/lots.js'
import { MEMORIALS } from '../User-Dashboard/frontend/src/data/memorials.js'

const SUPABASE_URL = process.env.SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Copy .env.example to .env and fill it in.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

async function seedBlocks() {
  const rows = BLOCKS.map((b) => ({
    id: b.id,
    name: b.name,
    lawn_name: b.lawnName || null,
    has_grid: !!b.hasGrid,
    max_lot: b.maxLot || null,
    grid_cols: b.grid?.cols || null,
    classifications: b.classifications || [],
    sub_areas: b.subAreas || null,
    batches: b.batches || null,
    counts: b.counts || null,
    label_x: b.label.x,
    label_y: b.label.y,
    hotspot: b.hotspot,
  }))
  const { error } = await supabase.from('blocks').upsert(rows)
  if (error) throw error
  console.log(`✔ Seeded ${rows.length} blocks`)
}

async function seedLots() {
  let total = 0
  for (const blockId of ALL_GRID_BLOCK_IDS) {
    const lots = getLotsForBlock(blockId)
    const rows = lots.map((l) => ({
      id: l.id,
      block_id: l.blockId,
      lot_no: l.lotNo,
      classification: l.classification,
      status: l.status,
      interment_count: l.intermentCount,
      verified: l.verified,
    }))
    const { error } = await supabase.from('lots').upsert(rows)
    if (error) throw error
    total += rows.length
  }
  console.log(`✔ Seeded ${total} lots across ${ALL_GRID_BLOCK_IDS.length} blocks`)
}

async function seedMemorials() {
  const { count } = await supabase.from('memorials').select('*', { count: 'exact', head: true })
  if (count > 0) {
    console.log('… memorials table already has data, skipping (avoids duplicate seed rows)')
    return
  }
  const rows = MEMORIALS.map(({ id, ...rest }) => rest) // let DB generate uuid ids
  const { error } = await supabase.from('memorials').insert(rows)
  if (error) throw error
  console.log(`✔ Seeded ${rows.length} memorials`)
}

async function main() {
  await seedBlocks()
  await seedLots()
  await seedMemorials()
  console.log('Done. Your Supabase database now has the same data the app used to mock locally.')
}

main().catch((err) => {
  console.error('Seed failed:', err.message)
  process.exit(1)
})
