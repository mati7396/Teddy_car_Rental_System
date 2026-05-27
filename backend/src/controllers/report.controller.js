//helps admins or finance staff to monitor overall business health,
const prisma = require('../utils/prismaClient');

const getFinancialOverview = async (req, res) => {
    try {
        const [paymentsAgg, cancellationFeesAgg, refundsAgg, pendingBookings, activeRentals, totalCustomers] = await Promise.all([
            prisma.bankTransaction.aggregate({
                where: { type: 'PAYMENT', status: 'SUCCESS' },
                _sum: { amount: true }
            }),
            prisma.bankTransaction.aggregate({
                where: { type: 'CANCELLATION_FEE', status: 'SUCCESS' },
                _sum: { amount: true }
            }),
            prisma.bankTransaction.aggregate({
                where: { type: 'REFUND', status: 'SUCCESS' },
                _sum: { amount: true }
            }),
            prisma.booking.count({ where: { status: 'PENDING' } }),
            prisma.booking.count({ where: { status: 'ACTIVE' } }),
            prisma.user.count({ where: { role: 'CUSTOMER' } })
        ]);

        const payments = Number(paymentsAgg?._sum?.amount || 0);
        const cancellationFees = Number(cancellationFeesAgg?._sum?.amount || 0);
        const refunds = Number(refundsAgg?._sum?.amount || 0);
        const totalRevenue = payments + cancellationFees;
        const netRevenue = totalRevenue - refunds;

        res.json({
            summary: {
                totalPayments: payments,
                totalCancellationFees: cancellationFees,
                totalRefunds: refunds,
                totalRevenue,
                netRevenue,
                revenueMargin: totalRevenue > 0 ? (netRevenue / totalRevenue) * 100 : 0
            },
            stats: {
                pendingBookings,
                activeRentals,
                totalCustomers
            }
        });
    } catch (error) {
        console.error('CRITICAL: getFinancialOverview failure:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};


const getRecentTransactions = async (req, res) => {
    try {
        const rows = await prisma.bankTransaction.findMany({
            include: {
                user: {
                    include: {
                        customerProfile: true
                    }
                },
                booking: true
            },
            orderBy: { createdAt: 'desc' }
        });

        const transactions = rows.map((tx) => ({
            id: tx.id,
            transactionRef: `TX-${tx.id}`,
            user: tx.user?.customerProfile
                ? `${tx.user.customerProfile.firstName} ${tx.user.customerProfile.lastName}`
                : (tx.user?.email || 'Unknown User'),
            userEmail: tx.user?.email || null,
            bookingId: tx.bookingId,
            type: tx.type,
            amount: Number(tx.amount || 0),
            status: tx.status,
            date: tx.createdAt,
            description: tx.description || null,
            pickupDate: tx.booking ? tx.booking.startDate : null,
            returnDate: tx.booking ? (tx.booking.actualReturnDate || tx.booking.endDate) : null
        }));

        res.json(transactions);
    } catch (error) {
        console.error('Get recent transactions error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const getChartData = async (req, res) => {
    try {
        const { timeframe = 'monthly' } = req.query;
        const bankTransactions = await prisma.bankTransaction.findMany({
            where: {
                type: { in: ['PAYMENT', 'REFUND', 'CANCELLATION_FEE'] },
                status: 'SUCCESS'
            },
            select: { type: true, amount: true, createdAt: true },
            orderBy: { createdAt: 'asc' }
        });

        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const chartData = {};

        const getStartOfWeek = (d) => {
            const date = new Date(d);
            const day = date.getDay();
            const diff = date.getDate() - day + (day === 0 ? -6 : 1);
            const start = new Date(date.setDate(diff));
            start.setHours(0,0,0,0);
            return start;
        };

        bankTransactions.forEach((entry) => {
            const date = new Date(entry.createdAt);
            let key = '';

            if (timeframe === 'daily') {
                key = `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
            } else if (timeframe === 'weekly') {
                const start = getStartOfWeek(entry.createdAt);
                key = `Week of ${months[start.getMonth()]} ${start.getDate()}, ${start.getFullYear()}`;
            } else {
                // monthly
                key = `${months[date.getMonth()]} ${date.getFullYear()}`;
            }

            if (!chartData[key]) {
                chartData[key] = {
                    name: key,
                    payments: 0,
                    refunds: 0,
                    cancellationFees: 0,
                    netRevenue: 0
                };
            }

            const amount = Number(entry.amount || 0);
            if (entry.type === 'REFUND') {
                chartData[key].refunds += amount;
                chartData[key].netRevenue -= amount;
            } else if (entry.type === 'PAYMENT') {
                chartData[key].payments += amount;
                chartData[key].netRevenue += amount;
            } else if (entry.type === 'CANCELLATION_FEE') {
                chartData[key].cancellationFees += amount;
                chartData[key].netRevenue += amount;
            }
        });

        res.json(Object.values(chartData));
    } catch (error) {
        console.error('Get chart data error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const getMostRentedCars = async (req, res) => {
    try {
        const carsWithBookings = await prisma.car.findMany({
            select: {
                id: true,
                make: true,
                model: true,
                plateNumber: true,
                _count: {
                    select: {
                        bookings: {
                            where: {
                                status: {
                                    in: ['APPROVED', 'PAID', 'ACTIVE', 'COMPLETED']
                                }
                            }
                        }
                    }
                }
            }
        });

        const data = carsWithBookings.map(car => ({
            id: car.id,
            name: `${car.make} ${car.model} (${car.plateNumber})`,
            make: car.make,
            model: car.model,
            bookingsCount: car._count.bookings
        }))
        .sort((a, b) => b.bookingsCount - a.bookingsCount)
        .slice(0, 10);

        res.json(data);
    } catch (error) {
        console.error('Get most rented cars error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};


const getNotifications = async (req, res) => {
    try {
        const notifications = [];
        const roleNotifications = await prisma.notification.findMany({
            where: {
                OR: [
                    { recipientRole: req.user.role },
                    { userId: req.user.id }
                ]
            },
            orderBy: { createdAt: 'desc' },
            take: 20
        });

        roleNotifications.forEach((n) => {
            const msg = (n.message || '').toLowerCase();
            let category = 'General';
            if (msg.includes('refund')) category = 'Refund';
            else if (msg.includes('payment') || msg.includes('paid') || msg.includes('receipt')) category = 'Payment';
            else if (msg.includes('maintenance') || msg.includes('service')) category = 'Maintenance';
            else if (msg.includes('booking') || msg.includes('request') || msg.includes('rental')) category = 'Booking';

            notifications.push({
                id: `db-${n.id}`,
                type: 'info',
                message: n.message,
                time: new Date(n.createdAt).toLocaleString(),
                category
            });
        });

        // 1. Cars in maintenance (Recently returned)
        const maintenanceCars = await prisma.car.findMany({
            where: { status: 'MAINTENANCE' },
            include: {
                maintenances: {
                    where: { status: 'PENDING' },
                    orderBy: { startDate: 'desc' },
                    take: 1
                }
            }
        });

        maintenanceCars.forEach(car => {
            notifications.push({
                id: `maint-${car.id}`,
                type: 'critical',
                message: `Fleet maintenance needed: ${car.make} ${car.model} (${car.plateNumber})`,
                time: car.maintenances[0] ? new Date(car.maintenances[0].startDate).toLocaleDateString() : 'Just now',
                category: 'Maintenance'
            });
        });

        // 2. Pending Bookings
        const pendingBookings = await prisma.booking.findMany({
            where: { status: 'PENDING' },
            include: { user: { include: { customerProfile: true } } },
            orderBy: { createdAt: 'desc' },
            take: 5
        });

        pendingBookings.forEach(booking => {
            const name = booking.user.customerProfile ? 
                `${booking.user.customerProfile.firstName} ${booking.user.customerProfile.lastName}` : 
                booking.user.email;
            notifications.push({
                id: `booking-${booking.id}`,
                type: 'info',
                message: `New booking request from ${name}`,
                time: new Date(booking.createdAt).toLocaleDateString(),
                category: 'Booking'
            });
        });

        res.json(notifications);
    } catch (error) {
        console.error('Get notifications error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const getMyNotifications = async (req, res) => {
    try {
        const myNotifications = await prisma.notification.findMany({
            where: {
                OR: [
                    { userId: req.user.id },
                    { recipientRole: req.user.role }
                ]
            },
            orderBy: { createdAt: 'desc' },
            take: 50
        });

        const data = myNotifications.map((n) => {
            const msg = (n.message || '').toLowerCase();
            let category = 'General';
            if (msg.includes('refund')) category = 'Refund';
            else if (msg.includes('payment') || msg.includes('paid') || msg.includes('receipt')) category = 'Payment';
            else if (msg.includes('maintenance') || msg.includes('service')) category = 'Maintenance';
            else if (msg.includes('booking') || msg.includes('request') || msg.includes('rental')) category = 'Booking';

            return {
                id: n.id,
                message: n.message,
                isRead: n.isRead,
                createdAt: n.createdAt,
                category
            };
        });

        res.json(data);
    } catch (error) {
        console.error('Get my notifications error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const getReceipts = async (req, res) => {
    try {
        const payments = await prisma.bankTransaction.findMany({
            where: {
                type: 'PAYMENT',
                status: 'SUCCESS'
            },
            include: {
                user: { include: { customerProfile: true } },
                booking: { include: { car: true, package: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        const receipts = payments.map((p) => {
            const booking = p.booking;
            const customerName = p.user?.customerProfile
                ? `${p.user.customerProfile.firstName} ${p.user.customerProfile.lastName}`
                : (p.user?.email || 'Customer');
            const ref = `TX-${p.id}`;

            return {
                id: p.id,
                receiptRef: ref,
                bookingId: booking?.id || null,
                customer: customerName,
                amount: Number(p.amount || 0),
                method: 'BANK',
                status: p.status,
                date: p.createdAt,
                rentalType: booking?.package ? 'Package Booking' : 'Car Rental',
                rentalItem: booking?.package
                    ? booking.package.name
                    : `${booking?.car?.make || ''} ${booking?.car?.model || ''}`.trim()
            };
        });

        res.json(receipts);
    } catch (error) {
        console.error('Get receipts error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const markNotificationRead = async (req, res) => {
    try {
        const { id } = req.params;
        const nid = parseInt(id, 10);
        if (isNaN(nid)) return res.status(400).json({ message: 'Invalid notification id' });

        const notif = await prisma.notification.findUnique({ where: { id: nid } });
        if (!notif) return res.status(404).json({ message: 'Notification not found' });

        // Only allow marking notifications visible to the user/role
        if (notif.userId && notif.userId !== req.user.id && req.user.role !== 'ADMIN') {
            return res.status(403).json({ message: 'Not allowed to modify this notification' });
        }

        await prisma.notification.update({ where: { id: nid }, data: { isRead: true } });

        res.json({ message: 'Notification marked as read' });
    } catch (error) {
        console.error('Mark notification read error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

module.exports = {
    getFinancialOverview,
    getRecentTransactions,
    getChartData,
    getNotifications,
    getMyNotifications,
    markNotificationRead,
    getReceipts,
    getMostRentedCars
};


const getCustomersByRentalCount = async (req, res) => {
    try {
        const customers = await prisma.user.findMany({
            where: { role: 'CUSTOMER' },
            include: { customerProfile: true, bookings: true }
        });

        const mapped = customers.map(c => ({
            id: c.id,
            email: c.email,
            name: c.customerProfile ? `${c.customerProfile.firstName} ${c.customerProfile.lastName}` : c.email,
            phone: c.customerProfile ? c.customerProfile.phoneNumber : null,
            rentals: c.bookings ? c.bookings.length : 0
        }));

        // sort ascending by rentals
        mapped.sort((a, b) => a.rentals - b.rentals);

        res.json(mapped);
    } catch (error) {
        console.error('Get customers by rental count failed:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Export the new handler
module.exports.getCustomersByRentalCount = getCustomersByRentalCount;
