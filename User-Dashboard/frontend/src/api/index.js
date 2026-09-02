// ─────────────────────────────────────────────────────────────────────────────
// API SURFACE — screens import ONLY from here (never from /data directly).
// Each function currently delegates to local seed data via the client; swapping
// to a real backend is a one-line change per function inside this file.
// ─────────────────────────────────────────────────────────────────────────────
import { local, request, USE_REMOTE } from './client'
import { supabase } from './supabaseClient'
import { BLOCKS, PARK_MAP, getBlockById } from '../data/blocks'
import { getLotsForBlock } from '../data/lots'
import { PRICING, CASH_PRICING, INSTALLMENT_FACTORS, INTERMENT_FEES, PRICING_NOTES } from '../data/pricing'
import { INSTALLMENT_INTEREST } from '../config/constants'
import { LEGEND } from '../data/legend'
import { MEMORIALS } from '../data/memorials'
import { createReservation, getMyReservations, getReservationById, cancelReservation } from './reservationApi'

// Row shape from Supabase (snake_case) → the shape screens already expect (camelCase).
function blockFromRow(row) {
  return {
    id: row.id, name: row.name, lawnName: row.lawn_name, hasGrid: row.has_grid,
    maxLot: row.max_lot, grid: row.grid_cols ? { cols: row.grid_cols } : undefined,
    classifications: row.classifications, subAreas: row.sub_areas || undefined,
    batches: row.batches || undefined, counts: row.counts || undefined,
    label: { x: row.label_x, y: row.label_y }, hotspot: row.hotspot,
  }
}
function lotFromRow(row) {
  return {
    id: row.id, blockId: row.block_id, lotNo: row.lot_no,
    classification: row.classification, status: row.status,
    intermentCount: row.interment_count, verified: row.verified,
  }
}
function memorialFromRow(row) {
  return {
    id: row.id, emoji: row.emoji, name: row.name, dates: row.dates,
    quote: row.quote, likes: row.likes, comments: row.comments,
  }
}

// ── Site / blocks ────────────────────────────────────────────────────────────
export function getSite() {
  if (USE_REMOTE) return getBlocks().then((blocks) => ({ map: PARK_MAP, blocks }))
  return local(() => ({ map: PARK_MAP, blocks: BLOCKS }))
}

export async function getBlocks() {
  if (USE_REMOTE) {
    const { data, error } = await supabase.from('blocks').select('*')
    if (error) throw error
    return data.map(blockFromRow)
  }
  return local(() => BLOCKS)
}

export async function getBlock(blockId) {
  if (USE_REMOTE) {
    const { data, error } = await supabase.from('blocks').select('*').eq('id', blockId).single()
    if (error) throw error
    return blockFromRow(data)
  }
  return local(() => getBlockById(blockId))
}

// ── Lots ─────────────────────────────────────────────────────────────────────
export async function getLots(blockId) {
  if (USE_REMOTE) {
    const { data, error } = await supabase.from('lots').select('*').eq('block_id', blockId).order('lot_no')
    if (error) throw error
    return data.map(lotFromRow)
  }
  return local(() => getLotsForBlock(blockId))
}

export async function getLot(blockId, lotNo) {
  if (USE_REMOTE) {
    const { data, error } = await supabase
      .from('lots').select('*').eq('block_id', blockId).eq('lot_no', Number(lotNo)).maybeSingle()
    if (error) throw error
    return data ? lotFromRow(data) : null
  }
  return local(() => getLotsForBlock(blockId).find((l) => l.lotNo === Number(lotNo)) || null)
}

// ── Pricing (static reference data — not stored in Supabase; edit pricing.js) ─
export function getPricing() {
  return local(() => ({
    installment: PRICING,
    cash: CASH_PRICING,
    factors: INSTALLMENT_FACTORS,
    interest: INSTALLMENT_INTEREST,
    interment: INTERMENT_FEES,
    notes: PRICING_NOTES,
  }))
}

