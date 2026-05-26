import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';

const Payments = () => {
    const [loading, setLoading] = useState(true);
    const [transactions, setTransactions] = useState([]);
    const [bankAccount, setBankAccount] = useState(null);

    const fetchAccount = async () => {
        try {
            const res = await api.get('/payment/local-bank/account');
            setBankAccount(res.account || null);
        } catch (error) {
            console.error('Failed to load account', error);
        }
    };

    const fetchTransactions = async () => {
        try {
            setLoading(true);
            const data = await api.get('/payment/local-bank/transactions');
            setTransactions(data);
        } catch (error) {
            console.error('Failed to load transactions', error);
            toast.error('Unable to load transactions');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAccount();
        fetchTransactions();
    }, []);

    return (
        <div className="max-w-4xl mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Payment History</h1>
            </div>

            <div className="bg-white border rounded shadow-sm">
                {bankAccount && (
                    <div className="p-4 border-b">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-sm text-muted-foreground">Account Number</div>
                                <div className="font-medium">{bankAccount.accountNumber}</div>
                            </div>
                            <div className="text-right">
                                <div className="text-sm text-muted-foreground">Current Balance</div>
                                <div className="font-medium text-lg">{Number(bankAccount.balance).toLocaleString()} ETB</div>
                            </div>
                        </div>
                    </div>
                )}
                <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="p-3 text-left">Date</th>
                            <th className="p-3 text-left">Type</th>
                            <th className="p-3 text-right">Amount (ETB)</th>
                            <th className="p-3 text-right">Balance After</th>
                            <th className="p-3 text-left">Booking</th>
                            <th className="p-3 text-left">Description</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={6} className="p-6 text-center">Loading...</td></tr>
                        ) : transactions.length === 0 ? (
                            <tr><td colSpan={6} className="p-6 text-center">No transactions found.</td></tr>
                        ) : transactions.map(tx => (
                            <tr key={tx.id} className="border-t">
                                <td className="p-3">{format(new Date(tx.date), 'PPpp')}</td>
                                <td className="p-3">{tx.type}</td>
                                <td className="p-3 text-right">{Number(tx.amount).toLocaleString()}</td>
                                <td className="p-3 text-right">{Number(tx.balanceAfter).toLocaleString()}</td>
                                <td className="p-3">{tx.bookingId ? <a href={`/bookings/${tx.bookingId}`} className="text-primary underline">#{tx.bookingId}</a> : '-'}</td>
                                <td className="p-3">{tx.description || '-'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Payments;
