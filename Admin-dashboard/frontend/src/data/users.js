// ─────────────────────────────────────────────────────────────────────────────
// SITE USERS SEED — public GraveLocator app accounts (the User-Dashboard's
// customers), as seen from the admin side. `plots` references the same
// { blockId, lotNo } pairs the map/lot grid use, never a free-text plot code.
// Served via api/getUsers(). Distinct from data/adminStaff.js (dashboard staff).
// ─────────────────────────────────────────────────────────────────────────────
import { USER_STATUS } from '../config/adminStatus'

export const USERS = [
  {
    id: 'usr-1', name: 'Maria Santos', email: 'm.santos@email.com', phone: '+63 912 345 6789',
    plots: [{ blockId: 'block-3', lotNo: 204 }],
    joined: '2026-01-10', status: USER_STATUS.ACTIVE,
  },
  {
    id: 'usr-2', name: 'Jose Reyes', email: 'j.reyes@email.com', phone: '+63 917 234 5678',
    plots: [{ blockId: 'block-4', lotNo: 112 }],
    joined: '2026-01-15', status: USER_STATUS.ACTIVE,
  },
  {
    id: 'usr-3', name: 'Luz Bautista', email: 'l.bautista@email.com', phone: '+63 921 345 6780',
    plots: [{ blockId: 'block-5', lotNo: 318 }, { blockId: 'block-6', lotNo: 47 }],
    joined: '2026-02-02', status: USER_STATUS.ACTIVE,
  },
  {
    id: 'usr-4', name: 'Pedro Lim', email: 'p.lim@email.com', phone: '+63 919 456 7891',
    plots: [{ blockId: 'block-7', lotNo: 405 }],
    joined: '2026-02-14', status: USER_STATUS.INACTIVE,
  },
]

export const getUserById = (id) => USERS.find((u) => u.id === id) || null
