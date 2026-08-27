import Sidebar from './Sidebar'
import Topbar from './Topbar'
import AllModals from './AllModals'
import DashboardPage from '../pages/DashboardPage'
import PlotsPage from '../pages/PlotsPage'
import { UsersPage, MemorialsPage, ReportsPage, NotificationsPage, SettingsPage } from '../pages/OtherPages'
import { useAdmin } from '../context/AdminContext'

const pages = {
  dashboard: DashboardPage,
  plots: PlotsPage,
  users: UsersPage,
  memorials: MemorialsPage,
  reports: ReportsPage,
  notifications: NotificationsPage,
  settings: SettingsPage,
}

export default function AdminLayout() {
  const { activePage, setActivePage } = useAdmin()

  const PageComponent = pages[activePage] || DashboardPage

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <Topbar />

      <main style={{
        marginLeft: 'var(--sidebar)',
        marginTop: 'var(--topbar)',
        padding: 28,
        minHeight: 'calc(100vh - var(--topbar))',
        flex: 1
      }}>
        <PageComponent onNavigate={setActivePage} />
      </main>

      <AllModals />
    </div>
  )
}
