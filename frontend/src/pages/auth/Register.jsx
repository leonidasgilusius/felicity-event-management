import { useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { registerUser, getErrorMessage } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import ReCAPTCHA from 'react-google-recaptcha';
import '../../styles/Auth.css';

const Register = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    lastName: '',
    email: '',
    password: '',
    contactNumber: '',
    isIIIT: false,
    organisation: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState('');
  const [captchaRenderKey, setCaptchaRenderKey] = useState(0);
  const captchaRef = useRef(null);

  const captchaSiteKey = import.meta.env.VITE_CAPTCHA_SITE_KEY || '';

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
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

      const response = await registerUser(payload);
      login(
        {
          _id: response._id,
          name: response.name,
          email: response.email,
          role: response.role
        }
      );
      navigate('/participant/onboarding', { state: { fromRegistration: true } });
    } catch (err) {
      setError(getErrorMessage(err, 'Registration failed. Please try again.'));
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
        <h2>Register for Felicity</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="name">First Name *</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="lastName">Last Name</label>
              <input
                type="text"
                id="lastName"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="email">Email *</label>
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
            <label htmlFor="password">Password * (minimum 8 characters)</label>
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

          <div className="form-group">
            <label htmlFor="contactNumber">Contact Number</label>
            <input
              type="tel"
              id="contactNumber"
              name="contactNumber"
              value={formData.contactNumber}
              onChange={handleChange}
            />
          </div>

          <div className="form-group checkbox-group">
            <label>
              <input
                type="checkbox"
                name="isIIIT"
                checked={formData.isIIIT}
                onChange={handleChange}
              />
              I am a IIIT Hyderabad student
            </label>
          </div>

          {!formData.isIIIT && (
            <div className="form-group">
              <label htmlFor="organisation">Organisation</label>
              <input
                type="text"
                id="organisation"
                name="organisation"
                value={formData.organisation}
                onChange={handleChange}
              />
            </div>
          )}

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

          {error && <div className="error-message">{error}</div>}

          <button type="submit" className="auth-button" disabled={loading}>
            {loading ? 'Registering...' : 'Register'}
          </button>
        </form>

        <p className="auth-link">
          Already have an account? <Link to="/login">Login here</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
