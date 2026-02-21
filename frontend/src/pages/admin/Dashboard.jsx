import { useAuth } from '../../context/AuthContext';
import AdminSidebar from '../../components/AdminSidebar';
import '../../styles/Dashboard.css';

const AdminDashboard = () => {
    const { user } = useAuth();

    return (
        <div className="dashboard-container participant-dashboard-container">
            <AdminSidebar />
            <div className="dashboard-content participant-dashboard-content">
                <div className="welcome-section">
                    <h2>Welcome, {user?.name}!</h2>
                    <p className="role-badge admin">Administrator</p>
                </div>
                <div className="info-section">
                    <h3>Admin Dashboard</h3>
                    <p>Use the navigation sidebar to manage organizers and password requests.</p>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;

