// ─────────────────────────────────────────────────────────────────────────────
// SideNav — desktop/laptop equivalent of BottomNav (see MobileApp.css, the
// ">= 960px" breakpoint). Same nav items/icons/labels as the mobile bottom
// bar, laid out as a persistent vertical rail so desktop users always have a
// way back to Home/Map/Memorials/Profile — including from screens (lot
// detail, the reservation flow) that don't render their own BottomNav on
// mobile, since those rely on a "Back" button there instead.
// ─────────────────────────────────────────────────────────────────────────────
import { NAV_ITEMS } from './BottomNav'

export default function SideNav({ active, onNavigate }) {
  return (
    <nav className="side-nav">
      <div>
        <div className="side-nav-brand">
          <div className="side-nav-brand-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#7BAE6E"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
          </div>
          <div>
            <p className="side-nav-brand-title">GraveLocator</p>
            <p className="side-nav-brand-sub">Calbayog Memorial Park</p>
          </div>
        </div>
        <div className="side-nav-items">
          {NAV_ITEMS.map((item) => (
            <div
              key={item.id}
              className={`side-nav-item${active === item.id ? ' active' : ''}`}
              onClick={() => onNavigate(item.id)}
            >
              {item.icon}
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </div>
      <p className="side-nav-footer">Where love outlasts a lifetime</p>
    </nav>
  )
}