// ─────────────────────────────────────────────────────────────────────────────
// MEMORIAL MODERATION QUEUE — admin's view of memorial submissions (including
// ones not yet public). Once approved, a submission is meant to surface in the
// shared data/memorials.js feed the public site reads — this table tracks the
// moderation workflow around that, keyed to real blockId/lotNo.
// ─────────────────────────────────────────────────────────────────────────────
import { MEMORIAL_STATUS } from '../config/adminStatus'

export const MEMORIAL_QUEUE = [
  {
    id: 'modq-1', name: 'Pedro Santos', submittedBy: 'Maria Santos',
    blockId: 'block-3', lotNo: 204, birth: '1935-03-15', death: '2020-08-10',
    submitted: '2026-01-15', status: MEMORIAL_STATUS.APPROVED,
  },
  {
    id: 'modq-2', name: 'Rosa Reyes', submittedBy: 'Jose Reyes',
    blockId: 'block-4', lotNo: 112, birth: '1942-07-20', death: '2022-12-05',
    submitted: '2026-02-01', status: MEMORIAL_STATUS.APPROVED,
  },
  {
    id: 'modq-3', name: 'Carlos Bautista', submittedBy: 'Luz Bautista',
    blockId: 'block-5', lotNo: 318, birth: '1960-01-05', death: '2024-11-20',
    submitted: '2026-03-01', status: MEMORIAL_STATUS.PENDING,
  },
  {
    id: 'modq-4', name: 'Elena Lim', submittedBy: 'Pedro Lim',
    blockId: 'block-7', lotNo: 405, birth: '1948-09-12', death: '2023-02-14',
    submitted: '2026-03-03', status: MEMORIAL_STATUS.FEATURED,
  },
  {
    id: 'modq-5', name: 'Juan Cruz', submittedBy: 'Ana Cruz',
    blockId: 'block-5', lotNo: 312, birth: '1952-04-30', death: '2025-01-08',
    submitted: '2026-03-04', status: MEMORIAL_STATUS.PENDING,
  },
]

export const getMemorialQueueById = (id) => MEMORIAL_QUEUE.find((m) => m.id === id) || null