export function getPricingFor(classification) {
  return local(() => PRICING[classification] || null)
}

// ── Legend ───────────────────────────────────────────────────────────────────
export function getLegend() {
  return local(() => LEGEND)
}

// ── Memorials ────────────────────────────────────────────────────────────────
// Public feed only ever shows approved/featured submissions — new ones start
// 'pending' until an admin reviews them in the Moderation Queue.
export async function getMemorials() {
  if (USE_REMOTE) {
    const { data, error } = await supabase
      .from('memorials')
      .select('*')
      .in('status', ['approved', 'featured'])
      .order('created_at', { ascending: false })
    if (error) throw error
    return data.map(memorialFromRow)
  }
  return local(() => MEMORIALS)
}

// payload: { name, birthDate, deathDate, blockId, lotNo, quote }
export async function createMemorial(payload) {
  const { name, birthDate, deathDate, blockId, lotNo, quote } = payload
  const birthYear = birthDate ? birthDate.slice(0, 4) : '?'
  const deathYear = deathDate ? deathDate.slice(0, 4) : '?'
  const block = getBlockById(blockId)
  const plotLabel = block ? `${block.name}${lotNo ? ` · Lot ${lotNo}` : ''}` : ''
  const dates = `${birthYear} – ${deathYear}${plotLabel ? ` · ${plotLabel}` : ''}`

  if (USE_REMOTE) {
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from('memorials')
      .insert({
        name, quote, dates,
        emoji: '🕊️', likes: 0, comments: 0,
        birth_date: birthDate || null, death_date: deathDate || null,
        block_id: blockId || null, lot_no: lotNo ? Number(lotNo) : null,
        submitted_by: user?.user_metadata?.full_name || null,
        user_id: user?.id,
        status: 'pending',
      })
      .select()
      .single()
    if (error) throw error
    return memorialFromRow(data)
  }
  // Local stub: echo back with a generated id (no persistence yet).
  return local(() => ({ id: `mem-${Date.now()}`, name, dates, quote, emoji: '🕊️', likes: 0, comments: 0 }))
}

// ── Auth (Supabase Auth — only active when USE_REMOTE is on) ────────────────
export async function signUp({ email, password, fullName, phone }) {
  const { data, error } = await supabase.auth.signUp({
    email, password,
    options: { data: { full_name: fullName, phone } },
  })
  if (error) throw error
  return data
}

export async function signIn({ email, password }) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

// Re-sends the confirmation link — used when a login attempt fails because
// the account exists but hasn't confirmed their email yet.
export async function resendConfirmation(email) {
  const { error } = await supabase.auth.resend({ type: 'signup', email })
  if (error) throw error
}

// Verifies the 6-digit code from the confirmation email and logs the user in.
// Requires the "Confirm signup" email template to include {{ .Token }}.
export async function verifySignupCode(email, token) {
  const { data, error } = await supabase.auth.verifyOtp({ email, token, type: 'signup' })
  if (error) throw error
  return data
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

// Updates the signed-in user's display name/phone — both the auth session's
// metadata (so the app's greeting/profile update instantly) and the profiles
// table row (so it's consistent for anything querying that table directly).
export async function updateProfile({ fullName, phone }) {
  const { data, error } = await supabase.auth.updateUser({ data: { full_name: fullName, phone } })
  if (error) throw error

  const { error: profileError } = await supabase
    .from('profiles')
    .update({ full_name: fullName, phone })
    .eq('id', data.user.id)
  if (profileError) throw profileError

  return data
}

// Changes the signed-in user's password. Supabase doesn't ask for the old
// password here since the user already has a valid session (they're signed in).
export async function changePassword(newPassword) {
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) throw error
}

export async function getCurrentSession() {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  return data.session
}

// ── Reservations — re-exported so screens only ever import from api/ ────────
// (see reservationApi.js for the actual mock implementation + backend notes)
export { createReservation, getMyReservations, getReservationById, cancelReservation }