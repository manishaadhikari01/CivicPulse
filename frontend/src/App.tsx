import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import AppLayout from './components/AppLayout'
import { AuthProvider, useAuth } from './context/AuthContext'
import GovDashboard from './pages/GovDashboard'
import Home from './pages/Home'
import IssueDetails from './pages/IssueDetails'
import Landing from './pages/Landing'

import Leaderboard from './pages/Leaderboard'
import Login from './pages/Login'
import MapPage from './pages/MapPage'
import Profile from './pages/Profile'
import ReportIssue from './pages/ReportIssue'
import Signup from './pages/Signup'
import AIAnalysis from './pages/AIAnalysis'
import ReviewReport from './pages/ReviewReport'

function RootRoute() {

  const { user, loading } = useAuth()

  if (loading) return null
  return user ? <Home /> : <Landing />
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>

          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/gov" element={<GovDashboard />} />
          <Route element={<AppLayout />}>
            <Route index element={<RootRoute />} />

            <Route path="home" element={<Home />} />
            <Route path="report" element={<ReportIssue />} />
            <Route path="ai-analysis" element={<AIAnalysis />} />
            <Route path="review" element={<ReviewReport />} />
            <Route path="map" element={<MapPage />} />
            <Route path="issues/:id" element={<IssueDetails />} />

            <Route path="leaderboard" element={<Leaderboard />} />
            <Route path="profile" element={<Profile />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
