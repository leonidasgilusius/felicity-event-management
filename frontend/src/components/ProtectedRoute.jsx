import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();
  const userRole = user?.role?.toLowerCase();
  const normalizedAllowedRoles = allowedRoles?.map((role) => role.toLowerCase());

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (normalizedAllowedRoles && !normalizedAllowedRoles.includes(userRole)) {
    
    switch (userRole) {
      case 'admin':
        return <Navigate to="/admin-dashboard" replace />;
      case 'organizer':
        return <Navigate to="/organizer-dashboard" replace />;
      case 'participant':
        return <Navigate to="/participant-dashboard" replace />;
      default:
        return <Navigate to="/" replace />;
    }
  }

  return children;
};

export default ProtectedRoute;
