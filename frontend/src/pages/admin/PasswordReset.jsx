import AdminSidebar from '../../components/AdminSidebar';
import '../../styles/Dashboard.css';

const PasswordReset = () => {
    return (
        <div className="dashboard-container participant-dashboard-container">
            <AdminSidebar />
            <div className="dashboard-content participant-dashboard-content">
                <div className="info-section">
                    <h3>Password Reset Requests</h3>
                    <p>No password reset requests yet.</p>
                </div>
            </div>
        </div>
    );
};

export default PasswordReset;
