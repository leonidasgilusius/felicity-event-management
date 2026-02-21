import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <Link to="/">Felicity Events</Link>
      </div>
      <div className="navbar-menu">
        {isAuthenticated ? (
          <>
            {user?.role === 'Admin' && (
              <>
                <Link to="/admin-dashboard">Dashboard</Link>
                <Link to="/admin/manage-organizers">Manage Organizers</Link>
              </>
            )}
            {user?.role === 'Organizer' && (
              <Link to="/organizer-dashboard">Dashboard</Link>
            )}
            {user?.role === 'Participant' && (
              <Link to="/participant-dashboard">Dashboard</Link>
            )}
            <button onClick={handleLogout} className="logout-btn">Logout</button>
          </>
        ) : (
          <>
            <Link to="/login">Login</Link>
            <Link to="/register">Register</Link>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
