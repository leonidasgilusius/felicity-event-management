import jwt from 'jsonwebtoken';

export async function protect(req, res, next) {
  try {
    const token = req.cookies?.token

    if (!token) return res.status(401).json({ message: 'no token' })

    jwt.verify(token, process.env.JWT_SECRET, (error, user) => {
      if (error) return res.status(403).json({ message: 'invalid user' })
      req.user = user
      next()
    })

    
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error occured when verifying token' })
  }
};

// export async function adminOnly(req, res, next) {
//   if (req.user && req.user.role?.toLowerCase() === 'admin') {
//     next();
//   } else {
//     res.status(403).json({ message: 'Not authorized as an admin' });
//   }
// };

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