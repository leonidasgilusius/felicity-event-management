import { Link } from 'react-router-dom';
import '../../styles/Home.css';

const Home = () => {
  return (
    <div className="home-container">
      <div className="hero-section">
        <h1>Welcome to Felicity</h1>
        <p className="tagline">Your Gateway to Amazing Events</p>
      </div>

      <div className="cta-buttons">
        <Link to="/login" className="cta-button primary">Login</Link>
        <Link to="/register" className="cta-button secondary">Register</Link>
      </div>
    </div>
  );
};

export default Home;
