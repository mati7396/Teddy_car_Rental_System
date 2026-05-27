/*This file handles all booking-related operations:

Creating bookings
Fetching bookings (your own or all bookings)
Updating booking status
Assigning drivers
Fetching a single booking by ID
Updating bookings (including payment info)*/
const prisma = require('../utils/prismaClient');

const CHAPA_BASE_URL = 'https://api.chapa.co/v1/transaction';
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
                        // Other payment methods (CHAPA, TELEBIRR, etc.) -> credit system account
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

            const paymentMethod = (booking.payment && booking.payment.method) ? String(booking.payment.method).toUpperCase() : null;

            // Handle refunds differently based on payment method
            if (effectiveRefundAmount > 0) {
                if (paymentMethod === 'CHAPA') {
                    // Simulate external refund: decrement system account and mark payment REFUNDED
                    const updatedSystem = await tx.bankAccount.update({
                        where: { id: systemAccount.id },
                        data: { balance: { decrement: effectiveRefundAmount } }
                    });

                    await tx.bankTransaction.create({
                        data: {
                            accountId: updatedSystem.id,
                            userId,
                            bookingId,
                            type: 'REFUND',
                            status: 'SUCCESS',
                            amount: effectiveRefundAmount,
                            balanceAfter: updatedSystem.balance,
                            description: `Simulated CHAPA refund for cancelled booking #${bookingId}`,
                            counterparty: booking.user?.email || 'CHAPA'
                        }
                    });

                    await tx.payment.updateMany({
                        where: { bookingId },
                        data: { status: 'REFUNDED' }
                    });
                } else {
                    // Return money to customer's internal wallet (local bank)
                    const refundedAccount = await tx.bankAccount.update({
                        where: { id: customerAccount.id },
                        data: { balance: { increment: effectiveRefundAmount } }
                    });

                    customerBalanceAfter = Number(refundedAccount.balance);

                    // Also decrement the system account so the overall system balance reflects the refund
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

const initializeChapaPayment = async (req, res) => {
    try {
        const { bookingId } = req.body;
        const userId = req.user.id;

        if (!bookingId) {
            return res.status(400).json({ message: 'bookingId is required' });
        }

        if (!process.env.CHAPA_SECRET_KEY) {
            console.error('CHAPA_SECRET_KEY is missing from environment variables');
            return res.status(500).json({ message: 'Payment gateway is not configured' });
        }

        const booking = await prisma.booking.findUnique({
            where: { id: parseInt(bookingId) },
            include: {
                user: { include: { customerProfile: true } },
                payment: true
            }
        });

        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        if (booking.userId !== userId) {
            return res.status(403).json({ message: 'Not authorized to pay for this booking' });
        }

        const txRef = `TEDDY-${booking.id}-${Date.now()}`;
        const firstName = booking.user?.customerProfile?.firstName || 'Teddy';
        const lastName = booking.user?.customerProfile?.lastName || 'Customer';
        const email = booking.user?.email;
        const amount = Number(booking.totalAmount);

        if (!email) {
            return res.status(400).json({ message: 'Customer email is required to initialize payment' });
        }

        const callbackUrl = `${getFrontendBaseUrl()}/confirmation?bookingId=${booking.id}&tx_ref=${encodeURIComponent(txRef)}&source=chapa-callback`;
        const returnUrl = `${getFrontendBaseUrl()}/confirmation?bookingId=${booking.id}&tx_ref=${encodeURIComponent(txRef)}&source=chapa-return`;

        const chapaResponse = await fetch(`${CHAPA_BASE_URL}/initialize`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.CHAPA_SECRET_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                amount: amount.toFixed(2),
                currency: 'ETB',
                email,
                first_name: firstName,
                last_name: lastName,
                tx_ref: txRef,
                callback_url: callbackUrl,
                return_url: returnUrl
            })
        });

        const chapaData = await chapaResponse.json();
        if (!chapaResponse.ok || chapaData?.status !== 'success' || !chapaData?.data?.checkout_url) {
            console.error('Chapa initialization failed:', chapaData);
            return res.status(502).json({ message: chapaData?.message || 'Unable to initialize payment with Chapa' });
        }

        await prisma.payment.upsert({
            where: { bookingId: booking.id },
            update: {
                method: 'CHAPA',
                amount,
                transactionId: txRef,
                payerIdentifier: email,
                status: 'PENDING'
            },
            create: {
                bookingId: booking.id,
                method: 'CHAPA',
                amount,
                transactionId: txRef,
                payerIdentifier: email,
                status: 'PENDING'
            }
        });

        return res.json({
            checkoutUrl: chapaData.data.checkout_url,
            txRef
        });
    } catch (error) {
        console.error('Initialize Chapa payment error:', error);
        return res.status(500).json({ message: 'Unable to initialize payment' });
    }
};

