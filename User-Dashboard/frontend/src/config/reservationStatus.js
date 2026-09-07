// ─────────────────────────────────────────────────────────────────────────────
// RESERVATION STATUS TAXONOMY — business-process state for a reservation
// record. Distinct from config/status.js, which describes a lot's physical
// state on the map (available/sold/reserve_lot/etc). A reservation's status
// changes independently of (but eventually drives) the underlying lot status.
// ─────────────────────────────────────────────────────────────────────────────

export const RESERVATION_STATUS = {
  PENDING:   'pending',
  CONFIRMED: 'confirmed',
  REJECTED:  'rejected',
  CANCELLED: 'cancelled',
  COMPLETED: 'completed',
}

export const RESERVATION_STATUS_META = {
  [RESERVATION_STATUS.PENDING]:   { label: 'Pending',   badge: 'badge-pending' },
  [RESERVATION_STATUS.CONFIRMED]: { label: 'Confirmed', badge: 'badge-confirmed' },
  [RESERVATION_STATUS.REJECTED]:  { label: 'Rejected',  badge: 'badge-rejected' },
  [RESERVATION_STATUS.CANCELLED]: { label: 'Cancelled', badge: 'badge-cancelled' },
  [RESERVATION_STATUS.COMPLETED]: { label: 'Completed', badge: 'badge-completed' },
}

export const reservationStatusLabel = (s) => (RESERVATION_STATUS_META[s] || RESERVATION_STATUS_META[RESERVATION_STATUS.PENDING]).label
export const reservationStatusBadge = (s) => (RESERVATION_STATUS_META[s] || RESERVATION_STATUS_META[RESERVATION_STATUS.PENDING]).badge

// Payment options offered on the reservation form (frontend-only; the real
// billing/installment plan is set up by the office once the backend exists).
export const PAYMENT_OPTIONS = [
  { id: 'cash',        label: 'Cash' },
  { id: 'installment',  label: 'Installment' },
]
