/*This file handles all booking-related operations:

Creating bookings
Fetching bookings (your own or all bookings)
Updating booking status
Assigning drivers
Fetching a single booking by ID
Updating bookings (including payment info)*/
const prisma = require('../utils/prismaClient');

const FULL_REFUND_WINDOW_HOURS = 24;
const LATE_CANCELLATION_FEE_RATE = 0.15;
const DEFAULT_OPENING_BALANCE = Number(process.env.LOCAL_BANK_OPENING_BALANCE || 20000);
const SYSTEM_ACCOUNT_NUMBER = process.env.SYSTEM_ACCOUNT_NUMBER || 'SYS-0000000001';

const getFrontendBaseUrl = () => process.env.FRONTEND_URL || 'http://localhost:5173';
const generateAccountNumber = (userId) => `LBA-${String(userId).padStart(10, '0')}`;

const ensureSystemAccount = async (tx) => tx.bankAccount.upsert({
    where: { accountNumber: SYSTEM_ACCOUNT_NUMBER },
    update: {},
    create: {
        accountNumber: SYSTEM_ACCOUNT_NUMBER,
        balance: 0,
        accountType: 'SYSTEM'
    }
});

const ensureUserAccount = async (tx, userId) => tx.bankAccount.upsert({
    where: { userId },
    update: {},
    create: {
        userId,
        accountNumber: generateAccountNumber(userId),
        balance: DEFAULT_OPENING_BALANCE,
        accountType: 'CUSTOMER'
    }
});

