import { useState, useEffect, useCallback } from 'react'
import './MobileApp.css'
import { MapIntroScreen, OnboardingScreen, LoginScreen } from './screens/AuthScreens'
import { HomeScreen, MapScreen } from './screens/HomeAndMap'
import { SearchScreen, PlotDetailScreen } from './screens/SearchAndPlot'
import { MemorialsScreen, ProfileScreen } from './screens/AppScreens'
import {
  ReserveFormScreen, ReserveSummaryScreen, ReserveSuccessScreen,
  MyReservationsScreen, ReservationDetailScreen,
} from './screens/Reservation'
import SideNav from './components/SideNav'
import { useApp } from './context/AppContext'
import { ENV } from './config/constants'

const HISTORY_KEY = '__graveLocator'

// These paths are deliberately kept in the existing single-screen architecture.
// The History API supplies the browser/PWA navigation stack without requiring a
// React Router migration or changing the existing UI/navigation components.
const SCREEN_PATHS = {
  mapintro: '/',
  onboarding: '/onboarding',
  login: '/login',
  home: '/home',
  map: '/map',
  search: '/search',
  plotdetail: '/map/lot',
  'reserve-form': '/reservations/new',
  'reserve-summary': '/reservations/review',
  'reserve-success': '/reservations/success',
  'my-reservations': '/reservations',
  'reservation-detail': '/reservations/detail',
  memorials: '/memorials',
  profile: '/profile',
}

const NO_NAV_SCREENS = new Set(['mapintro', 'onboarding', 'login'])

const SIDE_NAV_ACTIVE = {
  search: 'map',
  plotdetail: 'map',
  'reserve-form': 'map',
  'reserve-summary': 'map',
  'reserve-success': 'map',
  'my-reservations': 'profile',
  'reservation-detail': 'profile',
}

function encode(value) {
  return encodeURIComponent(String(value))
}

