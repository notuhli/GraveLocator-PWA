// ─────────────────────────────────────────────────────────────────────────────
// RESERVATION SCREENS — Reserve Lot → Form → Summary → Confirm → Success →
// My Reservations → Reservation Detail. Frontend-only: everything here talks
// to api/reservationApi.js (mock/local data), never to Supabase directly. See
// BACKEND_INTEGRATION.md for what a backend developer needs to change.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect } from 'react'
import BottomNav from '../components/BottomNav'
import { useApp } from '../context/AppContext'
import { useMyReservations, useReservation, usePricing } from '../hooks'
import { ENV } from '../config/constants'
import { PAYMENT_OPTIONS, reservationStatusLabel, reservationStatusBadge, RESERVATION_STATUS } from '../config/reservationStatus'
import { peso } from '../utils/format'
import * as api from '../api'

const BackHeader = ({ title, sub, onBack }) => (
  <div className="hdr hdr-row" style={{ flexShrink: 0 }}>
    <button className="back-btn" onClick={onBack} aria-label="Back">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
    </button>
    <div>
      <h2 style={{ margin: 0 }}>{title}</h2>
      {sub && <p className="f12" style={{ margin: 0, color: 'rgba(255,255,255,.75)' }}>{sub}</p>}
    </div>
  </div>
)

// ── ReserveFormScreen ────────────────────────────────────────────────────────
// Reached from PlotDetailScreen with context.activeLot already set. Lot info
// (block/lawn/lot no./classification/price) is auto-filled and read-only —
// the applicant only fills in what the lot itself can't supply.
export function ReserveFormScreen({ onNavigate, onBack }) {
  const { activeLot, user, setReservationDraft } = useApp()
  const { pricing } = usePricing()

  const lot = activeLot || { blockId: 'block-3', blockName: 'Block 3', lawnName: 'Timeless Memory Lawn', lotNo: 45, classification: 'Premium' }
  const price = pricing?.installment?.[lot.classification]?.totalPrice ?? null

  const [applicantName, setApplicantName] = useState(user?.name || '')
  const [email, setEmail] = useState(user?.email || '')
  const [contactNumber, setContactNumber] = useState(user?.phone || '')
  const [reservationDate, setReservationDate] = useState('')
  const [paymentOption, setPaymentOption] = useState(PAYMENT_OPTIONS[0].id)
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')

  const canContinue = applicantName.trim() && email.trim() && contactNumber.trim() && reservationDate

  function handleContinue() {
    if (!canContinue) { setError('Please fill in your name, email, contact number, and preferred date.'); return }
    setReservationDraft({
      applicantName, email, contactNumber,
      blockId: lot.blockId, blockName: lot.blockName, lawnName: lot.lawnName,
      lotNo: lot.lotNo, classification: lot.classification, price,
      reservationDate, paymentOption, notes,
    })
    onNavigate('reserve-summary')
  }

  return (
    <div className="screen active" style={{ background: 'var(--cream)' }}>
      <BackHeader title="Reservation Form" sub={`${lot.blockName} · Lot ${lot.lotNo}`} onBack={() => onBack('plotdetail', { activeLot: lot })} />
      <div className="form-wrap">
        <p className="section-label" style={{ marginBottom: 10 }}>Cemetery Lot</p>
        <div className="card" style={{ marginBottom: 18 }}>
          <div className="info-grid">
            {[
              ['Block', lot.blockName],
              ['Lawn', lot.lawnName || '—'],
              ['Lot No.', lot.lotNo],
              ['Classification', lot.classification],
              ['Price', price != null ? peso(price) : '—'],
            ].map(([l, v]) => (
              <div key={l} className="info-cell"><div className="info-lbl">{l}</div><div className="info-val">{v}</div></div>
            ))}
          </div>
        </div>

        <p className="section-label" style={{ marginBottom: 10 }}>Applicant Information</p>
        <div className="field"><label className="lbl">Full Name</label><input className="inp" value={applicantName} onChange={(e) => setApplicantName(e.target.value)} placeholder="Full name" /></div>
        <div className="field"><label className="lbl">Email</label><input className="inp" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" /></div>
        <div className="field"><label className="lbl">Contact Number</label><input className="inp" value={contactNumber} onChange={(e) => setContactNumber(e.target.value)} placeholder="+63 9XX XXX XXXX" /></div>

        <p className="section-label" style={{ marginBottom: 10 }}>Reservation Details</p>
        <div className="field"><label className="lbl">Preferred Reservation Date</label><input className="inp" type="date" value={reservationDate} onChange={(e) => setReservationDate(e.target.value)} /></div>
        <div className="field">
          <label className="lbl">Payment Option</label>
          <div className="pay-opts">
            {PAYMENT_OPTIONS.map((p) => (
              <div key={p.id} className={`pay-opt${paymentOption === p.id ? ' active' : ''}`} onClick={() => setPaymentOption(p.id)}>{p.label}</div>
            ))}
          </div>
        </div>
        <div className="field mb-20">
          <label className="lbl">Additional Notes (optional)</label>
          <textarea className="inp" rows="3" placeholder="Anything the office should know…" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        {error && <p style={{ color: '#DC2626', fontSize: 13, margin: '0 0 12px' }}>{error}</p>}
        <button className="btn btn-primary btn-full" onClick={handleContinue}>Review Reservation</button>
      </div>
    </div>
  )
}

