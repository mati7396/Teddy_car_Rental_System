/*catches all errors that happen in your application and 
sends a proper response to the client while optionally logging 
 detailed information for debugging.?*/
const errorMiddleware = (err, req, res, next) => {
    console.error('Error:', err.message);
    if (process.env.NODE_ENV === 'development') {
        console.error(err.stack);
    }

    // Prisma specific errors
    if (err.code === 'P2002') {
        return res.status(400).json({
            message: 'Unique constraint failed on the database',
            target: err.meta?.target
        });
    }

    if (err.code === 'P2025') {
        return res.status(404).json({
            message: 'Record not found'
        });
    }

    // Default error
    const status = err.status || 500;
    const message = err.message || 'Internal Server Error';

    res.status(status).json({
        message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
};

module.exports = errorMiddleware;
