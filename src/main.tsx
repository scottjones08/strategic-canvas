import React, { Suspense, lazy } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './components/AuthProvider'
import ProtectedRoute from './components/ProtectedRoute'
import './index.css'

// Lazy load heavy components for faster initial load
const App = lazy(() => import('./App'))
const ClientView = lazy(() => import('./pages/ClientView'))
const LoginPage = lazy(() => import('./pages/LoginPage'))
const JoinBoard = lazy(() => import('./pages/JoinBoard'))
const SignPage = lazy(() => import('./pages/SignPage'))

// Loading component
function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-slate-900 to-purple-950 flex items-center justify-center">
      <div className="text-center">
        <div className="relative inline-block">
          <div className="w-16 h-16 border-4 border-indigo-500/30 rounded-full" />
          <div className="absolute inset-0 w-16 h-16 border-4 border-indigo-500 rounded-full border-t-transparent animate-spin" />
        </div>
        <p className="mt-4 text-white/60 text-sm font-medium">Loading Strategic Canvas...</p>
      </div>
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<LoadingScreen />}>
          <Routes>
            {/* Public auth routes */}
            <Route path="/login" element={<LoginPage />} />

            {/* Client portal - public with token */}
            <Route path="/client/:token" element={<ClientView />} />

            {/* Join board - public collaboration link */}
            <Route path="/join" element={<JoinBoard />} />

            {/* E-signature signing page - public with token */}
            <Route path="/sign/:token" element={<SignPage />} />

            {/* Protected app routes */}
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <App />
                </ProtectedRoute>
              }
            />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  </React.StrictMode>,
)
