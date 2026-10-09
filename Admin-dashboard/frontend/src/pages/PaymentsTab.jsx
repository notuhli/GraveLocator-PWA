// ─────────────────────────────────────────────────────────────────────────────
// PAYMENTS (admin) — shown as tabs on the Reservations page.
//   PaymentReviewTab  : GCash receipts to verify/reject, cash to mark received,
//                       monthly installment payments to verify or record.
//   GcashSettingsTab  : the merchant GCash name / number / instructions / QR
//                       that users see when they pay (table payment_settings).
// A verified / received payment is what Reports & Analytics counts as paid.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect } from 'react'
import { usePaymentOverview, usePaymentSettings } from '../hooks'
import { useAdmin } from '../context/AdminContext'
import { RESERVATION_STATUS_META } from '../config/adminStatus'
import {
  PAYMENT_STATUS, paymentStatusMeta, INSTALLMENT_PAYMENT_STATUS_META,
  PAYMENT_OPTION_LABEL, PAYMENT_METHOD_LABEL, INSTALLMENT_TERM_LABEL,
} from '../config/paymentStatus'
import { formatDate } from '../utils/date'
import { peso } from '../utils/format'
import * as paymentsApi from '../api/paymentsApi'
import { USE_REMOTE } from '../api/client'

const today = () => new Date().toISOString().slice(0, 10)
const { CLOSED_RESERVATION, receiptToReview, cashToReceive } = paymentsApi
const CLOSED = CLOSED_RESERVATION

// ── Small shared dialog (uses the same .modal styles as AllModals) ──────────
function Dialog({ title, subtitle, onClose, children }) {
  return (
    <div className="modal-overlay open" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal">
        <h3>{title}</h3>
        {subtitle && <p>{subtitle}</p>}
        {children}
      </div>
    </div>
  )
}

function ReceiptViewer({ path, title, onClose }) {
  const [url, setUrl] = useState(null)
  const [error, setError] = useState('')
  useEffect(() => {
    let alive = true
    paymentsApi.getReceiptUrl(path)
      .then((u) => {
        if (!alive) return
        if (u) setUrl(u)
        else setError('Receipts can only be viewed when connected to Supabase.')
      })
      .catch((e) => { if (alive) setError(e.message || 'Could not load the receipt.') })
    return () => { alive = false }
  }, [path])
  return (
    <Dialog title={title || 'GCash Receipt'} onClose={onClose}>
      {!url && !error && <p style={{ fontSize: 13, color: 'var(--dgray)' }}>Loading receipt…</p>}
      {error && <p style={{ fontSize: 13, color: '#DC2626' }}>{error}</p>}
      {url && (
        <a href={url} target="_blank" rel="noopener noreferrer" title="Open full size">
          <img src={url} alt="GCash receipt" className="pay-receipt-img" />
        </a>
      )}
      <div className="modal-actions">
        {url && <a className="btn btn-outline" href={url} target="_blank" rel="noopener noreferrer">Open full size</a>}
        <button className="btn btn-primary" onClick={onClose}>Close</button>
      </div>
    </Dialog>
  )
}

