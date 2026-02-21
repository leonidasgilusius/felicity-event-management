import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const OrganizerSidebar = () => {
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
          <NavLink to="/organizer/dashboard" className={({ isActive }) => `participant-nav-button ${isActive ? 'active' : ''}`}>
            Dashboard
          </NavLink>
        </li>
        <li>
          <NavLink to="/organizer/create-event" className={({ isActive }) => `participant-nav-button ${isActive ? 'active' : ''}`}>
            Create Event
          </NavLink>
        </li>
        <li>
          <NavLink to="/organizer/ongoing-events" className={({ isActive }) => `participant-nav-button ${isActive ? 'active' : ''}`}>
            Ongoing Events
          </NavLink>
        </li>
        <li>
          <NavLink to="/organizer/profile" className={({ isActive }) => `participant-nav-button ${isActive ? 'active' : ''}`}>
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

export default OrganizerSidebar;
