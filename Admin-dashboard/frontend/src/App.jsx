import './App.css'
import { AdminProvider, useAdmin } from './context/AdminContext'
import LoginScreen from './components/LoginScreen'
import AdminLayout from './components/AdminLayout'

function Root() {
  const { isAuthenticated } = useAdmin()
  return isAuthenticated ? <AdminLayout /> : <LoginScreen />
}

export default function App() {
  return (
    <AdminProvider>
      <Root />
    </AdminProvider>
  )
}
