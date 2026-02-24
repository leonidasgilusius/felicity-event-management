import { useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { loginUser, getErrorMessage } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import ReCAPTCHA from 'react-google-recaptcha';
import '../../styles/Auth.css';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState('');
  const [captchaRenderKey, setCaptchaRenderKey] = useState(0);
  const captchaRef = useRef(null);

  const captchaSiteKey = import.meta.env.VITE_CAPTCHA_SITE_KEY || '';

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!captchaToken) {
        throw new Error('Please complete CAPTCHA verification.');
      }

      const payload = { ...formData, captchaToken }
      const response = await loginUser(payload);
      login(
        {
          _id: response._id,
          name: response.name,
          email: response.email,
          role: response.role
        }
      );

      const normalizedRole = response.role?.toLowerCase();

      
      switch (normalizedRole) {
        case 'admin':
          navigate('/admin-dashboard');
          break;
        case 'organizer':
          navigate('/organizer-dashboard');
          break;
        case 'participant':
          navigate('/participant-dashboard');
          break;
        default:
          navigate('/');
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Login failed. Please try again.'));
      setCaptchaToken('');
      captchaRef.current?.reset();
      setCaptchaRenderKey(prev => prev + 1);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Login to Felicity</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              minLength="8"
              required
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          {captchaSiteKey && (
            <div style={{ marginBottom: 12 }}>
              <ReCAPTCHA
                key={captchaRenderKey}
                ref={captchaRef}
                sitekey={captchaSiteKey}
                onChange={(token) => setCaptchaToken(token || '')}
                onExpired={() => setCaptchaToken('')}
              />
            </div>
          )}

          <button type="submit" className="auth-button" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <p className="auth-link">
          Don't have an account? <Link to="/register">Register here</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
