// Error handling middleware
const errorHandler = (err, req, res, next) => {
  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';

  console.error(`[Error] ${status}: ${message}`);

  res.status(status).json({
    success: false,
    status,
    message,
  });
};

export default errorHandler;
