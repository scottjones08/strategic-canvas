import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import App from './App'
import ClientView from './pages/ClientView'
import LoginPage from './pages/LoginPage'
import JoinBoard from './pages/JoinBoard'
import { AuthProvider } from './components/AuthProvider'
import ProtectedRoute from './components/ProtectedRoute'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public auth routes */}
          <Route path="/login" element={<LoginPage />} />

          {/* Client portal - public with token */}
          <Route path="/client/:token" element={<ClientView />} />

          {/* Join board - public collaboration link */}
          <Route path="/join" element={<JoinBoard />} />

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
      </BrowserRouter>
    </AuthProvider>
  </React.StrictMode>,
)
