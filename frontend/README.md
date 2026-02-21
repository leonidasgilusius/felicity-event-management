# Felicity Event Management Frontend

A React-based frontend application for the Felicity Event Management system with role-based authentication and dashboards.

## Features

- **User Registration**: Participant registration with IIIT email validation
- **User Login**: Secure authentication with JWT tokens
- **Role-Based Routing**: Automatic redirection based on user roles
  - Participant Dashboard
  - Organizer Dashboard
  - Admin Dashboard
- **Protected Routes**: Ensures only authenticated users with proper roles can access their dashboards
- **Responsive Design**: Works seamlessly on desktop and mobile devices

## Tech Stack

- **React 18**: Modern React with hooks
- **Vite**: Fast build tool and dev server
- **React Router v6**: Client-side routing
- **Axios**: HTTP client for API calls
- **CSS3**: Custom styling with gradients and animations

## Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   └── ProtectedRoute.jsx      # Route guard component
│   ├── context/
│   │   └── AuthContext.jsx         # Authentication context
│   ├── pages/
│   │   ├── Home.jsx                # Landing page
│   │   ├── Login.jsx               # Login page
│   │   ├── Register.jsx            # Registration page
│   │   ├── ParticipantDashboard.jsx
│   │   ├── OrganizerDashboard.jsx
│   │   └── AdminDashboard.jsx
│   ├── styles/
│   │   ├── Auth.css                # Authentication pages styles
│   │   ├── Dashboard.css           # Dashboard pages styles
│   │   └── Home.css                # Home page styles
│   ├── utils/
│   │   └── api.js                  # API configuration and calls
│   ├── App.jsx                     # Main app with routing
│   ├── App.css                     # Global styles
│   ├── index.css                   # Reset and base styles
│   └── main.jsx                    # App entry point
└── package.json
```

## Setup Instructions

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Backend server running on `http://localhost:5000`

### Installation

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies (already done if you used the setup):
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The application will open in your browser at `http://localhost:5173` (or another port if 5173 is in use).

## API Integration

The frontend communicates with the backend API at `http://localhost:5000`. The API endpoints used:

- `POST /register` - Register new participant
- `POST /login` - User login

API configuration can be found in `src/utils/api.js`.

## User Roles

The application supports three user roles:

1. **Participant**: Can register for events, view their registrations
2. **Organizer**: Can create and manage events
3. **Admin**: Full system access, user management

## Authentication Flow

1. User logs in or registers
2. Backend returns JWT token and user information
3. Token and user data stored in localStorage
4. Token automatically included in subsequent API requests
5. User redirected to role-specific dashboard
6. Protected routes verify authentication and role permissions

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## License

MIT

