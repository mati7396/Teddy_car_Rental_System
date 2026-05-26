const prisma = require('./prismaClient');

/**
 * Automates the car lifecycle:
 * 1. Moves PAID rentals to ACTIVE when startDate is reached.
 * 2. Moves COMPLETED rentals to MAINTENANCE for 1 day.
 * 3. Moves MAINTENANCE cars back to AVAILABLE after 1 day.
 */
const runRentalAutomation = async () => {
    try {
        const now = new Date();

        // 0. Find PAID bookings that have reached their startDate
        const pendingStarts = await prisma.booking.findMany({
            where: {
                status: 'PAID',
                startDate: { lte: now }
            }
        });

        for (const booking of pendingStarts) {
            console.log(`[Scheduler] Booking #${booking.id} reached start date. Activating trip.`);
            await prisma.$transaction([
                prisma.booking.update({
                    where: { id: booking.id },
                    data: { status: 'ACTIVE' }
                }),
                prisma.car.update({
                    where: { id: booking.carId },
                    data: { status: 'RENTED' }
                })
            ]);
        }

        // 1. Find ACTIVE bookings that have reached their endDate
        const expiredBookings = await prisma.booking.findMany({
            where: {
                status: 'ACTIVE',
                endDate: { lte: now }
            },
            include: { car: true }
        });

        for (const booking of expiredBookings) {
            console.log(`[Scheduler] Booking #${booking.id} reached end date. Moving car to maintenance.`);
            
            // Transaction to ensure atomicity
            await prisma.$transaction([
                // Mark booking as completed
                prisma.booking.update({
                    where: { id: booking.id },
                    data: { status: 'COMPLETED', actualReturnDate: now }
                }),
                // Move car to maintenance
                prisma.car.update({
                    where: { id: booking.carId },
                    data: { status: 'MAINTENANCE' }
                }),
                // Create maintenance record for 1 day
                prisma.maintenance.create({
                    data: {
                        carId: booking.carId,
                        description: 'Post-rental full check up (Auto-generated)',
                        startDate: now,
                        endDate: new Date(now.getTime() + 24 * 60 * 60 * 1000), // +1 day
                        status: 'IN_PROGRESS'
                    }
                })
            ]);
        }

        // 2. Find MAINTENANCE cars whose maintenance period has ended
        const finishedMaintenances = await prisma.maintenance.findMany({
            where: {
                status: 'IN_PROGRESS',
                endDate: { lte: now }
            }
        });

        for (const maintenance of finishedMaintenances) {
            console.log(`[Scheduler] Maintenance for car #${maintenance.carId} finished. Returning to available.`);
            
            await prisma.$transaction([
                // Move car to available
                prisma.car.update({
                    where: { id: maintenance.carId },
                    data: { status: 'AVAILABLE' }
                }),
                // Mark maintenance as completed
                prisma.maintenance.update({
                    where: { id: maintenance.id },
                    data: { status: 'COMPLETED' }
                })
            ]);
        }

    } catch (error) {
        console.error('[Scheduler] Automation error:', error);
    }
};

// Run every 1 minute
const startScheduler = () => {
    console.log('[Scheduler] Starting Rental Automation Scheduler...');
    setInterval(runRentalAutomation, 60 * 1000); 
    // Run once immediately on start
    runRentalAutomation();
};

module.exports = { startScheduler };
