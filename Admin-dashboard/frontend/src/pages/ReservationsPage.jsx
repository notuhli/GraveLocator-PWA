import { useState } from 'react'
import { useReservations } from '../hooks'
import { useAdmin } from '../context/AdminContext'
import { RESERVATION_STATUS, RESERVATION_STATUS_META } from '../config/adminStatus'
import { formatDate } from '../utils/date'
import { peso } from '../utils/format'
import * as api from '../api'

const STATUS_FILTERS = ['all', ...Object.values(RESERVATION_STATUS)]

export default function ReservationsPage() {
  const { reservations, loading, reload } = useReservations()
  const { openModal } = useAdmin()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')

  const filtered = reservations.filter((r) => {
    const matchesStatus = status === 'all' || r.status === status
    const q = search.trim().toLowerCase()
    const matchesSearch = !q || `${r.applicantName} ${r.email} ${r.blockName} ${r.lotNo}`.toLowerCase().includes(q)
    return matchesStatus && matchesSearch
  })

  // Frontend-only status changes — see BACKEND_INTEGRATION.md. Once a real
  // backend exists these call the same updateReservationStatus(id, status)
  // API function, just against a real table instead of the mock store.
  const setReservationStatus = async (id, next) => { await api.updateReservationStatus(id, next); reload() }

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Reservation Management</h2>
          <p>Review lot reservations submitted through the public site. Frontend demo — not yet wired to a real database.</p>
        </div>
      </div>

      <div className="filter-bar">
        <input className="filter-input" placeholder="Search by applicant, email, or lot…" value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: 260 }} />
        <select className="filter-select" value={status} onChange={(e) => setStatus(e.target.value)}>
          {STATUS_FILTERS.map((s) => (
            <option key={s} value={s}>{s === 'all' ? 'All Statuses' : RESERVATION_STATUS_META[s].label}</option>
          ))}
        </select>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Reservation ID</th><th>Applicant</th><th>Email</th><th>Contact</th>
                <th>Block</th><th>Lawn</th><th>Lot</th><th>Classification</th>
                <th>Price</th><th>Reservation Date</th><th>Submitted</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {!loading && filtered.map((r) => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 700, color: 'var(--sage)' }}>{r.id}</td>
                  <td style={{ fontWeight: 600 }}>{r.applicantName}</td>
                  <td>{r.email}</td>
                  <td>{r.contactNumber}</td>
                  <td>{r.blockName}</td>
                  <td>{r.lawnName || '—'}</td>
                  <td>{r.lotNo}</td>
                  <td>{r.classification}</td>
                  <td>{peso(r.price)}</td>
                  <td>{r.reservationDate}</td>
                  <td>{formatDate(r.createdAt?.slice(0, 10))}</td>
                  <td><span className={`badge ${RESERVATION_STATUS_META[r.status].badge}`}>{RESERVATION_STATUS_META[r.status].label}</span></td>
                  <td><div className="action-cell">
                    <button className="btn btn-ghost btn-xs" onClick={() => openModal('modal-reservation-detail', r)}>Details</button>
                    {r.status === RESERVATION_STATUS.PENDING && (
                      <>
                        <button className="btn btn-primary btn-xs" onClick={() => setReservationStatus(r.id, RESERVATION_STATUS.CONFIRMED)}>Confirm</button>
                        <button className="btn btn-danger btn-xs" onClick={() => setReservationStatus(r.id, RESERVATION_STATUS.REJECTED)}>Reject</button>
                      </>
                    )}
                    {r.status === RESERVATION_STATUS.CONFIRMED && (
                      <button className="btn btn-danger btn-xs" onClick={() => setReservationStatus(r.id, RESERVATION_STATUS.CANCELLED)}>Cancel</button>
                    )}
                  </div></td>
                </tr>
              ))}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={13} style={{ textAlign: 'center', color: 'var(--dgray)', padding: 24 }}>No reservations match this search/filter.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
