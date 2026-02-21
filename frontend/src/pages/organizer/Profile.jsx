import { useAuth } from '../../context/AuthContext';
import OrganizerSidebar from '../../components/OrganizerSidebar';
import '../../styles/Dashboard.css';

const OrganizerProfile = () => {
    const { user } = useAuth();

    return (
        <div className="dashboard-container participant-dashboard-container">
            <OrganizerSidebar />
            <div className="dashboard-content participant-dashboard-content">
                <section className="info-section participant-section">
                    <h3>Organizer Profile</h3>
                    <div className="profile-details">
                        <p><strong>Name:</strong> {user?.name}</p>
                        <p><strong>Email:</strong> {user?.email}</p>
                        <p><strong>Role:</strong> {user?.role}</p>
                    </div>
                </section>
            </div>
        </div>
    );
};

export default OrganizerProfile;
