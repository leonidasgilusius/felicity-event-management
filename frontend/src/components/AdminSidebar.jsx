import { NavLink } from 'react-router-dom';

const AdminSidebar = () => {
    return (
        <nav className="participant-nav">
            <h1>Felicity Management</h1>
            <ul className="participant-nav-links">
                <li>
                    <NavLink to="/admin-dashboard" className={({ isActive }) => `participant-nav-button ${isActive ? 'active' : ''}`}>
                        Dashboard
                    </NavLink>
                </li>
                <li>
                    <NavLink to="/admin/manage-organizers" className={({ isActive }) => `participant-nav-button ${isActive ? 'active' : ''}`}>
                        Manage Clubs/Organizers
                    </NavLink>
                </li>
                <li>
                    <NavLink to="/admin/password-reset" className={({ isActive }) => `participant-nav-button ${isActive ? 'active' : ''}`}>
                        Password Reset Requests
                    </NavLink>
                </li>
                <li>
                    <NavLink to="/admin/logout" className={({ isActive }) => `participant-nav-button ${isActive ? 'active' : ''} logout`}>
                        Logout
                    </NavLink>
                </li>
            </ul>
        </nav>
    );
};

export default AdminSidebar;
