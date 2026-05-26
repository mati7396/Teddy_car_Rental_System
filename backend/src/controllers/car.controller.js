//It handles creating, reading, updating, and deleting car records, along with filtering for availability and bookings.
const prisma = require('../utils/prismaClient');

const autoUpdateCarStatuses = async () => {
    try {
        const oneDayAgo = new Date();
        oneDayAgo.setDate(oneDayAgo.getDate() - 1);

        // 1. Auto-complete overdue rentals and move to Maintenance
        const overdueBookings = await prisma.booking.findMany({
            where: {
                status: 'ACTIVE',
                endDate: { lt: oneDayAgo }
            },
            include: { car: true }
        });

        for (const booking of overdueBookings) {
            await prisma.booking.update({
                where: { id: booking.id },
                data: { 
                    status: 'COMPLETED',
                    actualReturnDate: new Date()
                }
            });
            
            // Per user request: change to AVAILABLE one day after return date
            // (Even if we previously said go to maintenance, the user now wants auto-availability)
            if (booking.carId) {
                await prisma.car.update({
                    where: { id: booking.carId },
                    data: { status: 'AVAILABLE' }
                });
            }
        }

        // 2. Auto-release cars that have been in MAINTENANCE for more than 1 day
        const staleMaintenance = await prisma.maintenance.findMany({
            where: {
                status: 'PENDING',
                startDate: { lt: oneDayAgo }
            }
        });

        for (const maint of staleMaintenance) {
            await prisma.maintenance.update({
                where: { id: maint.id },
                data: { 
                    status: 'COMPLETED',
                    endDate: new Date(),
                    cost: 0 
                }
            });
            await prisma.car.update({
                where: { id: maint.carId },
                data: { status: 'AVAILABLE' }
            });
        }
    } catch (error) {
        console.error('Auto status update error:', error);
    }
};

