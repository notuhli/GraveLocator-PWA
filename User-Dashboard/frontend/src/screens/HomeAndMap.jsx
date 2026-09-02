import { useState, useEffect } from 'react'
import BottomNav from '../components/BottomNav'
import ParkMap from '../components/ParkMap'
import LotGrid from '../components/LotGrid'
import MapLegend from '../components/MapLegend'
import StatusFilter from '../components/StatusFilter'
import MapViewport from '../components/MapViewport'
import MapMarkers from '../components/MapMarkers'
import { useApp } from '../context/AppContext'
import { useBlocks, useLots } from '../hooks'
import parkMapImg from '../assets/park-map.png'

// ── HomeScreen ───────────────────────────────────────────────────────────────
export function HomeScreen({ onNavigate }) {
  const { blocks } = useBlocks()
  const { setActiveBlockId, user } = useApp()

  const quickItems = [
    { label: 'Find a Lot', screen: 'map', bg: 'rgba(45,80,22,.1)', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2D5016" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg> },
    { label: 'Block Directory', screen: 'search', bg: 'rgba(74,124,63,.1)', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4A7C3F" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><circle cx="3.5" cy="6" r="1.2" fill="#4A7C3F"/><circle cx="3.5" cy="12" r="1.2" fill="#4A7C3F"/><circle cx="3.5" cy="18" r="1.2" fill="#4A7C3F"/></svg> },
    { label: 'Digital Memorials', screen: 'memorials', bg: 'rgba(212,130,122,.1)', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#D4827A" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg> },
    { label: 'My Reservations', screen: 'my-reservations', bg: 'rgba(201,168,76,.14)', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#C9A84C" strokeWidth="2"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/></svg> },
  ]

  const lawns = blocks.filter(b => b.lawnName)
  const lotTotal = blocks.reduce((s, b) => s + (b.maxLot || 0), 0)

  const openLawn = (b) => { setActiveBlockId(b.id); onNavigate('map') }

  return (
    <div className="screen active" style={{ background: 'var(--cream)' }}>
      <div className="home-hdr">
        <div className="home-top">
          <div>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,.7)', marginBottom: 2 }}>Welcome back 👋</p>
            <h2 style={{ fontFamily: 'var(--ff-d)', fontSize: 20, color: '#fff', margin: 0 }}>Hi, {user?.name || 'there'}!</h2>
          </div>
          <div className="hm-logo" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="#7BAE6E"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
          </div>
        </div>
        <div className="search-bar-ghost" onClick={() => onNavigate('search')}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.7)" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <span>Search by block, lawn, or lot no.…</span>
        </div>
      </div>

      <div className="scroll-body">
        {/* Explore-the-park hero — opens the full interactive map */}
        <div className="hm-hero" onClick={() => onNavigate('map')}>
          <img className="hm-hero-img" src={parkMapImg} alt="Calbayog Memorial Park map" draggable="false" />
          <div className="hm-hero-overlay">
            <div>
              <p className="hm-hero-title">Explore the Park</p>
              <p className="hm-hero-sub">{blocks.length} blocks · {lawns.length} memorial lawns · {lotTotal.toLocaleString()} lots</p>
            </div>
            <span className="hm-hero-cta">Open Map
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
            </span>
          </div>
        </div>

        <p className="section-label">Quick Access</p>
        <div className="quick-grid">
          {quickItems.map(q => (
            <div key={q.label} className="quick-btn" onClick={() => onNavigate(q.screen)}>
              <div className="quick-icon" style={{ background: q.bg }}>{q.icon}</div>
              <span className="quick-label">{q.label}</span>
            </div>
          ))}
        </div>

        {/* Browse by Lawn — horizontal cards that open straight to a block */}
        <p className="section-label">Browse by Lawn</p>
        <div className="hm-lawns">
          {lawns.map(b => (
            <div key={b.id} className="hm-lawn-card" onClick={() => openLawn(b)}>
              <div className="hm-lawn-leaf">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4A7C3F" strokeWidth="2"><path d="M11 20A7 7 0 019.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z"/><path d="M2 21c0-3 1.85-5.36 5.08-6"/></svg>
              </div>
              <p className="hm-lawn-name">{b.lawnName}</p>
              <p className="hm-lawn-meta">{b.name}{b.maxLot ? ` · ${b.maxLot} lots` : ''}</p>
            </div>
          ))}
        </div>

        <p className="section-label">Recently Viewed</p>
        {[
          { plot: 'Block 3 · Lot 204', section: 'Timeless Memory Lawn' },
          { plot: 'Block 5 · Lot 118', section: 'Everlasting Lawn' },
        ].map(a => (
          <div key={a.plot} className="card mb-10" onClick={() => onNavigate('map')} style={{ cursor: 'pointer', marginBottom: 10 }}>
            <div className="flex justify-between items-center">
              <div className="flex gap-12 items-center">
                <div className="activity-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4A7C3F" strokeWidth="2">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/>
                  </svg>
                </div>
                <div>
                  <p className="fw7 f14 c-charcoal" style={{ margin: 0 }}>{a.plot}</p>
                  <p className="f12 c-stone" style={{ margin: 0 }}>{a.section}</p>
                </div>
              </div>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8B9EA0" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
            </div>
          </div>
        ))}
      </div>

      <BottomNav active="home" onNavigate={onNavigate} />
    </div>
  )
}

// ── MapScreen ────────────────────────────────────────────────────────────────
// Park view → tap a block → zoom into its lot grid → tap a lot → plot details.
// Uses the shared ParkMap (same SVG as the intro) and LotGrid, both coloured by
// the central status taxonomy. Deep-links from Search via context.activeBlockId.
export function MapScreen({ onNavigate }) {
  const { blocks } = useBlocks()
  const { activeBlockId, setActiveBlockId, setActiveLot } = useApp()
  const [selected, setSelected] = useState(null)
  const [filter, setFilter] = useState('all')

  // Deep-link: if Search set a block, open straight into its grid.
  useEffect(() => {
    if (activeBlockId && blocks.length) {
      const b = blocks.find(x => x.id === activeBlockId)
      if (b) setSelected(b)
    }
  }, [activeBlockId, blocks])

  const { lots } = useLots(selected?.id)

  // Status counts for the filter chips.
  const counts = lots.reduce((acc, l) => {
    acc[l.status] = (acc[l.status] || 0) + 1
    return acc
  }, { __total: lots.length })

  const openBlock = (b) => { setFilter('all'); setSelected(b) }

  const backToPark = () => {
    setSelected(null)
    setActiveBlockId(null)
  }

  const openLot = (lot) => {
    setActiveLot({
      blockId: selected.id,
      blockName: selected.name,
      lawnName: selected.lawnName,
      lotNo: lot.lotNo,
      classification: lot.classification,
      status: lot.status,
      intermentCount: lot.intermentCount,
    })
    onNavigate('plotdetail')
  }

  // ── Lot-grid view ──────────────────────────────────────────────────────────
  if (selected) {
    return (
      <div className="screen active" style={{ background: 'var(--cream)' }}>
        <div className="hdr hdr-row" style={{ flexShrink: 0 }}>
          <button className="back-btn" onClick={backToPark} aria-label="Back to park map">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <div>
            <h2 style={{ margin: 0 }}>{selected.name}</h2>
            {selected.lawnName && <p className="f12" style={{ margin: 0, color: 'rgba(255,255,255,.75)' }}>{selected.lawnName}</p>}
          </div>
        </div>

        {selected.hasGrid ? (
          <div className="pm-zoom" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <StatusFilter value={filter} onChange={setFilter} counts={counts} />
            <div className="lg-grid-scroll">
              <LotGrid blockId={selected.id} cols={selected.grid?.cols} filter={filter} onSelectLot={openLot} />
            </div>
            <MapLegend compact />
          </div>
        ) : (
          <div className="lg-empty">
            <span className="lg-empty-icon">🗺️</span>
            <p className="fw7 f15 c-charcoal" style={{ margin: '0 0 4px' }}>Lot grid not yet digitized</p>
            <p className="f13 c-stone" style={{ margin: 0, textAlign: 'center', maxWidth: 260 }}>
              {selected.name}{selected.lawnName ? ` (${selected.lawnName})` : ''} is on the park plan, but its
              per-lot grid hasn’t been captured yet. Tap another block to browse available lots.
            </p>
            <button className="btn btn-outline btn-sm" style={{ marginTop: 16 }} onClick={backToPark}>Back to Park Map</button>
          </div>
        )}

        <BottomNav active="map" onNavigate={onNavigate} />
      </div>
    )
  }

  // ── Park view ──────────────────────────────────────────────────────────────
  return (
    <div className="screen active" style={{ background: 'var(--cream)' }}>
      <div className="hdr">
        <h2 style={{ marginBottom: 4 }}>Calbayog Memorial Park</h2>
        <p className="f12" style={{ margin: 0, color: 'rgba(255,255,255,.75)' }}>Pinch or +/− to zoom — zoom in to reveal blocks &amp; detail · tap a marker for lots</p>
      </div>

      <MapViewport
        overlay={(tr) => (
          <MapMarkers
            t={tr}
            activeBlockId={activeBlockId}
            onSelectBlock={(poi) => {
              const b = blocks.find((x) => x.id === poi.blockId)
              if (b) openBlock(b)
            }}
          />
        )}
      >
        <ParkMap interactive showPins={false} onSelectBlock={openBlock} activeBlockId={activeBlockId} />
      </MapViewport>

      <BottomNav active="map" onNavigate={onNavigate} />
    </div>
  )
}