// ── Payment Review tab ───────────────────────────────────────────────────────
export function PaymentReviewTab() {
  const { paymentReservations, installments, loading, error } = usePaymentOverview()
  const { runAction } = useAdmin()
  const [view, setView] = useState('action') // 'action' | 'all'
  const [instView, setInstView] = useState('pending')
  const [receipt, setReceipt] = useState(null)   // { path, title }
  const [dialog, setDialog] = useState(null)     // { type, target }
  const [form, setForm] = useState({})
  const [busy, setBusy] = useState(false)

  const byId = Object.fromEntries(paymentReservations.map((r) => [r.id, r]))
  const resRows = paymentReservations.filter((r) => view === 'all' || receiptToReview(r) || cashToReceive(r))
  const instRows = installments.filter((p) => instView === 'all' || p.status === instView)
  const installmentReservations = paymentReservations.filter((r) => r.paymentOption === 'installment' && r.status === 'confirmed')

  const open = (type, target, initial = {}) => { setForm(initial); setDialog({ type, target }) }
  const close = () => { if (!busy) { setDialog(null); setForm({}) } }
  const setField = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const run = async (fn, msg) => {
    setBusy(true)
    const ok = await runAction(fn, msg)
    setBusy(false)
    if (ok) { setDialog(null); setForm({}) }
  }

  const verifyReceipt = (r) => runAction(() => paymentsApi.setReservationPaymentStatus(r, 'verified'), `Payment of ${r.applicantName} verified.`)
  const lot = (r) => (r ? `${r.blockName || '—'} · Lot ${r.lotNo ?? '—'}` : '—')

  return (
    <div>
      {!USE_REMOTE && (
        <div className="card pay-note">Demo mode: connect Supabase (VITE_USE_REMOTE=true) to see real receipts and installment payments.</div>
      )}
      {error && <div className="card pay-note pay-note-err">Could not load payments: {error.message}</div>}

      {/* Amount due when reserving */}
      <div className="card" style={{ marginBottom: 18 }}>
        <div className="pay-card-head">
          <div>
            <p className="chart-title" style={{ marginBottom: 2 }}>Reservation Payments</p>
            <p className="pay-sub">Full payment (Cash / GCash) or the installment down payment + MCF paid when reserving.</p>
          </div>
          <select className="filter-select" value={view} onChange={(e) => setView(e.target.value)}>
            <option value="action">Needs action</option>
            <option value="all">All reservations</option>
          </select>
        </div>
        <div className="table-wrap">
          <table className="res-table">
            <thead>
              <tr>
                <th>Submitted</th><th>Applicant</th><th>Lot</th><th>Option</th><th>Paid via</th>
                <th>Amount due now</th><th>Payment</th><th>Reservation</th><th className="col-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={9} className="pay-empty">Loading payments…</td></tr>}
              {!loading && resRows.length === 0 && (
                <tr><td colSpan={9} className="pay-empty">{view === 'action' ? 'Nothing to review. 🎉' : 'No reservations yet.'}</td></tr>
              )}
              {resRows.map((r) => {
                const meta = paymentStatusMeta(r.paymentStatus)
                const resMeta = RESERVATION_STATUS_META[r.status] || RESERVATION_STATUS_META.pending
                const isGcash = r.paymentMethod === 'gcash'
                return (
                  <tr key={r.id}>
                    <td>{formatDate(String(r.createdAt || '').slice(0, 10))}</td>
                    <td style={{ fontWeight: 600 }}>{r.applicantName}<div className="pay-sub">{r.contactNumber || r.email}</div></td>
                    <td>{lot(r)}</td>
                    <td>{PAYMENT_OPTION_LABEL[r.paymentOption] || r.paymentOption}{r.installmentTerm ? ` · ${INSTALLMENT_TERM_LABEL[r.installmentTerm]}` : ''}</td>
                    <td>{PAYMENT_METHOD_LABEL[r.paymentMethod] || r.paymentMethod}</td>
                    <td style={{ fontWeight: 700 }}>{peso(paymentsApi.dueNowAmount(r))}</td>
                    <td>
                      {isGcash
                        ? <span className={`badge ${meta.badge}`}>{meta.label}</span>
                        : r.dueNowReceivedOn
                          ? <span className="badge badge-confirmed">Received {formatDate(r.dueNowReceivedOn)}</span>
                          : <span className="badge badge-pending">Awaiting cash</span>}
                      {r.dueNowNote && <div className="pay-sub" title={r.dueNowNote}>{r.dueNowNote}</div>}
                    </td>
                    <td><span className={`badge ${resMeta.badge}`}>{resMeta.label}</span></td>
                    <td className="col-actions"><div className="action-cell">
                      {isGcash && r.receiptPath && (
                        <button className="btn btn-ghost btn-xs" onClick={() => setReceipt({ path: r.receiptPath, title: `Receipt · ${r.applicantName}` })}>View receipt</button>
                      )}
                      {isGcash && r.paymentStatus !== PAYMENT_STATUS.VERIFIED && !CLOSED.includes(r.status) && (
                        <button className="btn btn-primary btn-xs" onClick={() => verifyReceipt(r)}>Verify</button>
                      )}
                      {isGcash && r.paymentStatus === PAYMENT_STATUS.PENDING_VERIFICATION && (
                        <button className="btn btn-danger btn-xs" onClick={() => open('reject-receipt', r, { note: '' })}>Reject</button>
                      )}
                      {!isGcash && !r.dueNowReceivedOn && !CLOSED.includes(r.status) && (
                        <button className="btn btn-primary btn-xs" onClick={() => open('cash-received', r, { amount: String(paymentsApi.dueNowAmount(r) ?? ''), receivedOn: today(), note: '' })}>Mark received</button>
                      )}
                      {!isGcash && r.dueNowReceivedOn && (
                        <button className="btn btn-outline btn-xs" onClick={() => runAction(() => paymentsApi.clearDueNowReceived(r), 'Payment unmarked.')}>Undo</button>
                      )}
                    </div></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Monthly installment payments */}
      <div className="card">
        <div className="pay-card-head">
          <div>
            <p className="chart-title" style={{ marginBottom: 2 }}>Monthly Installment Payments</p>
            <p className="pay-sub">GCash payments sent by clients wait here for review. Record cash paid at the office with the button.</p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <select className="filter-select" value={instView} onChange={(e) => setInstView(e.target.value)}>
              <option value="pending">To review</option>
              <option value="verified">Verified</option>
              <option value="rejected">Rejected</option>
              <option value="voided">Voided</option>
              <option value="all">All</option>
            </select>
            <button className="btn btn-primary btn-sm" onClick={() => open('record-monthly', null, { reservationId: '', amount: '', method: 'cash', paidOn: today(), note: '' })}>
              + Record payment
            </button>
          </div>
        </div>
        <div className="table-wrap">
          <table className="res-table">
            <thead>
              <tr><th>Paid on</th><th>Client</th><th>Lot</th><th>Type</th><th>Method</th><th>Amount</th><th>Progress</th><th>Status</th><th className="col-actions">Actions</th></tr>
            </thead>
            <tbody>
              {!loading && instRows.length === 0 && <tr><td colSpan={9} className="pay-empty">No payments here.</td></tr>}
              {instRows.map((p) => {
                const r = byId[p.reservationId]
                const meta = INSTALLMENT_PAYMENT_STATUS_META[p.status] || INSTALLMENT_PAYMENT_STATUS_META.pending
                const prog = r ? paymentsApi.installmentProgress(r, installments) : null
                return (
                  <tr key={p.id}>
                    <td>{formatDate(String(p.paidOn).slice(0, 10))}</td>
                    <td style={{ fontWeight: 600 }}>{r?.applicantName || '—'}</td>
                    <td>{lot(r)}</td>
                    <td>{p.kind === 'adjustment' ? 'Adjustment' : 'Monthly'}</td>
                    <td>{PAYMENT_METHOD_LABEL[p.method] || p.method || '—'}</td>
                    <td style={{ fontWeight: 700 }}>{peso(p.amount)}</td>
                    <td>{prog ? `${prog.monthsCovered}/${prog.months} mo · ${peso(prog.left)} left` : '—'}</td>
                    <td><span className={`badge ${meta.badge}`}>{meta.label}</span>{p.note && <div className="pay-sub" title={p.note}>{p.note}</div>}</td>
                    <td className="col-actions"><div className="action-cell">
                      {p.receiptPath && <button className="btn btn-ghost btn-xs" onClick={() => setReceipt({ path: p.receiptPath, title: `Monthly receipt · ${r?.applicantName || ''}` })}>View receipt</button>}
                      {p.status === 'pending' && (
                        <>
                          <button className="btn btn-primary btn-xs" onClick={() => runAction(() => paymentsApi.setInstallmentPaymentStatus(p.id, 'verified'), 'Monthly payment verified.')}>Verify</button>
                          <button className="btn btn-danger btn-xs" onClick={() => open('reject-monthly', p, { note: '' })}>Reject</button>
                        </>
                      )}
                      {p.status === 'verified' && (
                        <button className="btn btn-outline btn-xs" onClick={() => open('void-monthly', p, { note: '' })}>Void</button>
                      )}
                    </div></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {receipt && <ReceiptViewer path={receipt.path} title={receipt.title} onClose={() => setReceipt(null)} />}

      {dialog?.type === 'reject-receipt' && (
        <Dialog title="Reject GCash receipt?" subtitle={`${dialog.target.applicantName} · ${lot(dialog.target)}. The client will see "Receipt rejected".`} onClose={close}>
          <div className="modal-field">
            <label>Reason (shown to staff)</label>
            <textarea value={form.note} onChange={setField('note')} placeholder="e.g. Amount doesn't match, blurry photo…" />
          </div>
          <div className="modal-actions">
            <button className="btn btn-outline" onClick={close} disabled={busy}>Cancel</button>
            <button className="btn btn-danger" disabled={busy}
              onClick={() => run(() => paymentsApi.setReservationPaymentStatus(dialog.target, 'rejected', form.note), 'Receipt rejected.')}>
              {busy ? 'Saving…' : 'Reject receipt'}
            </button>
          </div>
        </Dialog>
      )}

      {dialog?.type === 'cash-received' && (
        <Dialog title="Mark cash payment as received" subtitle={`${dialog.target.applicantName} · ${lot(dialog.target)}`} onClose={close}>
          <div className="modal-field"><label>Amount received (₱)</label><input type="number" min="0" step="0.01" value={form.amount} onChange={setField('amount')} /></div>
          <div className="modal-field"><label>Date received</label><input type="date" value={form.receivedOn} onChange={setField('receivedOn')} /></div>
          <div className="modal-field"><label>Note (optional)</label><input value={form.note} onChange={setField('note')} placeholder="e.g. OR #12345" /></div>
          <div className="modal-actions">
            <button className="btn btn-outline" onClick={close} disabled={busy}>Cancel</button>
            <button className="btn btn-primary" disabled={busy}
              onClick={() => run(() => paymentsApi.markDueNowReceived(dialog.target, { amount: Number(form.amount), receivedOn: form.receivedOn, note: form.note }), 'Payment recorded.')}>
              {busy ? 'Saving…' : 'Save'}
            </button>
          </div>
        </Dialog>
      )}

      {(dialog?.type === 'reject-monthly' || dialog?.type === 'void-monthly') && (
        <Dialog
          title={dialog.type === 'reject-monthly' ? 'Reject monthly payment?' : 'Void this payment?'}
          subtitle={`${peso(dialog.target.amount)} · ${byId[dialog.target.reservationId]?.applicantName || ''}. It will no longer count toward the balance or Reports.`}
          onClose={close}
        >
          <div className="modal-field"><label>Reason</label><textarea value={form.note} onChange={setField('note')} /></div>
          <div className="modal-actions">
            <button className="btn btn-outline" onClick={close} disabled={busy}>Cancel</button>
            <button className="btn btn-danger" disabled={busy}
              onClick={() => run(() => paymentsApi.setInstallmentPaymentStatus(dialog.target.id, dialog.type === 'reject-monthly' ? 'rejected' : 'voided', form.note), dialog.type === 'reject-monthly' ? 'Payment rejected.' : 'Payment voided.')}>
              {busy ? 'Saving…' : dialog.type === 'reject-monthly' ? 'Reject' : 'Void'}
            </button>
          </div>
        </Dialog>
      )}

      {dialog?.type === 'record-monthly' && (() => {
        const r = byId[form.reservationId]
        const prog = r ? paymentsApi.installmentProgress(r, installments) : null
        return (
          <Dialog title="Record installment payment" subtitle="For payments made at the park office. It counts as verified right away." onClose={close}>
            <div className="modal-field">
              <label>Reservation</label>
              <select value={form.reservationId} onChange={(e) => {
                const next = byId[e.target.value]
                setForm((f) => ({ ...f, reservationId: e.target.value, amount: next?.monthlyAmount ? String(next.monthlyAmount) : f.amount }))
              }}>
                <option value="">Choose a confirmed installment…</option>
                {installmentReservations.map((x) => (
                  <option key={x.id} value={x.id}>{x.applicantName} — {lot(x)}</option>
                ))}
              </select>
              {installmentReservations.length === 0 && <small className="pay-sub">No confirmed installment reservations yet.</small>}
              {prog && <small className="pay-sub">{prog.monthsCovered} of {prog.months} months paid · {peso(prog.left)} left · monthly {peso(prog.monthly)}</small>}
            </div>
            <div className="modal-field"><label>Amount (₱)</label><input type="number" min="0" step="0.01" value={form.amount} onChange={setField('amount')} /></div>
            <div className="modal-field">
              <label>Method</label>
              <select value={form.method} onChange={setField('method')}><option value="cash">Cash</option><option value="gcash">GCash</option></select>
            </div>
            <div className="modal-field"><label>Date paid</label><input type="date" value={form.paidOn} onChange={setField('paidOn')} /></div>
            <div className="modal-field"><label>Note (optional)</label><input value={form.note} onChange={setField('note')} placeholder="e.g. OR #12345" /></div>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={close} disabled={busy}>Cancel</button>
              <button className="btn btn-primary" disabled={busy || !r}
                onClick={() => run(() => paymentsApi.recordInstallmentPayment({ reservation: r, amount: Number(form.amount), method: form.method, paidOn: form.paidOn, note: form.note }), 'Payment recorded.')}>
                {busy ? 'Saving…' : 'Record payment'}
              </button>
            </div>
          </Dialog>
        )
      })()}
    </div>
  )
}

// ── GCash Settings tab (merchant link shown to users) ───────────────────────
export function GcashSettingsTab() {
  const { paymentSettings, loading } = usePaymentSettings()
  const { runAction } = useAdmin()
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    if (paymentSettings && !form) {
      setForm({ gcashName: paymentSettings.gcashName, gcashNumber: paymentSettings.gcashNumber, gcashInstructions: paymentSettings.gcashInstructions })
    }
  }, [paymentSettings, form])

  if (loading || !form) return <div className="card"><p className="pay-sub">Loading GCash details…</p></div>

  const setField = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const dirty = paymentSettings && ['gcashName', 'gcashNumber', 'gcashInstructions'].some((k) => (form[k] || '') !== (paymentSettings[k] || ''))
  const ready = !!(paymentSettings?.gcashNumber || paymentSettings?.gcashQrUrl)

  const save = async () => {
    const digits = (form.gcashNumber || '').replace(/\D/g, '')
    if (form.gcashNumber && !/^(09|639)\d{9}$/.test(digits)) {
      runAction(() => Promise.reject(new Error('Enter a valid PH mobile number, e.g. 0917 123 4567.')))
      return
    }
    setSaving(true)
    await runAction(() => paymentsApi.savePaymentSettings(form), 'GCash details saved.')
    setSaving(false)
  }

  const onQr = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setUploading(true)
    await runAction(() => paymentsApi.uploadPaymentQr(file), 'QR code uploaded.')
    setUploading(false)
  }

  return (
    <div className="pay-settings-grid">
      <div className="card settings-section">
        <h3>GCash Merchant Details</h3>
        <p className="pay-sub" style={{ marginBottom: 14 }}>
          Users see these when they choose GCash while reserving a lot or paying a monthly installment.
          GCash is only offered to users once a number or QR code is saved.
        </p>
        <div className="modal-field"><label>Account Name</label><input value={form.gcashName || ''} onChange={setField('gcashName')} placeholder="e.g. Calbayog Memorial Park" /></div>
        <div className="modal-field"><label>GCash Number</label><input value={form.gcashNumber || ''} onChange={setField('gcashNumber')} inputMode="tel" placeholder="09XX XXX XXXX" /></div>
        <div className="modal-field">
          <label>Instructions (optional)</label>
          <textarea value={form.gcashInstructions || ''} onChange={setField('gcashInstructions')} placeholder="e.g. Put your full name and lot number in the GCash message." />
        </div>
        <div className="modal-actions" style={{ justifyContent: 'flex-start' }}>
          <button className="btn btn-primary" onClick={save} disabled={saving || !dirty}>{saving ? 'Saving…' : 'Save Details'}</button>
        </div>

        <h3 style={{ marginTop: 22 }}>GCash QR Code</h3>
        {paymentSettings?.gcashQrUrl
          ? <img src={paymentSettings.gcashQrUrl} alt="GCash QR code" className="pay-qr-img" />
          : <div className="pay-qr-empty">No QR code uploaded</div>}
        <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
          <label className="btn btn-outline" style={{ cursor: uploading ? 'wait' : 'pointer' }}>
            {uploading ? 'Uploading…' : paymentSettings?.gcashQrUrl ? 'Replace QR' : 'Upload QR'}
            <input type="file" accept="image/png,image/jpeg,image/webp" onChange={onQr} disabled={uploading} hidden />
          </label>
          {paymentSettings?.gcashQrUrl && (
            <button className="btn btn-danger" onClick={() => runAction(() => paymentsApi.removePaymentQr(), 'QR code removed.')}>Remove QR</button>
          )}
        </div>
        <p className="pay-sub" style={{ marginTop: 8 }}>In the GCash app: Profile → My QR → Download, then upload it here (PNG/JPG, under 5 MB).</p>
      </div>

      <div className="card settings-section">
        <h3>What users see</h3>
        <span className={`badge ${ready ? 'badge-confirmed' : 'badge-pending'}`}>{ready ? 'GCash is available to users' : 'GCash is hidden (no number or QR yet)'}</span>
        <div className="pay-preview">
          <p className="pay-preview-title">Pay via GCash</p>
          {paymentSettings?.gcashQrUrl && <img src={paymentSettings.gcashQrUrl} alt="" className="pay-qr-img" style={{ margin: '0 auto 10px' }} />}
          {[
            ['Amount to send', '₱ (lot price or amount due now)'],
            ['Account Name', paymentSettings?.gcashName || '—'],
            ['GCash Number', paymentSettings?.gcashNumber || '—'],
          ].map(([l, v]) => (
            <div key={l} className="detail-row"><span className="detail-label">{l}</span><span className="detail-val">{v}</span></div>
          ))}
          {paymentSettings?.gcashInstructions && <p className="pay-sub" style={{ marginTop: 8 }}>{paymentSettings.gcashInstructions}</p>}
          <p className="pay-sub" style={{ marginTop: 10 }}>Then they upload a photo of the GCash receipt, which appears under Payments to review.</p>
        </div>
      </div>
    </div>
  )
}