const getAllCars = async (req, res) => {
    try {
        // Auto-update car statuses based on return dates (1 day grace period)
        await autoUpdateCarStatuses();

        const { category, status, startDate, endDate } = req.query;

        const where = {
            category: category === 'All' ? undefined : (category || undefined),
        };

        // If specific status requested (e.g. from Admin/Employee panel)
        if (status) {
            where.status = status;
        } else {
            // General public view: always exclude maintenance/unavailable
            where.status = { notIn: ['MAINTENANCE', 'UNAVAILABLE'] };
        }

        // If dates are provided, filter out cars that are already booked in that range
        if (startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);

            where.bookings = {
                none: {
                    status: { in: ['PENDING', 'VERIFIED', 'APPROVED', 'PAID', 'ACTIVE'] },
                    OR: [
                        {
                            AND: [
                                { startDate: { lte: start } },
                                { endDate: { gte: start } }
                            ]
                        },
                        {
                            AND: [
                                { startDate: { lte: end } },
                                { endDate: { gte: end } }
                            ]
                        },
                        {
                            AND: [
                                { startDate: { gte: start } },
                                { endDate: { lte: end } }
                            ]
                        }
                    ]
                }
            };
        }

        const cars = await prisma.car.findMany({
            where,
            orderBy: { createdAt: 'desc' }
        });
        res.json(cars);
    } catch (error) {
        console.error('Get all cars error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const getCarById = async (req, res) => {
    try {
        const { id } = req.params;
        const car = await prisma.car.findUnique({
            where: { id: parseInt(id) },
            include: { bookings: { take: 5, orderBy: { startDate: 'desc' } } }
        });

        if (!car) {
            return res.status(404).json({ message: 'Vehicle not found' });
        }

        res.json(car);
    } catch (error) {
        console.error('Get car by id error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const createCar = async (req, res) => {
    try {
        const { make, model, year, plateNumber, category, dailyRate, features, location, imageUrl } = req.body;

        // Input validation
        if (!make || !model || !year || !plateNumber || !category || !dailyRate) {
            return res.status(400).json({ message: 'Make, model, year, plate number, category, and daily rate are required' });
        }
        if (isNaN(parseInt(year)) || parseInt(year) < 1900 || parseInt(year) > new Date().getFullYear() + 1) {
            return res.status(400).json({ message: 'Invalid year' });
        }
        if (isNaN(parseFloat(dailyRate)) || parseFloat(dailyRate) <= 0) {
            return res.status(400).json({ message: 'Daily rate must be a positive number' });
        }

        const existingCar = await prisma.car.findUnique({ where: { plateNumber } });
        if (existingCar) {
            return res.status(400).json({ message: 'A vehicle with this plate number already exists' });
        }

        const car = await prisma.car.create({
            data: {
                make,
                model,
                year: parseInt(year),
                plateNumber,
                category,
                dailyRate: parseFloat(dailyRate),
                features: features || [],
                location,
                imageUrl,
                status: 'AVAILABLE'
            }
        });

        res.status(201).json(car);
    } catch (error) {
        console.error('Create car error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const updateCar = async (req, res) => {
    try {
        const { id } = req.params;
        const { make, model, year, plateNumber, category, dailyRate, features, location, imageUrl, status } = req.body;

        // Build update data with only allowed fields
        const data = {};
        if (make !== undefined) data.make = make;
        if (model !== undefined) data.model = model;
        if (year !== undefined) data.year = parseInt(year);
        if (plateNumber !== undefined) data.plateNumber = plateNumber;
        if (category !== undefined) data.category = category;
        if (dailyRate !== undefined) data.dailyRate = parseFloat(dailyRate);
        if (features !== undefined) data.features = features;
        if (location !== undefined) data.location = location;
        if (imageUrl !== undefined) data.imageUrl = imageUrl;
        if (status !== undefined) data.status = status;

        const car = await prisma.car.update({
            where: { id: parseInt(id) },
            data
        });

        res.json(car);
    } catch (error) {
        console.error('Update car error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const deleteCar = async (req, res) => {
    try {
        const { id } = req.params;
        const carId = parseInt(id);

        // Check if car has active bookings before deletion
        const activeBookings = await prisma.booking.count({
            where: {
                carId,
                status: { in: ['PENDING', 'VERIFIED', 'APPROVED', 'PAID', 'ACTIVE'] }
            }
        });

        if (activeBookings > 0) {
            return res.status(400).json({ message: 'Cannot delete vehicle with active or upcoming bookings' });
        }

        // Check if car has any historical bookings — if so, soft-delete
        const totalBookings = await prisma.booking.count({ where: { carId } });

        if (totalBookings > 0) {
            // Soft delete: mark as UNAVAILABLE instead of hard delete to preserve booking history
            await prisma.car.update({
                where: { id: carId },
                data: { status: 'UNAVAILABLE' }
            });
            res.json({ message: 'Vehicle deactivated successfully (has booking history)' });
        } else {
            // No bookings at all — safe to hard delete
            await prisma.car.delete({ where: { id: carId } });
            res.json({ message: 'Vehicle deleted successfully' });
        }
    } catch (error) {
        console.error('Delete car error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const releaseFromMaintenance = async (req, res) => {
    try {
        const { id } = req.params;
        const { cost, description } = req.body;

        const carId = parseInt(id);

        // Update car status
        await prisma.car.update({
            where: { id: carId },
            data: { status: 'AVAILABLE' }
        });

        // Update the latest pending maintenance record
        const maintenance = await prisma.maintenance.findFirst({
            where: { carId, status: 'PENDING' },
            orderBy: { startDate: 'desc' }
        });

        if (maintenance) {
            await prisma.maintenance.update({
                where: { id: maintenance.id },
                data: {
                    cost: cost ? parseFloat(cost) : 0,
                    endDate: new Date(),
                    status: 'COMPLETED',
                    description: description || maintenance.description
                }
            });
        }

        res.json({ message: 'Vehicle released from maintenance and cost recorded' });
    } catch (error) {
        console.error('Release from maintenance error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

module.exports = {
    getAllCars,
    getCarById,
    createCar,
    updateCar,
    deleteCar,
    releaseFromMaintenance
};
