// Authentication middleware
const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'No authorization token provided',
    });
  }

  // Add your token validation logic here
  req.user = { id: 1, name: 'Demo User' }; // Placeholder
  next();
};

export default auth;
