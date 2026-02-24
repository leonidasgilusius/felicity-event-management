import jwt from 'jsonwebtoken';
import User from '../models/user/User.js';

export async function protect(req, res, next) {
  try {
    const token = req.cookies?.token

    if (!token) return res.status(401).json({ message: 'no token' })

    const user = jwt.verify(token, process.env.JWT_SECRET)

    if (String(user?.role || '').toLowerCase() === 'organizer') {
      const organizer = await User.findById(user._id).select('isDisabled archived role').lean();
      if (!organizer) return res.status(401).json({ message: 'Unauthorized user.' });
      if (organizer.isDisabled || organizer.archived) {
        return res.status(403).json({ message: 'Organizer account is disabled or archived.' });
      }
    }

    req.user = user
    next()

    
  } catch (error) {
    console.error(error);
    if (error?.name === 'JsonWebTokenError' || error?.name === 'TokenExpiredError') {
      return res.status(403).json({ message: 'invalid user' });
    }
    res.status(500).json({ message: 'Internal server error occured when verifying token' })
  }
};

export function authorizeRoles(...allowedRoles) {
  const normalizedAllowedRoles = allowedRoles.map((role) => role.toLowerCase());

  return (req, res, next) => {
    const userRole = req.user?.role?.toLowerCase();

    if (!userRole) {
      return res.status(401).json({ message: 'Unauthorized user.' });
    }

    if (!normalizedAllowedRoles.includes(userRole)) {
      return res.status(403).json({ message: 'Forbidden for this role.' });
    }

    return next();
  };
}