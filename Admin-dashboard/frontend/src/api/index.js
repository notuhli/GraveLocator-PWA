// ─────────────────────────────────────────────────────────────────────────────
// API SURFACE — pages import ONLY from here (never from /data directly).
// Mirrors the User-Dashboard's api/index.js: every function currently resolves
// from local seed data via the shared client; swapping to a real backend is a
// one-line change per function. Because both dashboards import the exact same
// data/blocks.js, data/lots.js, data/pricing.js, and config/status.js, a single
// backend can serve identical block/lot/pricing/status data to both.
// ─────────────────────────────────────────────────────────────────────────────
import { local, USE_REMOTE } from './client'
import { supabase } from './supabaseClient'
import { BLOCKS, PARK_MAP, getBlockById } from '../data/blocks'
import { getLotsForBlock } from '../data/lots'
import { PRICING, CASH_PRICING, INSTALLMENT_FACTORS, INTERMENT_FEES, PRICING_NOTES } from '../data/pricing'
import { INSTALLMENT_INTEREST } from '../config/constants'
import { LEGEND } from '../data/legend'
import { MEMORIALS } from '../data/memorials'
import { USERS, getUserById } from '../data/users'
import { ADMIN_STAFF } from '../data/adminStaff'
import { MEMORIAL_QUEUE, getMemorialQueueById } from '../data/memorialModeration'
import { SENT_NOTIFICATIONS, NOTIFICATION_STATS, SYSTEM_ALERTS } from '../data/notifications'
import { computeDashboardMetrics, computeBlockOccupancy } from '../data/dashboardMetrics'
import { MOCK_RESERVATIONS, getReservationByIdSync } from '../data/mockReservations'
import { STATUS } from '../config/status'

// Row shape from Supabase (snake_case) → the shape pages already expect (camelCase).
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

// ── Site / blocks — identical surface to the User-Dashboard's api/index.js ──
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

// ── Lots — read here too, plus the admin-only write operations below ────────
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

// Admin-only: change a lot's map status directly (e.g. marking it sold).
// Requires the signed-in Supabase user to have profiles.role = 'admin' (RLS).
export async function updateLotStatus(blockId, lotNo, status) {
  if (USE_REMOTE) {
    const { data, error } = await supabase
      .from('lots')
      .update({ status })
      .eq('block_id', blockId)
      .eq('lot_no', Number(lotNo))
      .select()
      .single()
    if (error) throw error
    return lotFromRow(data)
  }
  // Local stub: mutate the cached in-memory lot so the UI reflects the change
  // for this session (no persistence yet — same caveat as createMemorial below).
  return local(() => {
    const lots = getLotsForBlock(blockId)
    const lot = lots.find((l) => l.lotNo === Number(lotNo))
    if (lot) lot.status = status
    return lot || null
  })
}

// ── Pricing ──────────────────────────────────────────────────────────────────
export function getPricing() {
  // NOTE: pricing is static reference data — not yet moved to Supabase.
  return local(() => ({
    installment: PRICING,
    cash: CASH_PRICING,
    factors: INSTALLMENT_FACTORS,
    interest: INSTALLMENT_INTEREST,
    interment: INTERMENT_FEES,
    notes: PRICING_NOTES,
  }))
}

// ── Legend ───────────────────────────────────────────────────────────────────
export function getLegend() {
  return local(() => LEGEND)
}

// ── Dashboard ────────────────────────────────────────────────────────────────
export function getDashboardMetrics() {
  if (USE_REMOTE) {
    return (async () => {
      const [{ data: lots, error: lotsError }, { count: totalUsers, error: usersError }] = await Promise.all([
        supabase.from('lots').select('status'),
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
      ])
      if (lotsError) throw lotsError
      if (usersError) throw usersError

      const available = lots.filter((l) => l.status === STATUS.AVAILABLE).length
      const occupied = lots.filter((l) => l.status === STATUS.SOLD || l.status === STATUS.WITH_INTERMENT).length
      const reserved = lots.filter((l) => l.status === STATUS.RESERVE_LOT).length

      return {
        totalPlots: lots.length,
        available,
        occupied,
        reserved,
        totalUsers: totalUsers || 0,
        // Memorial moderation isn't tracked in the DB yet (no `status` column
        // on `memorials`), so this stays 0 until that schema gap is closed —
        // same limitation as getMemorialQueue() below.
        pendingItems: 0,
      }
    })()
  }
  return local(() => computeDashboardMetrics())
}

export function getBlockOccupancy() {
  if (USE_REMOTE) {
    return (async () => {
      const [{ data: blocks, error: blocksError }, { data: lots, error: lotsError }] = await Promise.all([
        supabase.from('blocks').select('id, name'),
        supabase.from('lots').select('block_id, status'),
      ])
      if (blocksError) throw blocksError
      if (lotsError) throw lotsError

      return blocks
        .map((b) => {
          const blockLots = lots.filter((l) => l.block_id === b.id)
          const occupied = blockLots.filter((l) => l.status === STATUS.SOLD || l.status === STATUS.WITH_INTERMENT).length
          return {
            blockId: b.id,
            name: b.name,
            total: blockLots.length,
            occupied,
            occupancyRate: blockLots.length ? occupied / blockLots.length : 0,
          }
        })
        .filter((b) => b.total > 0)
    })()
  }
  return local(() => computeBlockOccupancy())
}

// ── Site users (public app customers) ────────────────────────────────────────
export async function getUsers() {
  if (USE_REMOTE) {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, phone, created_at')
      .order('created_at', { ascending: false })
    if (error) throw error
    return data.map((row) => ({
      id: row.id,
      name: row.full_name || '(no name set)',
      email: row.email,
      phone: row.phone || '',
      // Plot ownership isn't tracked yet (would need a user_id column on
      // `lots`), so this always shows empty for now rather than fake data.
      plots: [],
      joined: row.created_at,
      // Account activation/deactivation isn't built yet — everyone reads as
      // active until that feature exists.
      status: 'active',
    }))
  }
  return local(() => USERS)
}

