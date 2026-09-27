/**
 * 404 Not Found Middleware
 * Intercepts unhandled HTTP requests and returns a structured JSON response.
 */
export const notFound = (req, res) => {
  res.status(404).json({
    success: false,
    message: `Cannot ${req.method} ${req.originalUrl} — Route not found`,
  });
};
