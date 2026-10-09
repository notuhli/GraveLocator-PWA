// ─────────────────────────────────────────────────────────────────────────────
// MOCK RESERVATIONS — in-memory seed + store standing in for a real backend
// table. Read/written only through src/api/reservationApi.js (never import
// this module directly from a screen). Shape mirrors the reservation object
// documented in BACKEND_INTEGRATION.md so swapping this for Supabase later is
// a matter of mapping columns, not redesigning the UI.
// ─────────────────────────────────────────────────────────────────────────────
import { RESERVATION_STATUS } from '../config/reservationStatus'

// One pre-seeded reservation so "My Reservations" isn't empty on first run —
// belongs to the local-stub demo user (AppContext's DEFAULT_USER).
export const MOCK_RESERVATIONS = [
  {
    id: 'res-1001',
    userId: 'local-demo-user',
    applicantName: 'Maria Santos',
    email: 'm.santos@email.com',
    contactNumber: '+63 912 345 6789',
    blockId: 'block-3',
    blockName: 'Block 3',
    lawnName: 'Timeless Memory Lawn',
    lotId: 'block-3-45',
    lotNo: 45,
    classification: 'Premium',
    price: 52000,
    reservationDate: '2026-09-15',
    paymentOption: 'installment',
    notes: 'Prefers a lot near the main pathway.',
    status: RESERVATION_STATUS.PENDING,
    createdAt: '2026-08-20T09:12:00.000Z',
    updatedAt: '2026-08-20T09:12:00.000Z',
  },
]

let _seq = MOCK_RESERVATIONS.length + 1
export function nextReservationId() {
  return `res-${1000 + _seq++}`
}
