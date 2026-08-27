import { useState, useEffect } from 'react'
import './MobileApp.css'
import { MapIntroScreen, OnboardingScreen, LoginScreen } from './screens/AuthScreens'
import { HomeScreen, MapScreen } from './screens/HomeAndMap'
import { SearchScreen, PlotDetailScreen } from './screens/SearchAndPlot'
import {
  MemorialsScreen, ProfileScreen
} from './screens/AppScreens'
import { useApp } from './context/AppContext'
import { ENV } from './config/constants'

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
      case 'memorials':     return <MemorialsScreen onNavigate={go} />
      case 'profile':       return <ProfileScreen onNavigate={go} onLogout={async () => { ENV.USE_REMOTE ? await signOut() : logout(); go('login') }} />
      default:              return <HomeScreen onNavigate={go} />
    }
  }

  return (
    <div className="app-root">
      {renderScreen()}
    </div>
  )
}