const express = require('express');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

// Route Imports
const authRoutes = require('./src/routes/auth.routes');
const bookingRoutes = require('./src/routes/booking.routes');
const carRoutes = require('./src/routes/car.routes');
const userRoutes = require('./src/routes/user.routes');
const reportRoutes = require('./src/routes/report.routes');
const packageRoutes = require('./src/routes/package.routes');
const contentRoutes = require('./src/routes/content.routes');
const uploadRoutes = require('./src/routes/upload.routes');
const paymentRoutes = require('./src/routes/payment.routes');
const trackingRoutes = require('./src/routes/tracking.routes');
const driverRoutes = require('./src/routes/driver.routes');
const { startScheduler } = require('./src/utils/scheduler');


const app = express();
const PORT = process.env.PORT || 5000;

// Middleware Imports
const errorMiddleware = require('./src/middlewares/error.middleware');

console.log('Initializing Teddy Car Rental API...');

app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true
}));
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(morgan('dev'));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Main Route Registration
console.log('Registering routes...');
app.use('/api/auth', authRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/cars', carRoutes);
app.use('/api/users', userRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/packages', packageRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/tracking', trackingRoutes);
app.use('/api/drivers', driverRoutes);


app.get('/', (req, res) => {
    console.log('Root route hit');
    res.send('Teddy Car Rental API is running');
});

// Error handling middleware
app.use(errorMiddleware);

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log('Routes registered: /api/auth, /api/bookings, /api/cars, /api/users, /api/reports, /api/packages, /api/payment, /api/upload, /api/tracking, /api/drivers');
    
    // Start automated background tasks
    startScheduler();
});