const prisma = require('../utils/prismaClient');

const VAT_RATE = Number(process.env.LOCAL_BANK_VAT_RATE || 0.15);
const SYSTEM_ACCOUNT_NUMBER = process.env.SYSTEM_ACCOUNT_NUMBER || 'SYS-0000000001';
const DEFAULT_OPENING_BALANCE = Number(process.env.LOCAL_BANK_OPENING_BALANCE || 10000);

const generateAccountNumber = (userId) => `LBA-${String(userId).padStart(10, '0')}`;

const ensureSystemAccount = async (tx) => {
    return tx.bankAccount.upsert({
        where: { accountNumber: SYSTEM_ACCOUNT_NUMBER },
        update: {},
        create: {
            accountNumber: SYSTEM_ACCOUNT_NUMBER,
            balance: 0,
            accountType: 'SYSTEM'
        }
    });
};

const ensureUserAccount = async (tx, userId) => {
    const accountNumber = generateAccountNumber(userId);
    return tx.bankAccount.upsert({
        where: { userId },
        update: {},
        create: {
            userId,
            accountNumber,
            balance: DEFAULT_OPENING_BALANCE,
            accountType: 'CUSTOMER'
        }
    });
};

const getLocalBankAccount = async (req, res) => {
    try {
        const userId = req.user.id;
        const account = await prisma.$transaction(async (tx) => {
            return ensureUserAccount(tx, userId);
        });

        return res.json({
            status: 'success',
            account: {
                accountNumber: account.accountNumber,
                balance: Number(account.balance),
                accountType: account.accountType
            },
            paymentConfig: {
                vatRate: VAT_RATE
            }
        });
    } catch (error) {
        console.error('Get local bank account error:', error);
        return res.status(500).json({ status: 'failed', message: 'Unable to load local bank account' });
    }
};

const payWithLocalBank = async (req, res) => {
    try {
        const { bookingId } = req.body;

        if (!bookingId) {
            return res.status(400).json({ status: 'failed', message: 'bookingId is required' });
        }

        const bookingIdInt = parseInt(bookingId);
        const userId = req.user.id;

        const result = await prisma.$transaction(async (tx) => {
            const booking = await tx.booking.findUnique({
                where: { id: bookingIdInt },
                include: { payment: true }
            });

            if (!booking) {
                throw new Error('Booking not found');
            }
            if (booking.userId !== userId) {
                throw new Error('Not authorized to pay for this booking');
            }
            if (booking.status === 'PAID') {
                throw new Error('Booking is already paid');
            }

            const customerAccount = await ensureUserAccount(tx, userId);
            const systemAccount = await ensureSystemAccount(tx);

            const rentalAmount = Number(booking.totalAmount);
            const vatAmount = Number((rentalAmount * VAT_RATE).toFixed(2));
            const totalCharge = Number((rentalAmount + vatAmount).toFixed(2));
            const currentBalance = Number(customerAccount.balance);

            if (currentBalance < totalCharge) {
                throw new Error(`Insufficient balance. Required: ${totalCharge.toLocaleString()} ETB, Available: ${currentBalance.toLocaleString()} ETB`);
            }

            const customerUpdated = await tx.bankAccount.update({
                where: { id: customerAccount.id },
                data: { balance: { decrement: totalCharge } }
            });

            const systemUpdated = await tx.bankAccount.update({
                where: { id: systemAccount.id },
                data: { balance: { increment: rentalAmount } }
            });

            const txRef = `TXN-${Date.now()}`;

            await tx.bankTransaction.create({
                data: {
                    accountId: customerUpdated.id,
                    userId,
                    bookingId: booking.id,
                    type: 'PAYMENT',
                    status: 'SUCCESS',
                    amount: totalCharge,
                    balanceAfter: customerUpdated.balance,
                    description: `Booking payment (rental + VAT ${Math.round(VAT_RATE * 100)}%)`,
                    counterparty: systemUpdated.accountNumber
                }
            });

            await tx.booking.update({
                where: { id: booking.id },
                data: { status: 'PAID' }
            });

            await tx.payment.upsert({
                where: { bookingId: booking.id },
                update: {
                    method: 'LOCAL_BANK',
                    amount: totalCharge,
                    transactionId: txRef,
                    payerIdentifier: customerUpdated.accountNumber,
                    status: 'SUCCESS'
                },
                create: {
                    bookingId: booking.id,
                    method: 'LOCAL_BANK',
                    amount: totalCharge,
                    transactionId: txRef,
                    payerIdentifier: customerUpdated.accountNumber,
                    status: 'SUCCESS'
                }
            });

            await tx.notification.createMany({
                data: [
                    {
                        recipientRole: 'EMPLOYEE',
                        message: `New payment received: ${totalCharge.toLocaleString()} ETB`
                    },
                    {
                        recipientRole: 'ADMIN',
                        message: `New payment received: ${totalCharge.toLocaleString()} ETB`
                    },
                    {
                        userId,
                        message: `Payment successful. Amount: ${totalCharge.toLocaleString()} ETB`
                    }
                ]
            });

            return {
                txRef,
                customerAccountNumber: customerUpdated.accountNumber,
                customerBalance: Number(customerUpdated.balance),
                rentalAmount,
                vatAmount,
                totalCharge,
                receiptDate: new Date().toISOString()
            };
        });

        return res.json({
            status: 'success',
            message: 'Local bank payment completed successfully',
            tx_ref: result.txRef,
            paymentBreakdown: {
                rentalAmount: result.rentalAmount,
                vatAmount: result.vatAmount,
                totalDebited: result.totalCharge
            },
            account: {
                accountNumber: result.customerAccountNumber,
                remainingBalance: result.customerBalance
            },
            receipt: {
                amount: result.totalCharge,
                date: result.receiptDate,
                reference: result.txRef
            }
        });
    } catch (error) {
        console.error('Local bank payment error:', error);
        const message = error.message || 'Unable to process local bank payment';
        const statusCode = /not found/i.test(message) ? 404 : /not authorized/i.test(message) ? 403 : /insufficient balance/i.test(message) ? 400 : 500;
        return res.status(statusCode).json({ status: 'failed', message });
    }
};

