import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const AdminLogout = () => {
    const { logout } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        const doLogout = async () => {
            await logout();
            navigate('/login');
        };
        doLogout();
    }, [logout, navigate]);

    return (
        <div className="logout-container">
            <p>Logging out...</p>
        </div>
    );
};

export default AdminLogout;
