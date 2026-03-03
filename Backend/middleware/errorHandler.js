/**
 * Global error handler middleware.
 * Catches all errors thrown by route handlers via next(err).
 * In production, hides internal details to prevent information leakage.
 * In development, returns full error details for easier debugging.
 *
 * @param {Error} err - The error object
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export function errorHandler(err, req, res, next) {
    const isProd = process.env.NODE_ENV === "production";

    // Log full error server-side always
    console.error(`[${new Date().toISOString()}] ${req.method} ${req.path} →`, err);

    // Don't expose stack traces or internal messages in production
    const statusCode = err.statusCode || err.status || 500;
    const message = isProd
        ? "Something went wrong. Please try again later."
        : (err.message || "Internal server error");

    res.status(statusCode).json({
        error: message,
        ...(isProd ? {} : { stack: err.stack }),
    });
}
