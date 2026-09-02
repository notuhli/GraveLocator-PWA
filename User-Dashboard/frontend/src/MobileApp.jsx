import { useState, useEffect } from 'react'
import './MobileApp.css'
import { MapIntroScreen, OnboardingScreen, LoginScreen } from './screens/AuthScreens'
import { HomeScreen, MapScreen } from './screens/HomeAndMap'
import { SearchScreen, PlotDetailScreen } from './screens/SearchAndPlot'
import {
  MemorialsScreen, ProfileScreen
} from './screens/AppScreens'
import {
  ReserveFormScreen, ReserveSummaryScreen, ReserveSuccessScreen,
  MyReservationsScreen, ReservationDetailScreen,
} from './screens/Reservation'
import SideNav from './components/SideNav'
import { useApp } from './context/AppContext'
import { ENV } from './config/constants'

// Screens with no persistent navigation at all (splash / intro / auth) — the
// desktop SideNav is hidden here too, same as the mobile BottomNav.
const NO_NAV_SCREENS = new Set(['mapintro', 'onboarding', 'login'])

// Which SideNav tab should read as "active" for screens that don't map 1:1 to
// a nav item (e.g. lot detail or the reservation flow are reached FROM Map,
// and My Reservations/Reservation Detail live under Profile on mobile too).
const SIDE_NAV_ACTIVE = {
  search: 'map', plotdetail: 'map',
  'reserve-form': 'map', 'reserve-summary': 'map', 'reserve-success': 'map',
  'my-reservations': 'profile', 'reservation-detail': 'profile',
}

export default function MobileApp() {
  const [screen, setScreen] = useState('mapintro')
  const { login, logout, signOut } = useApp()

  const go = (s) => setScreen(s)

  // Auto-advance the animated park-map intro once its reveal has played.
  useEffect(() => {
    if (screen === 'mapintro') {
      const timer = setTimeout(() => go('onboarding'), 3400)
      return () => clearTimeout(timer)
    }
  }, [screen])

  const renderScreen = () => {
    switch (screen) {
      case 'mapintro':      return <MapIntroScreen onDone={() => go('onboarding')} />
      case 'onboarding':    return <OnboardingScreen onNext={() => go('login')} />
      case 'login':         return <LoginScreen onLogin={() => { login(); go('home') }} />
      case 'home':          return <HomeScreen onNavigate={go} />
      case 'map':           return <MapScreen onNavigate={go} />
      case 'search':        return <SearchScreen onNavigate={go} />
      case 'plotdetail':    return <PlotDetailScreen onNavigate={go} />
      case 'reserve-form':      return <ReserveFormScreen onNavigate={go} />
      case 'reserve-summary':   return <ReserveSummaryScreen onNavigate={go} />
      case 'reserve-success':   return <ReserveSuccessScreen onNavigate={go} />
      case 'my-reservations':   return <MyReservationsScreen onNavigate={go} />
      case 'reservation-detail': return <ReservationDetailScreen onNavigate={go} />
      case 'memorials':     return <MemorialsScreen onNavigate={go} />
      case 'profile':       return <ProfileScreen onNavigate={go} onLogout={async () => { ENV.USE_REMOTE ? await signOut() : logout(); go('login') }} />
      default:              return <HomeScreen onNavigate={go} />
    }
  }

  const showNav = !NO_NAV_SCREENS.has(screen)

  return (
    <div className="app-shell">
      {showNav && <SideNav active={SIDE_NAV_ACTIVE[screen] || screen} onNavigate={go} />}
      <div className="app-root">
        {renderScreen()}
      </div>
    </div>
  )
}