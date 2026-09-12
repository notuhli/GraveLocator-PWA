// ─────────────────────────────────────────────────────────────────────────────
// RESERVATION API — frontend-only mock service for the reservation feature.
// Same shape as the rest of api/index.js: every function resolves from local
// seed data via `local()`, gated behind USE_REMOTE exactly like getBlocks(),
// getMemorials(), etc. When a real reservations table/endpoint exists, replace
// the body of each function below with the Supabase/API call — screens and
// hooks never need to change, since they only ever import from api/index.js.
//
// NOT wired to Supabase yet: this is intentionally frontend-only for now (see
// BACKEND_INTEGRATION.md). Do not read MOCK_RESERVATIONS directly from a
// screen — always go through these functions or the useMyReservations /
// useReservation hooks.
// ─────────────────────────────────────────────────────────────────────────────
import { local, USE_REMOTE } from './client'
import { supabase } from './supabaseClient'
import { MOCK_RESERVATIONS, nextReservationId } from '../data/mockReservations'
import { RESERVATION_STATUS } from '../config/reservationStatus'
import { getLotsForBlock } from '../data/lots'
import { getBlockById } from '../data/blocks'
import { STATUS, isSellable } from '../config/status'

// Row shape from Supabase (snake_case) → the shape screens already expect
// (camelCase, per BACKEND_INTEGRATION.md's data model).
function reservationFromRow(row) {
  return {
    id: row.id, userId: row.user_id, applicantName: row.applicant_name,
    email: row.email, contactNumber: row.contact_number,
    blockId: row.block_id, blockName: row.block_name, lawnName: row.lawn_name,
    lotId: row.lot_id, lotNo: row.lot_no, classification: row.classification,
    price: row.price, reservationDate: row.reservation_date,
    paymentOption: row.payment_option, notes: row.notes, status: row.status,
    createdAt: row.created_at, updatedAt: row.updated_at,
  }
}

// payload: { userId, applicantName, email, contactNumber, blockId, lotNo,
//            classification, price, reservationDate, paymentOption, notes }
export async function createReservation(payload) {
  if (USE_REMOTE) {
    // Atomic on the database side: inserts the reservation AND flips the lot
    // to 'reserve_lot' in one transaction, re-checking availability with a
    // row lock so two people can't reserve the same lot at once.
    const { data, error } = await supabase.rpc('create_reservation', {
      p_applicant_name: payload.applicantName,
      p_email: payload.email,
      p_contact_number: payload.contactNumber,
      p_block_id: payload.blockId,
      p_lot_no: Number(payload.lotNo),
      p_classification: payload.classification || null,
      p_price: payload.price ?? null,
      p_reservation_date: payload.reservationDate,
      p_payment_option: payload.paymentOption,
      p_notes: payload.notes || '',
    })
    if (error) throw error
    return reservationFromRow(data)
  }

  return local(() => {
    const block = getBlockById(payload.blockId)
    const lots = getLotsForBlock(payload.blockId)
    const lot = lots.find((l) => l.lotNo === Number(payload.lotNo))

    // Frontend-only duplicate-reservation guard (see BACKEND_INTEGRATION.md —
    // the backend must re-check this server-side; this does not prevent a
    // real race between two users).
    if (!lot || !isSellable(lot.status)) {
      throw new Error('This lot is no longer available for reservation.')
    }

    const record = {
      id: nextReservationId(),
      userId: payload.userId || 'local-demo-user',
      applicantName: payload.applicantName,
      email: payload.email,
      contactNumber: payload.contactNumber,
      blockId: payload.blockId,
      blockName: block?.name || payload.blockId,
      lawnName: block?.lawnName || null,
      lotId: lot.id,
      lotNo: lot.lotNo,
      classification: payload.classification || lot.classification,
      price: payload.price ?? null,
      reservationDate: payload.reservationDate,
      paymentOption: payload.paymentOption,
      notes: payload.notes || '',
      status: RESERVATION_STATUS.PENDING,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    MOCK_RESERVATIONS.unshift(record)
    // Reflect the reservation on the map immediately (mock/local only — see
    // "Prevent Frontend Duplicate Reservation Attempts" in the brief). A real
    // backend would do this server-side, atomically, alongside the insert.
    lot.status = STATUS.RESERVE_LOT
    return record
  })
}

export async function getMyReservations(userId = 'local-demo-user') {
  if (USE_REMOTE) {
    const { data, error } = await supabase
      .from('reservations').select('*').eq('user_id', userId).order('created_at', { ascending: false })
    if (error) throw error
    return data.map(reservationFromRow)
  }
  return local(() => MOCK_RESERVATIONS.filter((r) => r.userId === userId))
}

export async function getReservationById(id) {
  if (USE_REMOTE) {
    const { data, error } = await supabase.from('reservations').select('*').eq('id', id).maybeSingle()
    if (error) throw error
    return data ? reservationFromRow(data) : null
  }
  return local(() => MOCK_RESERVATIONS.find((r) => r.id === id) || null)
}

// User-initiated cancellation (distinct from admin's updateReservationStatus —
// kept as its own function since a real backend will likely apply different
// authorization rules to "user cancels their own" vs "admin changes status").
export async function cancelReservation(id) {
  if (USE_REMOTE) {
    // Atomic: cancels the reservation AND frees the lot back to 'available'
    // in one transaction. Authorized by ownership (checked inside the RPC),
    // not by admin role — see set_reservation_status for the admin path.
    const { data, error } = await supabase.rpc('cancel_my_reservation', { p_reservation_id: id })
    if (error) throw error
    return reservationFromRow(data)
  }
  return local(() => {
    const r = MOCK_RESERVATIONS.find((x) => x.id === id)
    if (!r) return null
    r.status = RESERVATION_STATUS.CANCELLED
    r.updatedAt = new Date().toISOString()
    // Free the lot back up locally so it can be reserved again in this demo.
    const lots = getLotsForBlock(r.blockId)
    const lot = lots.find((l) => l.lotNo === r.lotNo)
    if (lot && lot.status === STATUS.RESERVE_LOT) lot.status = STATUS.AVAILABLE
    return r
  })
}
