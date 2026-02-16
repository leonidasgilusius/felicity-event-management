import jwt from 'jsonwebtoken';

export async function protect(req, res, next) {
  try {
    if (!(req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer'))) return res.status(401).json({message: "no token"})

    const token = req.headers.authorization.split(' ')[1];

    if (!token) {
      res.status(401).json({ message: 'no token' });
    }

    
    jwt.verify(token, process.env.JWT_SECRET, (error, user) => {
      if (error) return res.status(403).json({ message: "invalid user"})
      
      req.user = user

      next()
    })

    
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error occured when verifying token' })
  }
};

export async function adminOnly(req, res, next) {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'Not authorized as an admin' });
  }
};