const createBooking = async (req, res) => {
    try {
        const {
            carId,
            packageId,
            startDate,
            endDate,
            idCardUrl,
            driverLicenseUrl,
            totalAmount,
            pickupLocation,
            returnLocation,
            isDelivery,
            paymentDetails
        } = req.body;
        const userId = req.user.id;

        // BR-03: Bookings cannot be submitted without document uploads.
        if (!idCardUrl || !driverLicenseUrl) {
            return res.status(400).json({ message: 'Document uploads (ID Card and Driver License) are mandatory.' });
        }

        // For car bookings, check car availability
        if (carId) {
            const conflictingBooking = await prisma.booking.findFirst({
                where: {
                    carId: parseInt(carId),
                    status: {
                        in: ['PENDING', 'VERIFIED', 'APPROVED', 'PAID', 'ACTIVE']
                    },
                    OR: [
                        {
                            startDate: { lte: new Date(endDate) },
                            endDate: { gte: new Date(startDate) }
                        }
                    ]
                }
            });

            if (conflictingBooking) {
                return res.status(400).json({ message: 'Car is not available for the selected dates.' });
            }
        }

        // Build location string - include package info if booking a package
        let locationInfo = pickupLocation;
        if (packageId && !pickupLocation) {
            locationInfo = `Package Booking - Package ID: ${packageId}`;
        }

        // Check if user has any previously verified bookings (documents already verified)
        const previousVerifiedBooking = await prisma.booking.findFirst({
            where: {
                userId,
                status: {
                    in: ['VERIFIED', 'APPROVED', 'PAID', 'ACTIVE', 'COMPLETED']
                }
            }
        });

        // If user has verified bookings before, skip document verification
        const initialStatus = previousVerifiedBooking ? 'VERIFIED' : 'PENDING';

        const booking = await prisma.booking.create({
            data: {
                userId,
                carId: carId ? parseInt(carId) : null,
                packageId: packageId ? parseInt(packageId) : null,
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                totalAmount: parseFloat(totalAmount),
                idCardUrl,
                driverLicenseUrl,
                pickupLocation: locationInfo,
                returnLocation,
                isDelivery: isDelivery || false,
                status: initialStatus,
                payment: (paymentDetails && paymentDetails.method) ? {
                    create: {
                        amount: parseFloat(totalAmount),
                        method: paymentDetails.method,
                        transactionId: paymentDetails.transactionNumber || 'N/A',
                        payerIdentifier: (paymentDetails.method === 'TELEBIRR'
                            ? (paymentDetails.phoneNumber || 'N/A')
                            : (paymentDetails.accountNumber || 'N/A')),
                        status: 'PENDING'
                    }
                } : undefined
            },
            include: {
                payment: true,
                package: true,
                car: true
            }
        });

        res.status(201).json(booking);
    } catch (error) {
        console.error('Create booking error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const getMyBookings = async (req, res) => {
    try {
        const bookings = await prisma.booking.findMany({
            where: { userId: req.user.id },
            include: { car: true, payment: true, rentalAgreement: true, package: true },
            orderBy: { createdAt: 'desc' }
        });
        res.json(bookings);
    } catch (error) {
        console.error('Get my bookings error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const getAllBookings = async (req, res) => {
    try {
        const bookings = await prisma.booking.findMany({
            include: {
                user: {
                    include: { customerProfile: true }
                },
                car: true,
                payment: true,
                package: true
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(bookings);
    } catch (error) {
        console.error('Get all bookings error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const updateBookingStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, carId, assignedDriver, driverPhone } = req.body;
        const employeeId = req.user.id;

        const updateData = {
            status,
            processedById: employeeId,
        };

        if (carId) {
            updateData.carId = parseInt(carId);
            
            // Sync delivery location if an associated delivery exists
            try {
                const existingDelivery = await prisma.delivery.findUnique({
                    where: { bookingId: parseInt(id) }
                });
                if (existingDelivery) {
                    const bookingRecord = await prisma.booking.findUnique({
                        where: { id: parseInt(id) }
                    });
                    if (bookingRecord && bookingRecord.pickupLocation) {
                        await prisma.delivery.update({
                            where: { bookingId: parseInt(id) },
                            data: { deliveryLocation: bookingRecord.pickupLocation }
                        });
                    }
                }
            } catch (err) {
                console.error('Failed to sync delivery location in updateBookingStatus:', err);
            }
        }

        if (assignedDriver) {
            updateData.assignedDriver = assignedDriver;
        }

        if (driverPhone) {
            updateData.driverPhone = driverPhone;
        }

        const booking = await prisma.booking.update({
            where: { id: parseInt(id) },
            data: updateData,
            include: {
                user: {
                    include: { customerProfile: true }
                },
                car: true,
                payment: true
            }
        });

        // If booking moved to PAID, ensure corresponding bank account updates and transactions
        if (status === 'PAID') {
            try {
                await prisma.$transaction(async (tx) => {
                    const freshBooking = await tx.booking.findUnique({
                        where: { id: booking.id },
                        include: { payment: true, user: true }
                    });

                    if (!freshBooking) return;
                    const payment = freshBooking.payment;
                    const userId = freshBooking.userId;
                    const paymentAmount = Number(payment?.amount || freshBooking.totalAmount || 0);

                    // If payment already marked PAID, skip
                    if (payment && String(payment.status).toUpperCase() === 'PAID') return;

                    // Ensure system account exists
                    const systemAccount = await ensureSystemAccount(tx);

                    if (payment && String(payment.method || '').toUpperCase() === 'LOCAL_BANK') {
                        // Charge customer's internal wallet
                        const customerAccount = await ensureUserAccount(tx, userId);
                        const currentBalance = Number(customerAccount.balance || 0);
                        if (currentBalance < paymentAmount) {
                            throw new Error('Insufficient balance in customer account for marking booking PAID');
                        }

                        const updatedCustomer = await tx.bankAccount.update({
                            where: { id: customerAccount.id },
                            data: { balance: { decrement: paymentAmount } }
                        });

                        const updatedSystem = await tx.bankAccount.update({
                            where: { id: systemAccount.id },
                            data: { balance: { increment: paymentAmount } }
                        });

                        await tx.bankTransaction.create({
                            data: {
                                accountId: updatedCustomer.id,
                                userId,
                                bookingId: freshBooking.id,
                                type: 'PAYMENT',
                                status: 'SUCCESS',
                                amount: paymentAmount,
                                balanceAfter: updatedCustomer.balance,
                                description: `Admin recorded payment for booking #${freshBooking.id}`,
                                counterparty: updatedSystem.accountNumber
                            }
                        });

                        await tx.payment.upsert({
                            where: { bookingId: freshBooking.id },
                            update: {
                                status: 'PAID',
                                transactionId: `ADMIN-${Date.now()}`,
                                payerIdentifier: updatedCustomer.accountNumber
                            },
                            create: {
                                bookingId: freshBooking.id,
                                amount: paymentAmount,
                                method: 'LOCAL_BANK',
                                transactionId: `ADMIN-${Date.now()}`,
                                payerIdentifier: updatedCustomer.accountNumber,
                                status: 'PAID'
                            }
                        });
                    } else {
                        // External payment method — credit system account
                        const updatedSystem = await tx.bankAccount.update({
                            where: { id: systemAccount.id },
                            data: { balance: { increment: paymentAmount } }
                        });

                        await tx.bankTransaction.create({
                            data: {
                                accountId: updatedSystem.id,
                                userId,
                                bookingId: freshBooking.id,
                                type: 'PAYMENT',
                                status: 'SUCCESS',
                                amount: paymentAmount,
                                balanceAfter: updatedSystem.balance,
                                description: `Recorded external payment for booking #${freshBooking.id}`,
                                counterparty: freshBooking.user?.email || payment?.payerIdentifier || 'EXTERNAL'
                            }
                        });

                        await tx.payment.upsert({
                            where: { bookingId: freshBooking.id },
                            update: { status: 'PAID', transactionId: `ADMIN-${Date.now()}` },
                            create: {
                                bookingId: freshBooking.id,
                                amount: paymentAmount,
                                method: payment?.method || 'EXTERNAL',
                                transactionId: `ADMIN-${Date.now()}`,
                                payerIdentifier: payment?.payerIdentifier || null,
                                status: 'PAID'
                            }
                        });
                    }
                });
            } catch (err) {
                console.error('Failed to reconcile accounts when booking marked PAID:', err.message || err);
                // Do not fail the whole request; booking status was already updated. Notify admin in logs.
            }
        }

        // Sync Car Status and Handle Penalties/Maintenance
        if (status === 'ACTIVE' && booking.carId) {
            await prisma.car.update({
                where: { id: booking.carId },
                data: { status: 'RENTED' }
            });
        } else if (status === 'COMPLETED' && booking.carId) {
            // Check for late return and apply penalty
            const returnDate = new Date();
            const endDate = new Date(booking.endDate);
            let penaltyAmt = 0;
            
            // Allow a grace period of 2 hours
            const gracePeriodHours = 2;
            endDate.setHours(endDate.getHours() + gracePeriodHours);

            if (returnDate > endDate) {
                // Calculate days late (minimum 1 day if late past grace period)
                const diffTime = Math.abs(returnDate - endDate);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                
                // Get car's daily rate
                const car = await prisma.car.findUnique({ where: { id: booking.carId } });
                if (car) {
                    penaltyAmt = diffDays * Number(car.dailyRate);
                }
            }

            // Update booking with actual return date and penalty
            await prisma.booking.update({
                where: { id: booking.id },
                data: {
                    actualReturnDate: returnDate,
                    penaltyAmount: penaltyAmt > 0 ? penaltyAmt : null
                }
            });

            // Set car to MAINTENANCE and create maintenance record
            await prisma.car.update({
                where: { id: booking.carId },
                data: { status: 'MAINTENANCE' }
            });

            await prisma.maintenance.create({
                data: {
                    carId: booking.carId,
                    description: 'Post-rental inspection and maintenance',
                    startDate: new Date(),
                    status: 'PENDING' // or 'IN_PROGRESS'
                }
            });

            // Reset assigned driver to AVAILABLE when trip is completed
            try {
                const delivery = await prisma.delivery.findUnique({
                    where: { bookingId: booking.id }
                });
                if (delivery?.driverId) {
                    await prisma.driver.update({
                        where: { id: delivery.driverId },
                        data: { status: 'AVAILABLE' }
                    });
                    await prisma.delivery.update({
                        where: { bookingId: booking.id },
                        data: { status: 'DELIVERED' }
                    });
                }
            } catch (driverResetErr) {
                console.error('Failed to reset driver status on completion:', driverResetErr);
            }
        }

        // Fetch the updated booking to return
        const updatedBooking = await prisma.booking.findUnique({
            where: { id: parseInt(id) },
            include: {
                user: {
                    include: { customerProfile: true }
                },
                car: true,
                payment: true
            }
        });

        res.json(updatedBooking);

    } catch (error) {
        console.error('Update booking status error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const assignDriver = async (req, res) => {
    try {
        const { id } = req.params;
        const { driverId, deliveryLocation } = req.body;

        if (!driverId || !deliveryLocation) {
            return res.status(400).json({ message: 'driverId and deliveryLocation are required' });
        }

        const driver = await prisma.driver.findUnique({
            where: { id: parseInt(driverId) }
        });

        if (!driver) {
            return res.status(404).json({ message: 'Driver not found' });
        }

        const booking = await prisma.booking.findUnique({
            where: { id: parseInt(id) }
        });

        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        // Use transaction to create delivery and update booking/driver
        const result = await prisma.$transaction(async (tx) => {
            const delivery = await tx.delivery.upsert({
                where: { bookingId: parseInt(id) },
                update: {
                    driverId: parseInt(driverId),
                    deliveryLocation,
                    status: 'ASSIGNED'
                },
                create: {
                    bookingId: parseInt(id),
                    driverId: parseInt(driverId),
                    deliveryLocation,
                    status: 'ASSIGNED'
                }
            });

            await tx.booking.update({
                where: { id: parseInt(id) },
                data: {
                    assignedDriver: driver.fullName,
                    driverPhone: driver.phone
                }
            });

            await tx.driver.update({
                where: { id: parseInt(driverId) },
                data: { status: 'ON_DELIVERY' }
            });

            return delivery;
        });

        // Send notifications
        try {
            await prisma.notification.createMany({
                data: [
                    {
                        userId: booking.userId,
                        message: `A driver has been assigned to your booking #${id}. They will contact you shortly.`
                    },
                    {
                        recipientRole: 'DRIVER',
                        message: `You have been assigned a new delivery for booking #${id}. Please check your assigned deliveries.`
                    }
                ]
            });
        } catch (notifError) {
            console.error('Notification error:', notifError);
            // Don't fail the request if notification fails
        }

        res.json({ message: 'Driver assigned successfully', delivery: result });
    } catch (error) {
        console.error('Assign driver error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const getAvailableDrivers = async (req, res) => {
    try {
        const drivers = await prisma.driver.findMany({
            where: { status: 'AVAILABLE' }
        });

        const sanitizedDrivers = drivers.map(d => {
            const { password, ...rest } = d;
            return rest;
        });

        res.json(sanitizedDrivers);
    } catch (error) {
        console.error('Get available drivers error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const getBookingById = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const userRole = req.user.role;

        const booking = await prisma.booking.findUnique({
            where: { id: parseInt(id) },
            include: {
                car: true,
                package: true,
                user: {
                    include: { customerProfile: true }
                },
                payment: true
            }
        });

        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        // Security: Only owner or staff can see details
        if (booking.userId !== userId && userRole === 'CUSTOMER') {
            return res.status(403).json({ message: 'Forbidden' });
        }

        res.json(booking);
    } catch (error) {
        console.error('Get booking by id error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const updateBooking = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const updateData = req.body;

        // Check if booking exists and belongs to user
        const booking = await prisma.booking.findUnique({
            where: { id: parseInt(id) }
        });

        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        if (booking.userId !== userId) {
            return res.status(403).json({ message: 'Not authorized to update this booking' });
        }

        // Handle payment details if provided
        if (updateData.paymentDetails) {
            const { method, phoneNumber, accountNumber, transactionNumber } = updateData.paymentDetails;
            
            // Create or update payment record
            await prisma.payment.upsert({
                where: { bookingId: parseInt(id) },
                update: {
                    method,
                    amount: updateData.totalAmount || booking.totalAmount,
                    payerIdentifier: phoneNumber || accountNumber,
                    transactionId: transactionNumber,
                    status: 'PENDING'
                },
                create: {
                    bookingId: parseInt(id),
                    method,
                    amount: updateData.totalAmount || booking.totalAmount,
                    payerIdentifier: phoneNumber || accountNumber,
                    transactionId: transactionNumber,
                    status: 'PENDING'
                }
            });

            delete updateData.paymentDetails;
        }

        if (updateData.carId) {
            try {
                const existingDelivery = await prisma.delivery.findUnique({
                    where: { bookingId: parseInt(id) }
                });
                if (existingDelivery) {
                    const bookingRecord = await prisma.booking.findUnique({
                        where: { id: parseInt(id) }
                    });
                    const targetLocation = updateData.pickupLocation || bookingRecord?.pickupLocation;
                    if (targetLocation) {
                        await prisma.delivery.update({
                            where: { bookingId: parseInt(id) },
                            data: { deliveryLocation: targetLocation }
                        });
                    }
                }
            } catch (err) {
                console.error('Failed to sync delivery location in updateBooking:', err);
            }
        }

        // Update booking
        const updatedBooking = await prisma.booking.update({
            where: { id: parseInt(id) },
            data: updateData,
            include: {
                car: true,
                package: true,
                payment: true,
                user: {
                    include: {
                        customerProfile: true
                    }
                }
            }
        });

        res.json(updatedBooking);
    } catch (error) {
        console.error('Update booking error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const cancelBooking = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const bookingId = parseInt(id);

        const booking = await prisma.booking.findUnique({
            where: { id: bookingId },
            include: {
                car: true,
                package: true,
                payment: true
            }
        });

        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        if (booking.userId !== userId) {
            return res.status(403).json({ message: 'Not authorized to cancel this booking' });
        }

        if (booking.status === 'CANCELLED') {
            return res.status(400).json({ message: 'Booking is already cancelled' });
        }

        if (['ACTIVE', 'COMPLETED', 'REJECTED'].includes(booking.status)) {
            return res.status(400).json({ message: `Booking cannot be cancelled when status is ${booking.status}` });
        }

        const now = new Date();
        const startDate = new Date(booking.startDate);
        const diffHours = (startDate.getTime() - now.getTime()) / (1000 * 60 * 60);
        const qualifiesForFullRefund = diffHours >= FULL_REFUND_WINDOW_HOURS;

        const totalAmount = Number(booking.totalAmount || 0);
        const cancellationFee = qualifiesForFullRefund ? 0 : Number((totalAmount * LATE_CANCELLATION_FEE_RATE).toFixed(2));
        const refundAmount = Number((totalAmount - cancellationFee).toFixed(2));

        const isPaid = ['SUCCESS', 'PAID'].includes(String(booking.payment?.status || '').toUpperCase());
        const effectiveCancellationFee = isPaid ? cancellationFee : 0;
        const effectiveRefundAmount = isPaid ? refundAmount : 0;

        const updatedBooking = await prisma.$transaction(async (tx) => {
            const customerAccount = await ensureUserAccount(tx, userId);
            const systemAccount = await ensureSystemAccount(tx);

            let customerBalanceAfter = Number(customerAccount.balance);

            // Handle refunds
            if (effectiveRefundAmount > 0) {
                // Return money to customer's internal wallet (local bank)
                const refundedAccount = await tx.bankAccount.update({
                    where: { id: customerAccount.id },
                    data: { balance: { increment: effectiveRefundAmount } }
                });

                customerBalanceAfter = Number(refundedAccount.balance);

                await tx.bankAccount.update({
                    where: { id: systemAccount.id },
                    data: { balance: { decrement: effectiveRefundAmount } }
                });

                await tx.bankTransaction.create({
                    data: {
                        accountId: customerAccount.id,
                        userId,
                        bookingId,
                        type: 'REFUND',
                        status: 'SUCCESS',
                        amount: effectiveRefundAmount,
                        balanceAfter: customerBalanceAfter,
                        description: `Refund for cancelled booking #${bookingId}`,
                        counterparty: systemAccount.accountNumber
                    }
                });

                await tx.payment.updateMany({
                    where: { bookingId },
                    data: { status: 'REFUNDED' }
                });
            }

            if (effectiveCancellationFee > 0) {
                // Cancellation fee always charged to customer's internal wallet
                const chargedAccount = await tx.bankAccount.update({
                    where: { id: customerAccount.id },
                    data: { balance: { decrement: effectiveCancellationFee } }
                });

                customerBalanceAfter = Number(chargedAccount.balance);

                await tx.bankTransaction.create({
                    data: {
                        accountId: customerAccount.id,
                        userId,
                        bookingId,
                        type: 'CANCELLATION_FEE',
                        status: 'SUCCESS',
                        amount: effectiveCancellationFee,
                        balanceAfter: customerBalanceAfter,
                        description: `Late cancellation fee for booking #${bookingId}`,
                        counterparty: systemAccount.accountNumber
                    }
                });
            }

            return tx.booking.update({
                where: { id: bookingId },
                data: {
                    status: 'CANCELLED',
                    penaltyAmount: effectiveCancellationFee > 0 ? effectiveCancellationFee : null
                },
                include: {
                    car: true,
                    package: true,
                    payment: true,
                    user: {
                        include: {
                            customerProfile: true
                        }
                    }
                }
            });
        });

        // Reset driver status to AVAILABLE if one was assigned to this booking
        try {
            const delivery = await prisma.delivery.findUnique({
                where: { bookingId: bookingId }
            });
            if (delivery?.driverId) {
                await prisma.driver.update({
                    where: { id: delivery.driverId },
                    data: { status: 'AVAILABLE' }
                });
                await prisma.delivery.update({
                    where: { bookingId: bookingId },
                    data: { status: 'CANCELLED' }
                });
            }
        } catch (driverResetErr) {
            console.error('Failed to reset driver status on cancellation:', driverResetErr);
        }

        return res.json({
            message: qualifiesForFullRefund
                ? 'Cancelled successfully. Full refund approved.'
                : `Cancelled successfully. Late cancellation fee of ${cancellationFee.toLocaleString()} ETB applied.`,
            booking: updatedBooking,
            refundPolicy: {
                fullRefundWindowHours: FULL_REFUND_WINDOW_HOURS,
                qualifiesForFullRefund,
                cancellationFee: effectiveCancellationFee,
                refundAmount: effectiveRefundAmount
            }
        });
    } catch (error) {
        console.error('Cancel booking error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

const getCancellationPreview = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const bookingId = parseInt(id);

        const booking = await prisma.booking.findUnique({
            where: { id: bookingId },
            include: {
                car: true,
                package: true,
                payment: true
            }
        });

        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        if (booking.userId !== userId) {
            return res.status(403).json({ message: 'Not authorized to view this booking cancellation details' });
        }

        const cancellableStatuses = ['PENDING', 'VERIFIED', 'APPROVED', 'PAID'];
        const canCancel = cancellableStatuses.includes(booking.status);
        const now = new Date();
        const startDate = new Date(booking.startDate);
        const diffHours = (startDate.getTime() - now.getTime()) / (1000 * 60 * 60);
        const qualifiesForFullRefund = diffHours >= FULL_REFUND_WINDOW_HOURS;

        const totalAmount = Number(booking.totalAmount || 0);
        const cancellationFee = canCancel && !qualifiesForFullRefund
            ? Number((totalAmount * LATE_CANCELLATION_FEE_RATE).toFixed(2))
            : 0;
        const refundAmount = canCancel ? Number((totalAmount - cancellationFee).toFixed(2)) : 0;

        return res.json({
            booking,
            cancellation: {
                canCancel,
                fullRefundWindowHours: FULL_REFUND_WINDOW_HOURS,
                hoursBeforeStart: Number(diffHours.toFixed(2)),
                qualifiesForFullRefund,
                cancellationFee,
                refundAmount
            }
        });
    } catch (error) {
        console.error('Get cancellation preview error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

const deleteMyBooking = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const bookingId = parseInt(id);

        const booking = await prisma.booking.findUnique({
            where: { id: bookingId }
        });

        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        if (booking.userId !== userId) {
            return res.status(403).json({ message: 'Not authorized to delete this booking' });
        }

        if (!['COMPLETED', 'CANCELLED'].includes(booking.status)) {
            return res.status(400).json({ message: 'Only completed or cancelled bookings can be deleted' });
        }

        await prisma.$transaction(async (tx) => {
            await tx.bankTransaction.deleteMany({
                where: { bookingId }
            });

            await tx.payment.deleteMany({
                where: { bookingId }
            });

            await tx.rentalAgreement.deleteMany({
                where: { bookingId }
            });

            await tx.booking.delete({
                where: { id: bookingId }
            });
        });

        return res.json({ message: 'Booking deleted successfully' });
    } catch (error) {
        console.error('Delete booking error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

module.exports = {
    createBooking,
    getMyBookings,
    getAllBookings,
    updateBookingStatus,
    assignDriver,
    getAvailableDrivers,
    getBookingById,
    updateBooking,
    getCancellationPreview,
    cancelBooking,
    deleteMyBooking
};
