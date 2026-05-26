import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, ArrowLeft, Loader2 } from 'lucide-react';
import { api } from '@/api';
import { Button } from '@/components/ui/button';
import PaymentDetailModal from '@/components/PaymentDetailModal';

const Notifications = () => {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [txModal, setTxModal] = useState({ open: false, tx: null });

    useEffect(() => {
        const fetchNotifications = async () => {
            try {
                const data = await api.get('/reports/my-notifications');
                setNotifications(data || []);
            } catch (error) {
                console.error('Failed to fetch notifications:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchNotifications();
    }, []);

    return (
        <div className="min-h-screen bg-gray-50 py-10 px-4">
            <div className="max-w-4xl mx-auto">
                <Link to="/" className="inline-flex items-center text-sm text-gray-500 hover:text-primary mb-6">
                    <ArrowLeft size={16} className="mr-2" />
                    Back
                </Link>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-6 border-b flex items-center gap-3">
                        <Bell size={20} className="text-primary" />
                        <h1 className="text-xl font-black text-gray-900">My Notifications</h1>
                    </div>

                    {loading ? (
                        <div className="p-10 text-center">
                            <Loader2 className="animate-spin inline-block mr-2" />
                            Loading notifications...
                        </div>
                    ) : notifications.length === 0 ? (
                        <div className="p-10 text-center text-gray-500">
                            No notifications yet.
                        </div>
                    ) : (
                        <div className="divide-y">
                            {notifications.map((n) => (
                                    <div key={n.id} className="p-5 hover:bg-gray-50 transition-colors cursor-pointer" onClick={async () => {
                                        try {
                                            if (typeof n.id === 'string' && n.id.startsWith('db-')) {
                                                const nid = parseInt(n.id.replace('db-', ''), 10);
                                                if (!isNaN(nid)) await api.patch(`/reports/notifications/${nid}/read`, {});
                                            } else if (typeof n.id === 'number') {
                                                await api.patch(`/reports/notifications/${n.id}/read`, {});
                                            }
                                            // Optimistically update local state
                                            setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, isRead: true } : x));
                                        } catch (markErr) {
                                            console.error('Failed to mark notification read', markErr);
                                        }

                                        if (n.category === 'Payment' || n.category === 'Refund') {
                                            try {
                                                const txs = await api.get('/reports/transactions');
                                                let found = null;
                                                const txMatch = (n.message || '').match(/tx-(\d+)/i);
                                                if (txMatch) {
                                                    const id = parseInt(txMatch[1], 10);
                                                    found = txs.find(t => t.id === id || t.transactionRef === `TX-${id}`);
                                                }
                                                if (!found) {
                                                    const bookingMatch = (n.message || '').match(/booking\s*(?:#|id\s*)?(\d+)/i);
                                                    if (bookingMatch) {
                                                        const bId = parseInt(bookingMatch[1], 10);
                                                        found = txs.find(t => t.bookingId === bId || (t.booking && t.booking.id === bId));
                                                    }
                                                }
                                                if (!found) found = txs.find(t => t.type === 'PAYMENT' || t.type === 'REFUND');
                                                if (found) setTxModal({ open: true, tx: found });
                                                else window.location.href = '/payment';
                                            } catch (err) {
                                                console.error(err);
                                                window.location.href = '/payment';
                                            }
                                        } else if (n.category === 'Maintenance') window.location.href = '/fleet';
                                        else if (n.category === 'Booking') window.location.href = '/my-bookings';
                                        else window.location.href = '/profile';
                                    }}>
                                        <p className="text-sm text-gray-900">{n.message}</p>
                                        <p className="text-xs text-gray-500 mt-1">{new Date(n.createdAt).toLocaleString()}</p>
                                    </div>
                                ))}
                        </div>
                    )}
                </div>

                <div className="mt-6">
                    <Link to="/my-bookings">
                        <Button variant="outline">Go to My Rentals</Button>
                    </Link>
                </div>
            </div>
            <PaymentDetailModal open={txModal.open} onOpenChange={(open) => { if (!open) setTxModal({ open: false, tx: null }); }} transaction={txModal.tx} />
        </div>
    );
};

export default Notifications;
