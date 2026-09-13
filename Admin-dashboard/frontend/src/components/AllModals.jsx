import { useState, useEffect } from 'react'
import { useAdmin } from '../context/AdminContext'
import { STATUS, STATUS_META, STATUS_ORDER } from '../config/status'
import { USER_STATUS, ADMIN_ROLE, RESERVATION_STATUS, RESERVATION_STATUS_META } from '../config/adminStatus'
import { plotLabel, plotShort } from '../utils/plot'
import { peso } from '../utils/format'
import * as api from '../api'

// Shared shell: reads context.modal, renders nothing when it's not this modal's id.
function Modal({ id, title, subtitle, children }) {
  const { modal, closeModal } = useAdmin()
  if (modal?.id !== id) return null
  return (
    <div className="modal-overlay open" onClick={e => { if (e.target === e.currentTarget) closeModal() }}>
      <div className="modal">
        <h3>{title}</h3>
        {subtitle && <p>{subtitle}</p>}
        {children}
      </div>
    </div>
  )
}

// ── Update Lot — look up an existing lot by block+number, set its status ────
function UpdateLotModal() {
  const { modal, closeModal } = useAdmin()
  const isOpen = modal?.id === 'modal-updatelot'
  const record = modal?.record || null

  const [blocks, setBlocks] = useState([])
  const [blockId, setBlockId] = useState('')
  const [lotNo, setLotNo] = useState('')
  const [status, setStatus] = useState(STATUS.AVAILABLE)
  const [intermentCount, setIntermentCount] = useState(1)
  const [saving, setSaving] = useState(false)

  const needsIntermentCount = status === STATUS.WITH_INTERMENT

  useEffect(() => { api.getBlocks().then(setBlocks) }, [])
  useEffect(() => {
    if (!isOpen) return
    setBlockId(record?.blockId || '')
    setLotNo(record?.lotNo ?? '')
    setStatus(record?.status || STATUS.AVAILABLE)
    // Default to the lot's existing count when it already has interments,
    // otherwise start at 1 (about to record the first burial).
    setIntermentCount(record?.intermentCount > 0 ? record.intermentCount : 1)
  }, [isOpen, record])

  if (!isOpen) return null
  const gridBlocks = blocks.filter((b) => b.hasGrid)

  const submit = async () => {
    if (!blockId || !lotNo) return
    if (needsIntermentCount && (!intermentCount || Number(intermentCount) < 1)) return
    setSaving(true)
    try {
      await api.updateLotStatus(blockId, Number(lotNo), status, needsIntermentCount ? intermentCount : undefined)
      closeModal()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay open" onClick={e => { if (e.target === e.currentTarget) closeModal() }}>
      <div className="modal">
        <h3>{record ? `Update ${plotLabel(record)}` : 'Update Lot'}</h3>
        <p>Look up a lot by block and lot number, then set its status.</p>
        <div className="modal-row">
          <div className="modal-field">
            <label>Block</label>
            <select value={blockId} onChange={e => setBlockId(e.target.value)} disabled={!!record}>
              <option value="">Select a block…</option>
              {gridBlocks.map(b => <option key={b.id} value={b.id}>{b.name}{b.lawnName ? ` — ${b.lawnName}` : ''}</option>)}
            </select>
          </div>
          <div className="modal-field">
            <label>Lot Number</label>
            <input type="number" min="1" placeholder="e.g. 204" value={lotNo} onChange={e => setLotNo(e.target.value)} disabled={!!record} />
          </div>
        </div>
        <div className="modal-field">
          <label>Status</label>
          <select value={status} onChange={e => setStatus(e.target.value)}>
            {STATUS_ORDER.map(s => <option key={s} value={s}>{STATUS_META[s].label}</option>)}
          </select>
        </div>
        {needsIntermentCount && (
          <div className="modal-field">
            <label>Number of Interments</label>
            <input
              type="number"
              min="1"
              placeholder="e.g. 1"
              value={intermentCount}
              onChange={e => setIntermentCount(e.target.value)}
            />
            <p style={{ fontSize: 12, color: 'var(--dgray)', marginTop: 4 }}>
              How many people are buried in this lot.
            </p>
          </div>
        )}
        <div className="modal-actions">
          <button className="btn btn-outline" onClick={closeModal} disabled={saving}>Cancel</button>
          <button
            className="btn btn-primary"
            onClick={submit}
            disabled={saving || !blockId || !lotNo || (needsIntermentCount && (!intermentCount || Number(intermentCount) < 1))}
          >
            {saving ? 'Saving…' : 'Save Status'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Add / Edit User ────────────────────────────────────────────────────────────
function UserFormModal({ id, title, subtitle }) {
  const { modal, closeModal } = useAdmin()
  const isOpen = modal?.id === id
  const record = modal?.record || null
  const [form, setForm] = useState({ name: '', email: '', phone: '', status: USER_STATUS.ACTIVE })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    setForm(record
      ? { name: record.name, email: record.email, phone: record.phone, status: record.status }
      : { name: '', email: '', phone: '', status: USER_STATUS.ACTIVE })
  }, [isOpen, record])
  if (!isOpen) return null

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const submit = async () => {
    if (!form.name || !form.email) return
    setSaving(true)
    try {
      if (record) await api.updateUser(record.id, form)
      else await api.createUser(form)
      closeModal()
    } finally { setSaving(false) }
  }

  return (
    <Modal id={id} title={title} subtitle={record ? record.name : subtitle}>
      <div className="modal-row">
        <div className="modal-field"><label>Full Name</label><input value={form.name} onChange={set('name')} placeholder="Full name" /></div>
        <div className="modal-field"><label>Email</label><input type="email" value={form.email} onChange={set('email')} placeholder="user@email.com" /></div>
      </div>
      <div className="modal-row">
        <div className="modal-field"><label>Phone</label><input value={form.phone} onChange={set('phone')} placeholder="+63 9XX XXX XXXX" /></div>
        <div className="modal-field">
          <label>Status</label>
          <select value={form.status} onChange={set('status')}>
            {Object.values(USER_STATUS).map(s => <option key={s} value={s}>{s === USER_STATUS.ACTIVE ? 'Active' : 'Inactive'}</option>)}
          </select>
        </div>
      </div>
      <div className="modal-actions">
        <button className="btn btn-outline" onClick={closeModal} disabled={saving}>Cancel</button>
        <button className="btn btn-primary" onClick={submit} disabled={saving || !form.name || !form.email}>
          {saving ? 'Saving…' : record ? 'Save Changes' : 'Add User'}
        </button>
      </div>
    </Modal>
  )
}

// ── Add Memorial ───────────────────────────────────────────────────────────────
function AddMemorialModal() {
  const { modal, closeModal } = useAdmin()
  const isOpen = modal?.id === 'modal-addmemorial'
  const [form, setForm] = useState({ name: '', submittedBy: '', birth: '', death: '', blockId: '', lotNo: '', tribute: '' })
  const [blocks, setBlocks] = useState([])
  const [saving, setSaving] = useState(false)

  useEffect(() => { api.getBlocks().then(setBlocks) }, [])
  useEffect(() => { if (isOpen) setForm({ name: '', submittedBy: '', birth: '', death: '', blockId: '', lotNo: '', tribute: '' }) }, [isOpen])
  if (!isOpen) return null

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const submit = async () => {
    if (!form.name) return
    setSaving(true)
    try {
      await api.createMemorial({
        name: form.name, emoji: '🕊️',
        dates: `${form.birth || '?'} – ${form.death || '?'} · ${plotShort({ blockId: form.blockId, lotNo: form.lotNo })}`,
        quote: form.tribute, likes: 0, comments: 0,
        birth_date: form.birth || null, death_date: form.death || null,
        block_id: form.blockId || null, lot_no: form.lotNo ? Number(form.lotNo) : null,
        submitted_by: form.submittedBy || null,
      })
      closeModal()
    } finally { setSaving(false) }
  }

  return (
    <Modal id="modal-addmemorial" title="Add Memorial" subtitle="Create a digital memorial entry.">
      <div className="modal-row">
        <div className="modal-field"><label>Name of Deceased</label><input value={form.name} onChange={set('name')} placeholder="Full name" /></div>
        <div className="modal-field"><label>Submitted By (User)</label><input value={form.submittedBy} onChange={set('submittedBy')} placeholder="Plot owner name" /></div>
      </div>
      <div className="modal-row">
        <div className="modal-field"><label>Birth Date</label><input type="date" value={form.birth} onChange={set('birth')} /></div>
        <div className="modal-field"><label>Death Date</label><input type="date" value={form.death} onChange={set('death')} /></div>
      </div>
      <div className="modal-row">
        <div className="modal-field">
          <label>Block</label>
          <select value={form.blockId} onChange={set('blockId')}>
            <option value="">Select a block…</option>
            {blocks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        <div className="modal-field"><label>Lot Number</label><input type="number" min="1" value={form.lotNo} onChange={set('lotNo')} placeholder="e.g. 204" /></div>
      </div>
      <div className="modal-field"><label>Tribute Message</label><textarea value={form.tribute} onChange={set('tribute')} placeholder="Enter tribute…" /></div>
      <div className="modal-actions">
        <button className="btn btn-outline" onClick={closeModal} disabled={saving}>Cancel</button>
        <button className="btn btn-primary" onClick={submit} disabled={saving || !form.name}>{saving ? 'Publishing…' : 'Publish Memorial'}</button>
      </div>
    </Modal>
  )
}

// ── Add Admin Staff ────────────────────────────────────────────────────────────
function AddAdminModal() {
  const { modal, closeModal } = useAdmin()
  const isOpen = modal?.id === 'modal-addadmin'
  const [form, setForm] = useState({ name: '', email: '', role: ADMIN_ROLE.VIEWER })
  const [saving, setSaving] = useState(false)

  useEffect(() => { if (isOpen) setForm({ name: '', email: '', role: ADMIN_ROLE.VIEWER }) }, [isOpen])
  if (!isOpen) return null

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const submit = async () => {
    if (!form.name || !form.email) return
    setSaving(true)
    try { await api.addAdminStaff(form); closeModal() }
    finally { setSaving(false) }
  }

  return (
    <Modal id="modal-addadmin" title="Add Admin Staff" subtitle="Grant dashboard access to a staff member.">
      <div className="modal-row">
        <div className="modal-field"><label>Full Name</label><input value={form.name} onChange={set('name')} placeholder="Full name" /></div>
        <div className="modal-field"><label>Email</label><input type="email" value={form.email} onChange={set('email')} placeholder="staff@calbayog.gov.ph" /></div>
      </div>
      <div className="modal-field">
        <label>Role</label>
        <select value={form.role} onChange={set('role')}>
          {Object.values(ADMIN_ROLE).map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>
      <div className="modal-actions">
        <button className="btn btn-outline" onClick={closeModal} disabled={saving}>Cancel</button>
        <button className="btn btn-primary" onClick={submit} disabled={saving || !form.name || !form.email}>{saving ? 'Adding…' : 'Add Staff'}</button>
      </div>
    </Modal>
  )
}

// ── Reservation Detail (admin view — same data the applicant sees, plus
// Confirm / Reject / Cancel actions) ─────────────────────────────────────────
function ReservationDetailModal() {
  const { modal, closeModal } = useAdmin()
  const isOpen = modal?.id === 'modal-reservation-detail'
  const r = modal?.record || null
  const [busy, setBusy] = useState(false)
  if (!isOpen || !r) return null

  const setStatus = async (status) => {
    setBusy(true)
    try { await api.updateReservationStatus(r.id, status); closeModal() }
    finally { setBusy(false) }
  }

  return (
    <Modal id="modal-reservation-detail" title={`${r.blockName} · Lot ${r.lotNo}`} subtitle={r.lawnName}>
      <div style={{ marginBottom: 14 }}>
        <span className={`badge ${RESERVATION_STATUS_META[r.status].badge}`}>{RESERVATION_STATUS_META[r.status].label}</span>
      </div>
      <p style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.6px', color: 'var(--dgray)', marginBottom: 6 }}>Applicant</p>
      {[['Name', r.applicantName], ['Email', r.email], ['Contact', r.contactNumber]].map(([l, v]) => (
        <div key={l} className="detail-row"><span className="detail-label">{l}</span><span className="detail-val">{v}</span></div>
      ))}
      <p style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.6px', color: 'var(--dgray)', margin: '14px 0 6px' }}>Cemetery Lot</p>
      {[['Block', r.blockName], ['Lawn', r.lawnName || '—'], ['Lot Number', r.lotNo], ['Classification', r.classification]].map(([l, v]) => (
        <div key={l} className="detail-row"><span className="detail-label">{l}</span><span className="detail-val">{v}</span></div>
      ))}
      <p style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.6px', color: 'var(--dgray)', margin: '14px 0 6px' }}>Reservation</p>
      {[
        ['Reservation Date', r.reservationDate],
        ['Price', peso(r.price)],
        ['Payment Option', r.paymentOption === 'installment' ? 'Installment' : 'Cash'],
        ['Submitted', new Date(r.createdAt).toLocaleString()],
        ['Notes', r.notes || '—'],
      ].map(([l, v]) => (
        <div key={l} className="detail-row"><span className="detail-label">{l}</span><span className="detail-val">{v}</span></div>
      ))}

      <div className="modal-actions">
        <button className="btn btn-outline" onClick={closeModal} disabled={busy}>Close</button>
        {r.status === RESERVATION_STATUS.PENDING && (
          <>
            <button className="btn btn-danger" onClick={() => setStatus(RESERVATION_STATUS.REJECTED)} disabled={busy}>Reject</button>
            <button className="btn btn-primary" onClick={() => setStatus(RESERVATION_STATUS.CONFIRMED)} disabled={busy}>Confirm</button>
          </>
        )}
        {r.status === RESERVATION_STATUS.CONFIRMED && (
          <button className="btn btn-danger" onClick={() => setStatus(RESERVATION_STATUS.CANCELLED)} disabled={busy}>Cancel Reservation</button>
        )}
      </div>
    </Modal>
  )
}

export default function AllModals() {
  return (
    <>
      <UpdateLotModal />
      <UserFormModal id="modal-adduser" title="Add User" subtitle="Register a new user account manually." />
      <UserFormModal id="modal-edituser" title="Edit User Profile" />
      <AddMemorialModal />
      <AddAdminModal />
      <ReservationDetailModal />
    </>
  )
}