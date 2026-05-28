import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    Bell, ArrowLeft, Loader2, MessageSquare,
    CreditCard, Wrench, CalendarCheck, Info,
    X, CheckCircle, Car, Package, Calendar, Hash, Wallet
} from 'lucide-react';
import { api } from '@/api';
import { Button } from '@/components/ui/button';

/* ── category icon ─────────────────────────────────────── */
const categoryIcon = (category) => {
    switch (category) {
        case 'Contact':     return <MessageSquare size={16} className="text-primary" />;
        case 'Payment':
        case 'Refund':      return <CreditCard size={16} className="text-emerald-500" />;
        case 'Maintenance': return <Wrench size={16} className="text-orange-500" />;
        case 'Booking':     return <CalendarCheck size={16} className="text-blue-500" />;
        default:            return <Info size={16} className="text-muted-foreground" />;
    }
};

/* ── inline payment detail panel ──────────────────────── */
const PaymentDetail = ({ tx, onClose }) => {
    if (!tx) return null;
    const booking = tx.booking;
    const isRefund = tx.type === 'REFUND';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in duration-200">
                {/* header */}
                <div className={`flex items-center justify-between px-6 py-4 rounded-t-2xl ${isRefund ? 'bg-orange-50 dark:bg-orange-900/20' : 'bg-emerald-50 dark:bg-emerald-900/20'}`}>
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isRefund ? 'bg-orange-100 dark:bg-orange-800' : 'bg-emerald-100 dark:bg-emerald-800'}`}>
                            <CreditCard size={18} className={isRefund ? 'text-orange-600' : 'text-emerald-600'} />
                        </div>
                        <div>
                            <p className="font-bold text-foreground text-sm">
                                {isRefund ? 'Refund Details' : 'Payment Details'}
                            </p>
                            <p className="text-xs text-muted-foreground">TX-{tx.id}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
                        <X size={16} />
                    </button>
                </div>

                {/* body */}
                <div className="px-6 py-5 space-y-4">
                    {/* amount */}
                    <div className="flex items-center justify-between py-3 px-4 bg-muted/40 rounded-xl">
                        <span className="text-sm text-muted-foreground font-medium">Amount</span>
                        <span className={`text-xl font-black ${isRefund ? 'text-orange-600' : 'text-emerald-600'}`}>
                            {isRefund ? '+' : '-'} ETB {Number(tx.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                    </div>

                    {/* status */}
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Status</span>
                        <span className="flex items-center gap-1.5 text-sm font-semibold text-emerald-600">
                            <CheckCircle size={14} /> {tx.status}
                        </span>
                    </div>

                    {/* date */}
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                            <Calendar size={13} /> Date
                        </span>
                        <span className="text-sm font-medium text-foreground">
                            {new Date(tx.date || tx.createdAt).toLocaleString('en-GB', {
                                day: '2-digit', month: 'short', year: 'numeric',
                                hour: '2-digit', minute: '2-digit'
                            })}
                        </span>
                    </div>

                    {/* account */}
                    {tx.accountNumber && (
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                                <Wallet size={13} /> Account
                            </span>
                            <span className="text-sm font-mono text-foreground">{tx.accountNumber}</span>
                        </div>
                    )}

                    {/* balance after */}
                    {tx.balanceAfter !== undefined && (
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Balance After</span>
                            <span className="text-sm font-medium text-foreground">
                                ETB {Number(tx.balanceAfter).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </span>
                        </div>
                    )}

                    {/* description */}
                    {tx.description && (
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Note</span>
                            <span className="text-sm text-foreground text-right max-w-[60%]">{tx.description}</span>
                        </div>
                    )}

                    {/* booking details */}
                    {booking && (
                        <div className="border-t border-border pt-4 space-y-3">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Booking Details</p>

                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                                    <Hash size={13} /> Booking ID
                                </span>
                                <span className="text-sm font-mono font-bold text-foreground">#{booking.id}</span>
                            </div>

                            {booking.car && (
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                                        <Car size={13} /> Vehicle
                                    </span>
                                    <span className="text-sm font-medium text-foreground text-right">
                                        {booking.car.make} {booking.car.model} {booking.car.year}
                                        <br />
                                        <span className="text-xs text-muted-foreground">{booking.car.plateNumber}</span>
                                    </span>
                                </div>
                            )}

                            {booking.package && (
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                                        <Package size={13} /> Package
                                    </span>
                                    <span className="text-sm font-medium text-foreground">{booking.package.name}</span>
                                </div>
                            )}

                            {booking.startDate && (
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground">Rental Period</span>
                                    <span className="text-sm text-foreground text-right">
                                        {new Date(booking.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                        {booking.endDate && ` → ${new Date(booking.endDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`}
                                    </span>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="px-6 pb-5">
                    <Button variant="outline" className="w-full" onClick={onClose}>Close</Button>
                </div>
            </div>
        </div>
    );
};

/* ── main component ────────────────────────────────────── */
const Notifications = () => {
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading]             = useState(true);
    const [txDetail, setTxDetail]           = useState(null);
    const [txLoading, setTxLoading]         = useState(false);

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

    const markRead = async (n) => {
        try {
            if (typeof n.id === 'number') {
                await api.patch(`/reports/notifications/${n.id}/read`, {});
            }
            setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, isRead: true } : x));
        } catch (_) {}
    };

    const handleClick = async (n) => {
        await markRead(n);

        if (n.category === 'Contact') {
            navigate('/my-messages');
            return;
        }

        if (n.category === 'Payment' || n.category === 'Refund') {
            setTxLoading(true);
            try {
                // Extract booking ID from notification message e.g. "Booking #42"
                const bookingMatch = (n.message || '').match(/booking\s*#?(\d+)/i);
                const bookingId = bookingMatch ? parseInt(bookingMatch[1]) : null;

                // Fetch customer's own transactions (no auth restriction)
                const txs = await api.get('/payment/local-bank/transactions');

                let found = null;

                // 1. Match by booking ID (most reliable)
                if (bookingId) {
                    found = txs.find(t => t.bookingId === bookingId);
                }

                // 2. Match by amount mentioned in message
                if (!found) {
                    const amountMatch = (n.message || '').match(/([\d,]+(?:\.\d+)?)\s*ETB/i);
                    if (amountMatch) {
                        const amt = parseFloat(amountMatch[1].replace(/,/g, ''));
                        found = txs.find(t =>
                            Math.abs(Number(t.amount) - amt) < 1 &&
                            (n.category === 'Refund' ? t.type === 'REFUND' : t.type === 'PAYMENT')
                        );
                    }
                }

                // 3. Fall back to most recent matching type
                if (!found) {
                    const type = n.category === 'Refund' ? 'REFUND' : 'PAYMENT';
                    found = txs.find(t => t.type === type);
                }

                if (found) {
                    setTxDetail(found);
                } else {
                    navigate('/payments');
                }
            } catch (err) {
                console.error('Failed to load transaction:', err);
                navigate('/payments');
            } finally {
                setTxLoading(false);
            }
            return;
        }

        if (n.category === 'Booking')     { navigate('/my-bookings'); return; }
        if (n.category === 'Maintenance') { navigate('/fleet');       return; }
        navigate('/profile');
    };

    const unreadCount = notifications.filter(n => !n.isRead).length;

    return (
        <div className="min-h-screen bg-background py-10 px-4">
            <div className="max-w-2xl mx-auto">
                <Link to="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-6 transition-colors">
                    <ArrowLeft size={16} className="mr-2" />
                    Back
                </Link>

                <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
                    <div className="p-6 border-b border-border flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Bell size={20} className="text-primary" />
                            <h1 className="text-xl font-black text-foreground">My Notifications</h1>
                        </div>
                        {unreadCount > 0 && (
                            <span className="text-xs font-semibold bg-primary/10 text-primary px-2.5 py-1 rounded-full">
                                {unreadCount} unread
                            </span>
                        )}
                    </div>

                    {loading ? (
                        <div className="p-10 text-center text-muted-foreground">
                            <Loader2 className="animate-spin inline-block mr-2" />
                            Loading notifications...
                        </div>
                    ) : notifications.length === 0 ? (
                        <div className="p-10 text-center text-muted-foreground">
                            <Bell size={40} className="mx-auto mb-3 opacity-20" />
                            <p className="font-medium">No notifications yet</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-border">
                            {notifications.map((n) => (
                                <div
                                    key={n.id}
                                    onClick={() => handleClick(n)}
                                    className={`flex items-start gap-4 px-5 py-4 cursor-pointer transition-colors hover:bg-muted/50 ${
                                        !n.isRead ? 'bg-primary/5' : ''
                                    }`}
                                >
                                    {/* icon */}
                                    <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                                        !n.isRead ? 'bg-primary/10' : 'bg-muted'
                                    }`}>
                                        {categoryIcon(n.category)}
                                    </div>

                                    {/* content */}
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-sm leading-snug ${!n.isRead ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
                                            {n.message}
                                        </p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <p className="text-xs text-muted-foreground">
                                                {new Date(n.createdAt).toLocaleString()}
                                            </p>
                                            {(n.category === 'Payment' || n.category === 'Refund') && (
                                                <span className="text-xs text-emerald-600 font-medium">
                                                    · Tap to view details
                                                </span>
                                            )}
                                            {n.category === 'Contact' && (
                                                <span className="text-xs text-primary font-medium">
                                                    · Tap to view conversation
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* unread dot or loading spinner */}
                                    {txLoading && (n.category === 'Payment' || n.category === 'Refund') ? (
                                        <Loader2 size={14} className="animate-spin text-muted-foreground flex-shrink-0 mt-2" />
                                    ) : !n.isRead ? (
                                        <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-2" />
                                    ) : null}
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

            {/* Payment detail overlay */}
            {txDetail && (
                <PaymentDetail tx={txDetail} onClose={() => setTxDetail(null)} />
            )}
        </div>
    );
};

export default Notifications;