const getLocalBankTransactions = async (req, res) => {
    try {
        const userId = req.user.id;
        const rows = await prisma.bankTransaction.findMany({
            where: { userId },
            include: {
                booking: true,
                account: true
            },
            orderBy: { createdAt: 'desc' }
        });

        const txs = rows.map(tx => ({
            id: tx.id,
            bookingId: tx.bookingId,
            type: tx.type,
            status: tx.status,
            amount: Number(tx.amount),
            balanceAfter: Number(tx.balanceAfter),
            description: tx.description,
            counterparty: tx.counterparty,
            date: tx.createdAt,
            accountNumber: tx.account?.accountNumber || null
        }));

        res.json(txs);
    } catch (error) {
        console.error('Get local bank transactions error:', error);
        res.status(500).json({ status: 'failed', message: 'Unable to load transactions' });
    }
};

const getLocalBankTransactionById = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const tx = await prisma.bankTransaction.findUnique({
            where: { id: parseInt(id) },
            include: { booking: true, account: true, user: true }
        });
        if (!tx || tx.userId !== userId) return res.status(404).json({ status: 'failed', message: 'Transaction not found' });

        res.json({
            id: tx.id,
            bookingId: tx.bookingId,
            type: tx.type,
            status: tx.status,
            amount: Number(tx.amount),
            balanceAfter: Number(tx.balanceAfter),
            description: tx.description,
            counterparty: tx.counterparty,
            date: tx.createdAt,
            accountNumber: tx.account?.accountNumber || null,
            booking: tx.booking || null
        });
    } catch (error) {
        console.error('Get transaction by id error:', error);
        res.status(500).json({ status: 'failed', message: 'Unable to load transaction' });
    }
};

const getPaymentByBooking = async (req, res) => {
    try {
        const userId = req.user.id;
        const { bookingId } = req.params;
        const booking = await prisma.booking.findUnique({
            where: { id: parseInt(bookingId) },
            include: { payment: true }
        });
        if (!booking) return res.status(404).json({ status: 'failed', message: 'Booking not found' });
        if (booking.userId !== userId) return res.status(403).json({ status: 'failed', message: 'Access denied' });

        const payment = booking.payment || null;
        const transactions = await prisma.bankTransaction.findMany({ where: { bookingId: booking.id } });

        res.json({ payment, transactions });
    } catch (error) {
        console.error('Get payment by booking error:', error);
        res.status(500).json({ status: 'failed', message: 'Unable to load payment details' });
    }
};

module.exports = {
    getLocalBankAccount,
    payWithLocalBank,
    getLocalBankTransactions,
    getLocalBankTransactionById,
    getPaymentByBooking
};
