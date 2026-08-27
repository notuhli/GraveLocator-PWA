import { useState } from 'react'
import { useBlocks, usePricing } from '../hooks'
import { useApp } from '../context/AppContext'
import { CLASSIFICATION } from '../config/constants'
import { statusLabel, statusMeta } from '../config/status'
import { peso, percent, intermentMarks } from '../utils/format'

// ── SearchScreen ─────────────────────────────────────────────────────────────
// Searches real blocks (name / lawn name). Tapping a result opens the map,
// where the per-block lot grid + lot-level search live (Map feature).
export function SearchScreen({ onNavigate }) {
  const [query, setQuery] = useState('')
  const { blocks } = useBlocks()
  const { setActiveBlockId } = useApp()

  const q = query.trim().toLowerCase()
  const results = q
    ? blocks.filter(b =>
        b.name.toLowerCase().includes(q) ||
        (b.lawnName || '').toLowerCase().includes(q) ||
        (b.subAreas || []).some(s => s.toLowerCase().includes(q))
      )
    : []

  const open = (b) => { setActiveBlockId(b.id); onNavigate('map') }

  return (
    <div className="screen active" style={{ background: 'var(--cream)' }}>
      <div className="hdr" style={{ padding: '14px 16px' }}>
        <div className="flex gap-10 items-center">
          <button className="back-btn" onClick={() => onNavigate('home')}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <div className="search-inp-wrap">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.7)" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input
              className="search-inp-ghost"
              placeholder="Search blocks, lawns…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              autoFocus
            />
          </div>
        </div>
      </div>

      {!q ? (
        <div className="scroll-body">
          <p className="f12 c-stone fw7" style={{ textTransform:'uppercase', letterSpacing:1, marginBottom:8 }}>Browse Lawns</p>
          {['Timeless Memory Lawn','Everlasting Lawn','Eternal Lawn','Perpetual Lawn'].map(s => (
            <div key={s} className="recent-item" onClick={() => setQuery(s)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8B9EA0" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <span>{s}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="scroll-body">
          {results.length === 0 ? (
            <div style={{ textAlign:'center', padding:40 }}>
              <p style={{ fontSize:32, marginBottom:12 }}>🔍</p>
              <p className="f14 c-stone">No results for "{query}"</p>
            </div>
          ) : results.map(b => (
            <div key={b.id} className="card" style={{ cursor:'pointer', marginBottom:10 }} onClick={() => open(b)}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                <div>
                  <p className="fw7 f15 c-charcoal" style={{ margin:'0 0 2px' }}>{b.name}</p>
                  <p className="f12 c-stone" style={{ margin:'0 0 6px' }}>{b.lawnName || 'Lawn area'}{b.maxLot ? ` · ${b.maxLot} lots` : ''}</p>
                  <span className="badge badge-available">{(b.classifications || []).join(' · ')}</span>
                </div>
                <button className="btn btn-secondary btn-sm" onClick={e => { e.stopPropagation(); open(b) }}>View Map</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── PlotDetailScreen (view-only) ─────────────────────────────────────────────
// Browsing only — there is no plot reservation/booking in the app. This shows a
// lot's block, lawn, classification, status and reference pricing, and lets the
// user locate it on the map. Lot context comes from the map drill-down.
export function PlotDetailScreen({ onNavigate }) {
  const { activeLot, setActiveBlockId } = useApp()
  const { pricing } = usePricing()

  // Falls back to a sample lot when reached directly (e.g. Home → a lawn).
  const lot = activeLot || {
    blockId: 'block-3', blockName: 'Block 3', lawnName: 'Timeless Memory Lawn',
    lotNo: 204, classification: CLASSIFICATION.REGULAR, status: 'available', intermentCount: 0,
  }
  const meta = statusMeta(lot.status)
  const marks = intermentMarks(lot.intermentCount)
  const p = pricing?.installment?.[lot.classification] || null
  const interest = pricing?.interest || { '1yr': 0.18, '2yr': 0.24, '3yr': 0.34 }

  const planRows = [['1yr', '1 Year'], ['2yr', '2 Years'], ['3yr', '3 Years']]

  const locateOnMap = () => {
    if (lot.blockId) setActiveBlockId(lot.blockId)
    onNavigate('map')
  }

  return (
    <div className="screen active" style={{ background:'var(--cream)' }}>
      <div className="hdr hdr-row" style={{ flexShrink:0 }}>
        <button className="back-btn" onClick={() => onNavigate('map')} aria-label="Back to map">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <h2>Lot Details</h2>
      </div>

      <div className="plot-photo">
        <span style={{ fontSize:40 }}>🪦</span>
        <span className="f12 c-sage">{lot.blockName} · Lot {lot.lotNo ?? '—'}</span>
      </div>

      <div className="scroll-body">
        <div className="card" style={{ marginBottom:14 }}>
          <div className="info-grid">
            {[
              ['Block', lot.blockName],
              ['Lawn', lot.lawnName || '—'],
              ['Lot No.', lot.lotNo ?? '—'],
              ['Class', lot.classification],
              ['Area', p?.areaSqm ? `${p.areaSqm} m²` : '—'],
              ['Price / m²', p ? peso(p.pricePerSqm) : '—'],
            ].map(([l,v]) => (
              <div key={l} className="info-cell">
                <div className="info-lbl">{l}</div>
                <div className="info-val">{v}</div>
              </div>
            ))}
            <div className="info-cell">
              <div className="info-lbl">Status</div>
              <div className="info-val">
                <span className="lg-status-pill" style={{ background:meta.fill, color:meta.text, borderColor:meta.border }}>
                  {statusLabel(lot.status)}{marks ? ` ${marks}` : ''}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Pricing — reference only (the office handles all transactions). */}
        <div className="card" style={{ marginBottom:14 }}>
          <p className="section-label" style={{ margin:'0 0 4px' }}>Pricing (for reference)</p>
          <p className="f12 c-stone" style={{ margin:'0 0 10px' }}>Indicative figures only. Contact the park office to transact.</p>
          {p ? (
            <>
              {[
                ['Total Price', peso(p.totalPrice)],
                ['MCF', peso(p.mcf)],
                ['30% Down Payment', peso(p.downPayment30)],
                ['Total Cash Outlay', peso(p.cashOutlay)],
                ['Balance', peso(p.balance)],
              ].map(([l,v]) => (
                <div key={l} className="fee-row"><span className="fee-lbl">{l}</span><span className="fee-val">{v}</span></div>
              ))}
              <div className="fee-row total" style={{ borderTop:'1px solid var(--lgray)', marginTop:6, paddingTop:8 }}>
                <span className="fee-lbl fw7">Installment (monthly)</span><span className="fee-val">&nbsp;</span>
              </div>
              {planRows.map(([key,label]) => (
                <div key={key} className="fee-row">
                  <span className="fee-lbl">{label} <span style={{ color:'var(--gold)', fontWeight:700 }}>({percent(interest[key])})</span></span>
                  <span className="fee-val">{peso(p.monthly[key])}/mo</span>
                </div>
              ))}
            </>
          ) : <p className="f13 c-stone">No reference pricing for this classification.</p>}
        </div>

        <div className="plot-actions">
          <button className="btn btn-primary btn-sm" style={{ flex:2 }} onClick={locateOnMap}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5" fill="#fff"/></svg>
            Locate on Map
          </button>
          <button className="btn btn-secondary btn-sm" style={{ flex:1 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4A7C3F" strokeWidth="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.6" y1="13.5" x2="15.4" y2="17.5"/><line x1="15.4" y1="6.5" x2="8.6" y2="10.5"/></svg> Share
          </button>
        </div>
      </div>
    </div>
  )
}