// NOTE: create/edit/delete still only affect the local sample data, even in
// remote mode. Deleting or editing a real Supabase Auth account safely
// requires the service_role key, which must stay server-side — doing this
// for real would need a small backend endpoint or Supabase Edge Function,
// not a direct call from the browser.
export function createUser(payload) {
  return local(() => {
    const rec = { id: `usr-${Date.now()}`, plots: [], ...payload }
    USERS.unshift(rec)
    return rec
  })
}

export function updateUser(id, patch) {
  return local(() => {
    const u = getUserById(id)
    if (u) Object.assign(u, patch)
    return u
  })
}

export function deleteUser(id) {
  return local(() => {
    const idx = USERS.findIndex((u) => u.id === id)
    if (idx >= 0) USERS.splice(idx, 1)
    return { id }
  })
}

// ── Admin staff (dashboard login accounts) ───────────────────────────────────
export function getAdminStaff() {
  // NOTE: not yet wired to Supabase — this would be another table + RLS policy.
  return local(() => ADMIN_STAFF)
}

export function addAdminStaff(payload) {
  return local(() => {
    const rec = { id: `admin-${Date.now()}`, avatar: (payload.name || '?')[0].toUpperCase(), ...payload }
    ADMIN_STAFF.push(rec)
    return rec
  })
}

export function removeAdminStaff(id) {
  return local(() => {
    const idx = ADMIN_STAFF.findIndex((a) => a.id === id)
    if (idx >= 0) ADMIN_STAFF.splice(idx, 1)
    return { id }
  })
}

// ── Memorials — public feed + admin moderation queue ─────────────────────────
export async function getMemorials() {
  if (USE_REMOTE) {
    const { data, error } = await supabase.from('memorials').select('*').order('created_at', { ascending: false })
    if (error) throw error
    return data
  }
  return local(() => MEMORIALS)
}

export async function createMemorial(payload) {
  if (USE_REMOTE) {
    // Admin-added memorials skip moderation — the admin adding it IS the moderator.
    const { data, error } = await supabase.from('memorials').insert({ ...payload, status: 'approved' }).select().single()
    if (error) throw error
    return data
  }
  return local(() => ({ id: `mem-${Date.now()}`, ...payload }))
}

function queueRowFromMemorial(row) {
  return {
    id: row.id,
    name: row.name,
    submittedBy: row.submitted_by || '—',
    blockId: row.block_id,
    lotNo: row.lot_no,
    birth: row.birth_date,
    death: row.death_date,
    submitted: row.created_at,
    status: row.status,
  }
}

export function getMemorialQueue() {
  if (USE_REMOTE) {
    return (async () => {
      const { data, error } = await supabase.from('memorials').select('*').order('created_at', { ascending: false })
      if (error) throw error
      return data.map(queueRowFromMemorial)
    })()
  }
  return local(() => MEMORIAL_QUEUE)
}

export function updateMemorialQueueStatus(id, status) {
  if (USE_REMOTE) {
    return (async () => {
      const { data, error } = await supabase.from('memorials').update({ status }).eq('id', id).select().single()
      if (error) throw error
      return queueRowFromMemorial(data)
    })()
  }
  return local(() => {
    const m = getMemorialQueueById(id)
    if (m) m.status = status
    return m
  })
}

// ── Notifications ─────────────────────────────────────────────────────────────
export function getNotifications() {
  // NOTE: not yet wired to Supabase.
  return local(() => ({ sent: SENT_NOTIFICATIONS, stats: NOTIFICATION_STATS, alerts: SYSTEM_ALERTS }))
}

export function sendNotification(payload) {
  return local(() => {
    const rec = { id: `notif-${Date.now()}`, unread: true, sentAt: new Date().toISOString(), ...payload }
    SENT_NOTIFICATIONS.unshift(rec)
    return rec
  })
}

// ── Reservations (admin view) ────────────────────────────────────────────────
// Frontend-only for now (see BACKEND_INTEGRATION.md). Reads/writes the same
// mock store the User-Dashboard's api/reservationApi.js uses conceptually —
// in production both dashboards would hit the same `reservations` table, so
// updateReservationStatus() here and cancelReservation() there are really the
// same backend operation viewed from two roles (admin vs the reservation's
// own user).
export function getReservations() {
  if (USE_REMOTE) {
    // TODO(backend): SELECT * FROM reservations ORDER BY created_at DESC
    throw new Error('Remote reservations API not implemented yet.')
  }
  return local(() => MOCK_RESERVATIONS)
}

export function getReservationById(id) {
  if (USE_REMOTE) throw new Error('Remote reservations API not implemented yet.')
  return local(() => getReservationByIdSync(id))
}

// status: one of RESERVATION_STATUS (config/adminStatus.js) — 'confirmed',
// 'rejected', or 'cancelled' from this page's action buttons.
export function updateReservationStatus(id, status) {
  if (USE_REMOTE) {
    // TODO(backend): UPDATE reservations SET status = $status WHERE id = $id
    // (and, for 'confirmed'/'rejected'/'cancelled', mirror the change onto the
    // lot's own status — see getLot()/updateLotStatus() above).
    throw new Error('Remote reservations API not implemented yet.')
  }
  return local(() => {
    const r = getReservationByIdSync(id)
    if (!r) return null
    r.status = status
    r.updatedAt = new Date().toISOString()
    return r
  })
}

// Re-export the shared lot-status enum so pages never need to import both
// api/ and config/status.js just to compare a value.
export { STATUS }