// ── ReserveSummaryScreen ─────────────────────────────────────────────────────
export function ReserveSummaryScreen({ onNavigate, onBack }) {
  const { reservationDraft, user, setActiveReservationId } = useApp()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const d = reservationDraft
  useEffect(() => {
    if (!d) onNavigate('map', {}, { replace: true })
  }, [d, onNavigate])

  if (!d) return null

  async function handleConfirm() {
    if (submitting) return // prevent double-click submissions
    setSubmitting(true)
    setError('')
    try {
      const record = await api.createReservation({
        userId: user?.id || 'local-demo-user',
        applicantName: d.applicantName, email: d.email, contactNumber: d.contactNumber,
        blockId: d.blockId, lotNo: d.lotNo, classification: d.classification, price: d.price,
        reservationDate: d.reservationDate, paymentOption: d.paymentOption, notes: d.notes,
      })
      setActiveReservationId(record.id)
      onNavigate('reserve-success')
    } catch (err) {
      setError(err.message || 'Could not submit this reservation. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="screen active" style={{ background: 'var(--cream)' }}>
      <BackHeader title="Reservation Summary" onBack={() => onBack('reserve-form')} />
      <div className="form-wrap">
        <div className="card" style={{ marginBottom: 14 }}>
          <p className="section-label" style={{ margin: '0 0 10px' }}>Applicant</p>
          {[['Name', d.applicantName], ['Email', d.email], ['Contact Number', d.contactNumber]].map(([l, v]) => (
            <div key={l} className="fee-row"><span className="fee-lbl">{l}</span><span className="fee-val">{v}</span></div>
          ))}
        </div>
        <div className="card" style={{ marginBottom: 14 }}>
          <p className="section-label" style={{ margin: '0 0 10px' }}>Cemetery Lot</p>
          {[['Block', d.blockName], ['Lawn', d.lawnName || '—'], ['Lot Number', d.lotNo], ['Classification', d.classification]].map(([l, v]) => (
            <div key={l} className="fee-row"><span className="fee-lbl">{l}</span><span className="fee-val">{v}</span></div>
          ))}
        </div>
        <div className="card" style={{ marginBottom: 14 }}>
          <p className="section-label" style={{ margin: '0 0 10px' }}>Reservation</p>
          {[
            ['Reservation Date', d.reservationDate],
            ['Price', d.price != null ? peso(d.price) : '—'],
            ['Payment Option', PAYMENT_OPTIONS.find((p) => p.id === d.paymentOption)?.label || d.paymentOption],
            ['Notes', d.notes || '—'],
          ].map(([l, v]) => (
            <div key={l} className="fee-row"><span className="fee-lbl">{l}</span><span className="fee-val">{v}</span></div>
          ))}
        </div>

        {!ENV.USE_REMOTE && (
          <div className="warn-box" style={{ marginBottom: 16 }}>
            <p className="warn-txt">This is a frontend demo only — confirming below does not submit to a real database yet. The park office will contact you to finalize a real reservation.</p>
          </div>
        )}

        {error && <p style={{ color: '#DC2626', fontSize: 13, margin: '0 0 12px' }}>{error}</p>}
        <div className="plot-actions">
          <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={() => onBack('reserve-form')} disabled={submitting}>Back</button>
          <button className="btn btn-primary btn-sm" style={{ flex: 2 }} onClick={handleConfirm} disabled={submitting}>
            {submitting ? 'Submitting…' : 'Confirm Reservation'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── ReserveSuccessScreen ─────────────────────────────────────────────────────
export function ReserveSuccessScreen({ onNavigate }) {
  const { activeReservationId } = useApp()
  return (
    <div className="screen active" style={{ background: 'var(--cream)' }}>
      <div className="success-wrap">
        <div className="success-icon" style={{ background: 'var(--pgreen)' }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#4A7C3F" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <h2 style={{ fontFamily: 'var(--ff-d)', textAlign: 'center', margin: '0 0 8px' }}>Reservation Submitted</h2>
        <p className="f13 c-stone" style={{ textAlign: 'center', maxWidth: 280, margin: '0 0 20px' }}>
          Your reservation is now pending review.{!ENV.USE_REMOTE && ' This is a frontend demo — no data has been sent to a real database yet.'}
        </p>
        {activeReservationId && (
          <div className="ref-box">
            <p className="f11 c-stone" style={{ margin: '0 0 2px', textAlign: 'center' }}>Reference No.</p>
            <p className="ref-num" style={{ textAlign: 'center' }}>{activeReservationId}</p>
          </div>
        )}
        <button className="btn btn-primary btn-full" style={{ marginBottom: 10 }} onClick={() => onNavigate('my-reservations')}>View My Reservations</button>
        <button className="btn btn-secondary btn-full" onClick={() => onNavigate('home')}>Back to Home</button>
      </div>
    </div>
  )
}

// ── MyReservationsScreen ─────────────────────────────────────────────────────
export function MyReservationsScreen({ onNavigate }) {
  const { user, setActiveReservationId } = useApp()
  const { reservations, loading } = useMyReservations(user?.id)

  const open = (r) => { setActiveReservationId(r.id); onNavigate('reservation-detail', { reservationId: r.id }) }

  return (
    <div className="screen active" style={{ background: 'var(--cream)' }}>
      <div className="hdr"><h2>My Reservations</h2></div>
      <div className="scroll-body">
        {loading && <p className="f13 c-stone" style={{ textAlign: 'center', padding: 20 }}>Loading reservations…</p>}
        {!loading && reservations.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 20px' }}>
            <p style={{ fontSize: 32, marginBottom: 12 }}>🪦</p>
            <p className="f14 c-stone" style={{ marginBottom: 18 }}>You don't have any reservations yet.</p>
            <button className="btn btn-primary btn-sm" onClick={() => onNavigate('map')}>Find an Available Lot</button>
          </div>
        )}
        {reservations.map((r) => (
          <div key={r.id} className="card" style={{ marginBottom: 12, cursor: 'pointer' }} onClick={() => open(r)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
              <div>
                <p className="fw7 f15 c-charcoal" style={{ margin: '0 0 2px' }}>{r.blockName} · Lot {r.lotNo}</p>
                <p className="f12 c-stone" style={{ margin: 0 }}>{r.lawnName} · {r.classification}</p>
              </div>
              <span className={`badge ${reservationStatusBadge(r.status)}`}>{reservationStatusLabel(r.status)}</span>
            </div>
            <div className="fee-row"><span className="fee-lbl">Reservation Date</span><span className="fee-val">{r.reservationDate}</span></div>
            <div className="fee-row"><span className="fee-lbl">Price</span><span className="fee-val">{r.price != null ? peso(r.price) : '—'}</span></div>
          </div>
        ))}
      </div>
      <BottomNav active="profile" onNavigate={onNavigate} />
    </div>
  )
}

// ── ReservationDetailScreen ──────────────────────────────────────────────────
export function ReservationDetailScreen({ onNavigate, onBack }) {
  const { activeReservationId } = useApp()
  const { reservation, loading, reload } = useReservation(activeReservationId)
  const [cancelling, setCancelling] = useState(false)

  async function handleCancel() {
    if (!reservation || cancelling) return
    setCancelling(true)
    try {
      await api.cancelReservation(reservation.id)
      reload()
    } finally {
      setCancelling(false)
    }
  }

  if (loading) return <div className="screen active" style={{ background: 'var(--cream)' }}><p className="f13 c-stone" style={{ textAlign: 'center', padding: 40 }}>Loading…</p></div>
  if (!reservation) return (
    <div className="screen active" style={{ background: 'var(--cream)' }}>
      <BackHeader title="Reservation" onBack={() => onBack('my-reservations')} />
      <p className="f13 c-stone" style={{ textAlign: 'center', padding: 40 }}>Reservation not found.</p>
    </div>
  )

  const r = reservation
  return (
    <div className="screen active" style={{ background: 'var(--cream)' }}>
      <BackHeader title={`${r.blockName} · Lot ${r.lotNo}`} sub={r.lawnName} onBack={() => onBack('my-reservations')} />
      <div className="scroll-body">
        <div style={{ marginBottom: 14 }}>
          <span className={`badge ${reservationStatusBadge(r.status)}`}>{reservationStatusLabel(r.status)}</span>
        </div>
        <div className="card" style={{ marginBottom: 14 }}>
          <p className="section-label" style={{ margin: '0 0 10px' }}>Applicant</p>
          {[['Name', r.applicantName], ['Email', r.email], ['Contact Number', r.contactNumber]].map(([l, v]) => (
            <div key={l} className="fee-row"><span className="fee-lbl">{l}</span><span className="fee-val">{v}</span></div>
          ))}
        </div>
        <div className="card" style={{ marginBottom: 14 }}>
          <p className="section-label" style={{ margin: '0 0 10px' }}>Cemetery Lot</p>
          {[['Block', r.blockName], ['Lawn', r.lawnName || '—'], ['Lot Number', r.lotNo], ['Classification', r.classification]].map(([l, v]) => (
            <div key={l} className="fee-row"><span className="fee-lbl">{l}</span><span className="fee-val">{v}</span></div>
          ))}
        </div>
        <div className="card" style={{ marginBottom: 14 }}>
          <p className="section-label" style={{ margin: '0 0 10px' }}>Reservation</p>
          {[
            ['Reservation Date', r.reservationDate],
            ['Price', r.price != null ? peso(r.price) : '—'],
            ['Payment Option', PAYMENT_OPTIONS.find((p) => p.id === r.paymentOption)?.label || r.paymentOption],
            ['Submitted', new Date(r.createdAt).toLocaleDateString()],
            ['Notes', r.notes || '—'],
          ].map(([l, v]) => (
            <div key={l} className="fee-row"><span className="fee-lbl">{l}</span><span className="fee-val">{v}</span></div>
          ))}
        </div>

        {r.status === RESERVATION_STATUS.PENDING && (
          <button className="btn btn-danger btn-full" onClick={handleCancel} disabled={cancelling}>
            {cancelling ? 'Cancelling…' : 'Cancel Reservation'}
          </button>
        )}
      </div>
    </div>
  )
}
