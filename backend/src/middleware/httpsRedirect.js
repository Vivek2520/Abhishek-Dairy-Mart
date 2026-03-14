/**
 * HTTPS Redirect Middleware
 * Forces HTTPS in production via reverse proxy headers
 * Skips health checks and webhooks
 * Safe for local development
 */

const skipPaths = ['/api/health', '/health', '/webhook'];

module.exports = (req, res, next) => {
  // Skip in development/local
  if (process.env.NODE_ENV !== 'production') {
    return next();
  }

  // Skip specific paths
  if (skipPaths.some(path => req.path.startsWith(path))) {
    return next();
  }

  // Check proxy headers for HTTPS
  const proto = req.get('x-forwarded-proto') || req.get('x-forwarded-ssl') || req.protocol;
  
  if (proto !== 'https') {
    const httpsUrl = `https://${req.get('host')}${req.originalUrl}`;
    return res.redirect(301, httpsUrl);
  }

  next();
};
