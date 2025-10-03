const jwt = require('jsonwebtoken');

function auth(required = true) {
  return (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1] || req.cookies?.token;
    if (!token) {
      if (required) return res.status(401).json({ error: 'Unauthorized' });
      req.user = null;
      return next();
    }
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret');
      req.user = payload;
      next();
    } catch (e) {
      if (required) return res.status(401).json({ error: 'Unauthorized' });
      req.user = null;
      next();
    }
  };
}

module.exports = auth;
