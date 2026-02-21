import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ParticipantSidebar = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="participant-nav">
      <h1>Felicity</h1>
      <ul className="participant-nav-links">
        <li>
          <NavLink to="/participant/dashboard" className={({ isActive }) => `participant-nav-button ${isActive ? 'active' : ''}`}>
            Dashboard
          </NavLink>
        </li>
        <li>
          <NavLink to="/participant/browse-events" className={({ isActive }) => `participant-nav-button ${isActive ? 'active' : ''}`}>
            Browse Events
          </NavLink>
        </li>
        <li>
          <NavLink to="/participant/organizers" className={({ isActive }) => `participant-nav-button ${isActive ? 'active' : ''}`}>
            Organizers
          </NavLink>
        </li>
        <li>
          <NavLink to="/participant/history" className={({ isActive }) => `participant-nav-button ${isActive ? 'active' : ''}`}>
            History
          </NavLink>
        </li>
        <li>
          <NavLink to="/participant/profile" className={({ isActive }) => `participant-nav-button ${isActive ? 'active' : ''}`}>
            Profile
          </NavLink>
        </li>
        <li>
          <button onClick={handleLogout} className="participant-nav-button logout">
            Logout
          </button>
        </li>
      </ul>
    </nav>
  );
};

export default ParticipantSidebar;
