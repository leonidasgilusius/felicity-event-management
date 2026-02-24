import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

// Admin Pages
import AdminDashboard from './pages/admin/Dashboard';
import AdminLogin from './pages/admin/Login';
import ManageOrganizers from './pages/admin/ManageOrganizers';
import PasswordReset from './pages/admin/PasswordReset';
import AdminLogout from './pages/admin/Logout';

// Organizer Pages
import OrganizerDashboard from './pages/organizer/Dashboard';
import CreateEvent from './pages/organizer/CreateEvent';
import OngoingEvents from './pages/organizer/OngoingEvents';
import OrganizerProfile from './pages/organizer/Profile';
import OrganizerEventDetail from './pages/organizer/EventDetail';
import PaymentApprovals from './pages/organizer/PaymentApprovals';
import AttendancePage from './pages/organizer/Attendance';

import ParticipantDashboard from './pages/participant/Dashboard';
import BrowseEvents from './pages/participant/BrowseEvents';
import EventDetails from './pages/participant/EventDetails';
import ParticipantProfile from './pages/participant/Profile';
import Organizers from './pages/participant/Organizers';
import OrganizerDetail from './pages/participant/OrganizerDetail';
import OnboardingPreferences from './pages/participant/OnboardingPreferences';

import Home from './pages/auth/Home';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';

import './App.css';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/admin-login" element={<AdminLogin />} />
          <Route path="/register" element={<Register />} />
          
          <Route
            path="/participant-dashboard"
            element={
              <ProtectedRoute allowedRoles={['Participant']}>
                <ParticipantDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/participant/dashboard"
            element={
              <ProtectedRoute allowedRoles={['Participant']}>
                <ParticipantDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/participant/onboarding"
            element={
              <ProtectedRoute allowedRoles={['Participant']}>
                <OnboardingPreferences />
              </ProtectedRoute>
            }
          />
          <Route
            path="/participant/events/:id"
            element={
              <ProtectedRoute allowedRoles={['Participant']}>
                <EventDetails />
              </ProtectedRoute>
            }
          />
          <Route
            path="/participant/organizers"
            element={
              <ProtectedRoute allowedRoles={['Participant']}>
                <Organizers />
              </ProtectedRoute>
            }
          />
          <Route
            path="/participant/organizers/:id"
            element={
              <ProtectedRoute allowedRoles={['Participant']}>
                <OrganizerDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/participant/browse-events"
            element={
              <ProtectedRoute allowedRoles={['Participant']}>
                <BrowseEvents />
              </ProtectedRoute>
            }
          />
          <Route
            path="/participant/profile"
            element={
              <ProtectedRoute allowedRoles={['Participant']}>
                <ParticipantProfile />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/organizer-dashboard"
            element={
              <ProtectedRoute allowedRoles={['Organizer']}>
                <OrganizerDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/organizer/dashboard"
            element={
              <ProtectedRoute allowedRoles={['Organizer']}>
                <OrganizerDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/organizer/create-event"
            element={
              <ProtectedRoute allowedRoles={['Organizer']}>
                <CreateEvent />
              </ProtectedRoute>
            }
          />
          <Route
            path="/organizer/ongoing-events"
            element={
              <ProtectedRoute allowedRoles={['Organizer']}>
                <OngoingEvents />
              </ProtectedRoute>
            }
          />
          <Route
            path="/organizer/events/:eventId/orders"
            element={
              <ProtectedRoute allowedRoles={['Organizer']}>
                <PaymentApprovals />
              </ProtectedRoute>
            }
          />
          <Route
            path="/organizer/events/:eventId/attendance"
            element={
              <ProtectedRoute allowedRoles={['Organizer']}>
                <AttendancePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/organizer/events/:eventId"
            element={
              <ProtectedRoute allowedRoles={['Organizer']}>
                <OrganizerEventDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/organizer/profile"
            element={
              <ProtectedRoute allowedRoles={['Organizer']}>
                <OrganizerProfile />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/admin-dashboard"
            element={
              <ProtectedRoute allowedRoles={['Admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/manage-organizers"
            element={
              <ProtectedRoute allowedRoles={['Admin']}>
                <ManageOrganizers />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/password-reset"
            element={
              <ProtectedRoute allowedRoles={['Admin']}>
                <PasswordReset />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/logout"
            element={
              <ProtectedRoute allowedRoles={['Admin']}>
                <AdminLogout />
              </ProtectedRoute>
            }
          />
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