const verifyChapaPayment = async (req, res) => {
    try {
        const { tx_ref: txRef, bookingId } = req.query;
        const userId = req.user.id;

        if (!txRef || !bookingId) {
            return res.status(400).json({ message: 'tx_ref and bookingId are required' });
        }

        const booking = await prisma.booking.findUnique({
            where: { id: parseInt(bookingId) },
            include: { payment: true }
        });

        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        if (booking.userId !== userId) {
            return res.status(403).json({ message: 'Not authorized to verify this payment' });
        }

        if (booking.status === 'PAID') {
            return res.json({
                message: 'Booking is already paid',
                paymentStatus: 'PAID',
                booking
            });
        }

        if (!process.env.CHAPA_SECRET_KEY) {
            return res.status(500).json({ message: 'Payment gateway is not configured' });
        }

        const chapaResponse = await fetch(`${CHAPA_BASE_URL}/verify/${encodeURIComponent(txRef)}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${process.env.CHAPA_SECRET_KEY}`
            }
        });

        const chapaData = await chapaResponse.json();
        if (!chapaResponse.ok || chapaData?.status !== 'success') {
            console.error('Chapa verification failed:', chapaData);
            await prisma.payment.upsert({
                where: { bookingId: booking.id },
                update: { status: 'FAILED', transactionId: txRef },
                create: {
                    bookingId: booking.id,
                    amount: Number(booking.totalAmount),
                    method: 'CHAPA',
                    transactionId: txRef,
                    status: 'FAILED'
                }
            });
            return res.status(400).json({
                message: chapaData?.message || 'Payment verification failed',
                paymentStatus: 'FAILED'
            });
        }

        const chapaPaymentStatus = chapaData?.data?.status;
        const isPaid = ['success', 'successful'].includes(String(chapaPaymentStatus || '').toLowerCase());

        if (isPaid) {
            // For external (CHAPA) payments we DO NOT debit the customer's internal wallet.
            // Instead, credit the system account (revenue) and mark payment as PAID.
            const updatedBooking = await prisma.$transaction(async (tx) => {
                const systemAccount = await ensureSystemAccount(tx);
                const paymentAmount = Number(booking.totalAmount || 0);

                // Credit system account to reflect incoming external payment
                const updatedSystem = await tx.bankAccount.update({
                    where: { id: systemAccount.id },
                    data: { balance: { increment: paymentAmount } }
                });

                // Record a bank transaction for accounting (system received payment)
                await tx.bankTransaction.create({
                    data: {
                        accountId: updatedSystem.id,
                        userId: booking.userId,
                        bookingId: booking.id,
                        type: 'PAYMENT',
                        status: 'SUCCESS',
                        amount: paymentAmount,
                        balanceAfter: updatedSystem.balance,
                        description: `External CHAPA payment for booking #${booking.id}`,
                        counterparty: booking.user?.email || 'CHAPA'
                    }
                });

                const paidBooking = await tx.booking.update({
                    where: { id: booking.id },
                    data: { status: 'PAID' },
                    include: {
                        car: true,
                        package: true,
                        payment: true,
                        user: { include: { customerProfile: true } }
                    }
                });

                await tx.payment.upsert({
                    where: { bookingId: booking.id },
                    update: {
                        status: 'PAID',
                        method: 'CHAPA',
                        transactionId: txRef,
                        payerIdentifier: paidBooking.user.email
                    },
                    create: {
                        bookingId: booking.id,
                        amount: Number(booking.totalAmount),
                        method: 'CHAPA',
                        transactionId: txRef,
                        payerIdentifier: paidBooking.user.email,
                        status: 'PAID'
                    }
                });

                // Notify staff and user
                await tx.notification.createMany({
                    data: [
                        { recipientRole: 'EMPLOYEE', message: `Payment received via CHAPA: ${paymentAmount} ETB` },
                        { recipientRole: 'ADMIN', message: `Payment received via CHAPA: ${paymentAmount} ETB` },
                        { userId: booking.userId, message: 'Payment Successful' }
                    ]
                });

                return paidBooking;
            });

            return res.json({
                message: 'Payment verified successfully',
                paymentStatus: 'PAID',
                booking: updatedBooking
            });
        }

        await prisma.payment.upsert({
            where: { bookingId: booking.id },
            update: { status: 'FAILED', transactionId: txRef, method: 'CHAPA' },
            create: {
                bookingId: booking.id,
                amount: Number(booking.totalAmount),
                method: 'CHAPA',
                transactionId: txRef,
                status: 'FAILED'
            }
        });

        return res.status(400).json({
            message: chapaData?.message || 'Payment was not successful',
            paymentStatus: 'FAILED'
        });
    } catch (error) {
        console.error('Verify Chapa payment error:', error);
        const message = error.message || 'Unable to verify payment';
        const statusCode = /insufficient balance/i.test(message) ? 400 : 500;
        return res.status(statusCode).json({ message, paymentStatus: 'FAILED' });
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
    deleteMyBooking,
    initializeChapaPayment,
    verifyChapaPayment
};
