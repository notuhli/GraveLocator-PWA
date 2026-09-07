// ─────────────────────────────────────────────────────────────────────────────
// MOCK RESERVATIONS — in-memory seed + store standing in for a real backend
// table. Read/written only through the reservation functions in api/index.js
// (never import this module directly from a page). Kept structurally
// identical to the User-Dashboard's data/mockReservations.js (same shape,
// same seed record) — in production both dashboards would read the same
// `reservations` table, so this file exists twice only because the two
// dashboards are separate frontend apps with no shared package today.
// ─────────────────────────────────────────────────────────────────────────────
import { RESERVATION_STATUS } from '../config/adminStatus'

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
  {
    id: 'res-1002',
    userId: 'usr-sample-2',
    applicantName: 'Jose Ramirez',
    email: 'j.ramirez@email.com',
    contactNumber: '+63 917 555 2210',
    blockId: 'block-3',
    blockName: 'Block 3',
    lawnName: 'Timeless Memory Lawn',
    lotId: 'block-3-12',
    lotNo: 12,
    classification: 'Premium',
    price: 52000,
    reservationDate: '2026-08-30',
    paymentOption: 'cash',
    notes: '',
    status: RESERVATION_STATUS.CONFIRMED,
    createdAt: '2026-08-10T14:02:00.000Z',
    updatedAt: '2026-08-12T08:40:00.000Z',
  },
  {
    id: 'res-1003',
    userId: 'usr-sample-3',
    applicantName: 'Elena Cruz',
    email: 'e.cruz@email.com',
    contactNumber: '+63 918 222 4471',
    blockId: 'block-3',
    blockName: 'Block 3',
    lawnName: 'Timeless Memory Lawn',
    lotId: 'block-3-78',
    lotNo: 78,
    classification: 'Deluxe',
    price: 48000,
    reservationDate: '2026-09-02',
    paymentOption: 'installment',
    notes: 'Requested a 2-year installment plan.',
    status: RESERVATION_STATUS.REJECTED,
    createdAt: '2026-08-05T11:20:00.000Z',
    updatedAt: '2026-08-06T09:15:00.000Z',
  },
]

let _seq = MOCK_RESERVATIONS.length + 1
export function nextReservationId() {
  return `res-${1000 + _seq++}`
}

export function getReservationByIdSync(id) {
  return MOCK_RESERVATIONS.find((r) => r.id === id) || null
}