function decode(value) {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

function pathFor(screen, params = {}, modal = null) {
  let path = SCREEN_PATHS[screen] || SCREEN_PATHS.home

  if (screen === 'map' && params.blockId) {
    path = `/map/block/${encode(params.blockId)}`
  } else if (screen === 'plotdetail') {
    const blockId = params.blockId || params.activeLot?.blockId
    const lotNo = params.lotNo ?? params.activeLot?.lotNo
    if (blockId != null && lotNo != null) {
      path = `/map/lot/${encode(blockId)}/${encode(lotNo)}`
    }
  } else if (screen === 'reservation-detail' && params.reservationId != null) {
    path = `/reservations/detail/${encode(params.reservationId)}`
  }

  if (modal) {
    path += `?modal=${encode(modal)}`
  }

  return path
}

function parseLocation(location) {
  const path = location.pathname.replace(/\/+$/, '') || '/'
  const search = new URLSearchParams(location.search)
  const modal = search.get('modal') || null

  if (path === '/') return { screen: 'mapintro', params: {}, modal }
  if (path === '/onboarding') return { screen: 'onboarding', params: {}, modal }
  if (path === '/login') return { screen: 'login', params: {}, modal }
  if (path === '/home') return { screen: 'home', params: {}, modal }
  if (path === '/map') return { screen: 'map', params: {}, modal }
  if (path === '/search') return { screen: 'search', params: {}, modal }
  if (path === '/memorials') return { screen: 'memorials', params: {}, modal }
  if (path === '/profile') return { screen: 'profile', params: {}, modal }
  if (path === '/reservations') return { screen: 'my-reservations', params: {}, modal }
  if (path === '/reservations/new') return { screen: 'reserve-form', params: {}, modal }
  if (path === '/reservations/review') return { screen: 'reserve-summary', params: {}, modal }
  if (path === '/reservations/success') return { screen: 'reserve-success', params: {}, modal }

  const blockMatch = path.match(/^\/map\/block\/([^/]+)$/)
  if (blockMatch) {
    return { screen: 'map', params: { blockId: decode(blockMatch[1]) }, modal }
  }

  const lotMatch = path.match(/^\/map\/lot\/([^/]+)\/([^/]+)$/)
  if (lotMatch) {
    return {
      screen: 'plotdetail',
      params: { blockId: decode(lotMatch[1]), lotNo: decode(lotMatch[2]) },
      modal,
    }
  }

  const reservationMatch = path.match(/^\/reservations\/detail\/([^/]+)$/)
  if (reservationMatch) {
    return {
      screen: 'reservation-detail',
      params: { reservationId: decode(reservationMatch[1]) },
      modal,
    }
  }

  return { screen: 'home', params: {}, modal: null, unknown: true }
}

function buildHistoryState(screen, params, modal, index) {
  return {
    [HISTORY_KEY]: true,
    index,
    screen,
    params,
    modal: modal || null,
  }
}

export default function MobileApp() {
  const initialRoute = parseLocation(window.location)
  const initialHistoryState = window.history.state?.[HISTORY_KEY]
  const initialIndex = Number.isInteger(initialHistoryState?.index) ? initialHistoryState.index : 0

  const [route, setRoute] = useState({
    screen: initialRoute.screen,
    params: initialHistoryState?.params || initialRoute.params,
    modal: initialHistoryState?.modal || initialRoute.modal,
  })

  const {
    login, logout, signOut,
    setActiveBlockId, setActiveLot, setActiveReservationId,
  } = useApp()

  // Normalize the first entry without adding a history entry. This gives the
  // app a stable marker so UI Back buttons can distinguish an internal route
  // from a directly opened page.
  useEffect(() => {
    const parsed = parseLocation(window.location)
    const existing = window.history.state?.[HISTORY_KEY]

    if (parsed.unknown) {
      const nextState = buildHistoryState('home', {}, null, 0)
      window.history.replaceState(nextState, '', SCREEN_PATHS.home)
      setRoute({ screen: 'home', params: {}, modal: null })
      return
    }

    if (!existing) {
      window.history.replaceState(
        buildHistoryState(parsed.screen, parsed.params, parsed.modal, 0),
        '',
        window.location.pathname + window.location.search,
      )
    }

    // Apply route parameters from a direct/deep URL to the existing app state.
    if (parsed.params.blockId) setActiveBlockId(parsed.params.blockId)
    if (parsed.params.reservationId != null) setActiveReservationId(parsed.params.reservationId)
  }, [setActiveBlockId, setActiveReservationId])

  const applyRouteState = useCallback((nextRoute) => {
    setRoute(nextRoute)

    const { screen, params = {} } = nextRoute

    if (screen === 'map') {
      setActiveBlockId(params.blockId || null)
      setActiveLot(null)
    } else if (screen === 'plotdetail') {
      if (params.activeLot) {
        setActiveLot(params.activeLot)
        setActiveBlockId(params.activeLot.blockId || null)
      } else if (params.blockId) {
        setActiveBlockId(params.blockId)
        setActiveLot(null)
      } else {
        setActiveLot(null)
      }
    } else if (screen === 'reservation-detail') {
      setActiveReservationId(params.reservationId ?? null)
    }
  }, [setActiveBlockId, setActiveLot, setActiveReservationId])

  const go = useCallback((screen, params = {}, options = {}) => {
    const modal = options.modal || null
    const currentState = window.history.state?.[HISTORY_KEY]
    const currentIndex = Number.isInteger(currentState?.index) ? currentState.index : initialIndex
    const nextIndex = options.replace ? currentIndex : currentIndex + 1
    const nextPath = pathFor(screen, params, modal)
    const currentPath = window.location.pathname + window.location.search
    if (!options.replace && nextPath === currentPath) return

    const nextState = buildHistoryState(screen, params, modal, nextIndex)

    if (options.replace) {
      window.history.replaceState(nextState, '', nextPath)
    } else {
      window.history.pushState(nextState, '', nextPath)
    }

    applyRouteState({ screen, params, modal })
  }, [applyRouteState, initialIndex])

  const goBack = useCallback((fallback = 'home', fallbackParams = {}) => {
    const currentState = window.history.state?.[HISTORY_KEY]
    const index = Number.isInteger(currentState?.index) ? currentState.index : 0

    if (currentState?.[HISTORY_KEY] && index > 0) {
      window.history.back()
      return
    }

    // Direct/deep-linked screen: there is no meaningful internal route to pop.
    // Replace instead of pushing, so pressing Back does not create a loop.
    go(fallback, fallbackParams, { replace: true })
  }, [go])

  useEffect(() => {
    const handlePopState = (event) => {
      const state = event.state?.[HISTORY_KEY]
      const parsed = parseLocation(window.location)

      if (parsed.unknown) {
        // A history entry outside GraveLocator is allowed to remain outside the
        // app. If the browser lands on an unknown internal URL, recover safely.
        const next = { screen: 'home', params: {}, modal: null }
        window.history.replaceState(
          buildHistoryState('home', {}, null, state?.index ?? 0),
          '',
          SCREEN_PATHS.home,
        )
        applyRouteState(next)
        return
      }

      applyRouteState({
        screen: state?.screen || parsed.screen,
        params: state?.params || parsed.params,
        modal: state?.modal || parsed.modal,
      })
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [applyRouteState])

  // Auto-advance the animated park-map intro once its reveal has played. Auth
  // screens replace the current entry rather than filling the Back stack.
  useEffect(() => {
    if (route.screen !== 'mapintro') return undefined
    const timer = setTimeout(() => go('onboarding', {}, { replace: true }), 3400)
    return () => clearTimeout(timer)
  }, [route.screen, go])

  const renderScreen = () => {
    const { screen, params, modal } = route

    switch (screen) {
      case 'mapintro':
        return <MapIntroScreen onDone={() => go('onboarding', {}, { replace: true })} />
      case 'onboarding':
        return <OnboardingScreen onNext={() => go('login', {}, { replace: true })} />
      case 'login':
        return <LoginScreen onLogin={() => { login(); go('home', {}, { replace: true }) }} />
      case 'home':
        return <HomeScreen onNavigate={go} onBack={goBack} />
      case 'map':
        return <MapScreen onNavigate={go} onBack={goBack} routeBlockId={params?.blockId} />
      case 'search':
        return <SearchScreen onNavigate={go} onBack={goBack} />
      case 'plotdetail':
        return <PlotDetailScreen onNavigate={go} onBack={goBack} routeLot={params} />
      case 'reserve-form':
        return <ReserveFormScreen onNavigate={go} onBack={goBack} />
      case 'reserve-summary':
        return <ReserveSummaryScreen onNavigate={go} onBack={goBack} />
      case 'reserve-success':
        return <ReserveSuccessScreen onNavigate={go} />
      case 'my-reservations':
        return <MyReservationsScreen onNavigate={go} />
      case 'reservation-detail':
        return <ReservationDetailScreen onNavigate={go} onBack={goBack} />
      case 'memorials':
        return <MemorialsScreen onNavigate={go} onBack={goBack} modal={modal} />
      case 'profile':
        return <ProfileScreen onNavigate={go} onBack={goBack} modal={modal} onLogout={async () => { ENV.USE_REMOTE ? await signOut() : logout(); go('login', {}, { replace: true }) }} />
      default:
        return <HomeScreen onNavigate={go} onBack={goBack} />
    }
  }

  const showNav = !NO_NAV_SCREENS.has(route.screen)

  return (
    <div className="app-shell">
      {showNav && <SideNav active={SIDE_NAV_ACTIVE[route.screen] || route.screen} onNavigate={go} />}
      <div className="app-root">
        {renderScreen()}
      </div>
    </div>
  )
}
