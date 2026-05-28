import React, { useState, useEffect } from 'react';
import { api } from '@/api';
import { useNavigate } from 'react-router-dom';
import {
    Car,
    Package,
    Calendar,
    Clock,
    CheckCircle2,
    XCircle,
    AlertCircle,
    ChevronRight,
    Search,
    ArrowLeft,
    MapPin,
    CreditCard,
    User as UserIcon,
    Shield
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

const StatusBadge = ({ status }) => {
    const { t } = useTranslation();
    const statusConfig = {
        PENDING: { color: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: Clock, label: t('booking.status.PENDING') },
        VERIFIED: { color: 'bg-blue-100 text-blue-700 border-blue-200', icon: CheckCircle2, label: t('booking.status.VERIFIED') },
        APPROVED: { color: 'bg-indigo-100 text-indigo-700 border-indigo-200', icon: CheckCircle2, label: t('booking.status.APPROVED') },
        PAID: { color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: CheckCircle2, label: t('booking.status.PAID') },
        ACTIVE: { color: 'bg-green-100 text-green-700 border-green-200', icon: Car, label: t('booking.status.ACTIVE') },
        COMPLETED: { color: 'bg-gray-100 text-gray-700 border-gray-200', icon: CheckCircle2, label: t('booking.status.COMPLETED') },
        CANCELLED: { color: 'bg-red-100 text-red-700 border-red-200', icon: XCircle, label: t('booking.status.CANCELLED') },
        REJECTED: { color: 'bg-orange-100 text-orange-700 border-orange-200', icon: AlertCircle, label: t('booking.status.REJECTED') },
    };

    const config = statusConfig[status] || statusConfig.PENDING;
    const Icon = config.icon;

    return (
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${config.color}`}>
            <Icon size={14} />
            {config.label}
        </span>
    );
};

const BookingProgressTracker = ({ status }) => {
    const { t } = useTranslation();
    const stages = [
        { key: 'SUBMITTED', label: t('booking.stages.SUBMITTED'), statuses: ['PENDING', 'VERIFIED', 'APPROVED', 'PAID', 'ACTIVE', 'COMPLETED'] },
        { key: 'VERIFICATION', label: t('booking.stages.VERIFIED'), statuses: ['VERIFIED', 'APPROVED', 'PAID', 'ACTIVE', 'COMPLETED'], failStatuses: ['REJECTED'] },
        { key: 'APPROVAL', label: t('booking.stages.APPROVED'), statuses: ['APPROVED', 'PAID', 'ACTIVE', 'COMPLETED'] },
        { key: 'ACTIVE', label: t('booking.stages.TRIP_STARTED'), statuses: ['ACTIVE', 'COMPLETED'] },
        { key: 'COMPLETED', label: t('booking.status.COMPLETED'), statuses: ['COMPLETED'] }
    ];

    const currentIdx = stages.reduce((lastIdx, stage, idx) =>
        stage.statuses.includes(status) ? idx : lastIdx, -1);
    const isError = status === 'REJECTED' || status === 'CANCELLED';

    return (
        <div className="py-8">
            <div className="relative flex justify-between">
                {/* Progress Line */}
                <div className="absolute top-5 left-0 w-full h-0.5 bg-gray-100 -z-0"></div>
                <div
                    className={`absolute top-5 left-0 h-0.5 transition-all duration-1000 -z-0 ${isError ? 'bg-red-500' : 'bg-primary'}`}
                    style={{ width: `${Math.max(0, currentIdx) * 25}%` }}
                ></div>

                {stages.map((stage, idx) => {
                    const isCompleted = idx < currentIdx;
                    const isActive = idx === currentIdx;
                    const isFailed = stage.failStatuses?.includes(status);

                    return (
                        <div key={stage.key} className="relative z-10 flex flex-col items-center gap-3 px-2">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center border-4 transition-all duration-500 shadow-sm ${isFailed ? 'bg-orange-500 border-orange-100 text-white animate-bounce' :
                                isCompleted ? 'bg-primary border-primary/20 text-white' :
                                    isActive ? 'bg-white border-primary text-primary scale-110 ring-4 ring-primary/10' :
                                        'bg-white border-gray-100 text-gray-300'
                                }`}>
                                {isFailed ? <XCircle size={18} /> :
                                    isCompleted ? <CheckCircle2 size={18} /> :
                                        idx + 1}
                            </div>
                            <span className={`text-[10px] font-bold uppercase tracking-widest ${isFailed ? 'text-orange-600' :
                                isCompleted || isActive ? 'text-gray-900' : 'text-gray-400'
                                }`}>
                                {isFailed ? t('booking.issueFound') : stage.label}
                            </span>
                        </div>
                    );
                })}
            </div>

            {status === 'REJECTED' && (
                <div className="mt-8 p-4 bg-orange-50 border border-orange-100 rounded-xl flex items-start gap-3">
                    <AlertCircle className="text-orange-500 shrink-0" size={20} />
                    <div>
                        <p className="text-sm font-bold text-orange-900">Action Required</p>
                        <p className="text-xs text-orange-700 mt-0.5">Your documents were not verified. Please contact support or re-upload your ID/License.</p>
                    </div>
                </div>
            )}
        </div>
    );
};

const MyBookings = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedBooking, setSelectedBooking] = useState(null);
    const [detailsOpen, setDetailsOpen] = useState(false);

    const CANCELLABLE_STATUSES = ['PENDING', 'VERIFIED', 'APPROVED', 'PAID'];

    useEffect(() => {
        const fetchBookings = async () => {
            try {
                const data = await api.get('/bookings/my');
                setBookings(data);
            } catch (error) {
                console.error('Failed to fetch bookings:', error);
                toast.error(t('booking.failedToLoad'));
            } finally {
                setLoading(false);
            }
        };
        fetchBookings();
    }, []);

    const openDetails = (booking) => {
        setSelectedBooking(booking);
        setDetailsOpen(true);
    };

    const canCancelBooking = (booking) => {
        if (!booking) return false;
        return CANCELLABLE_STATUSES.includes(booking.status);
    };

    const canDeleteBooking = (booking) => {
        if (!booking) return false;
        return ['COMPLETED', 'CANCELLED'].includes(booking.status);
    };

    const handleCancelBooking = () => {
        if (!selectedBooking) return;
        navigate(`/bookings/${selectedBooking.id}/cancel`);
    };

    const handleDeleteBooking = async () => {
        if (!selectedBooking || !canDeleteBooking(selectedBooking)) {
            return;
        }

        const confirmed = window.confirm('Delete this booking from your rentals history? This action cannot be undone.');
        if (!confirmed) {
            return;
        }

        try {
            await api.delete(`/bookings/${selectedBooking.id}`);
            setBookings((prev) => prev.filter((b) => b.id !== selectedBooking.id));
            setDetailsOpen(false);
            setSelectedBooking(null);
            toast.success('Booking deleted successfully');
        } catch (error) {
            console.error('Failed to delete booking:', error);
            toast.error(error.message || 'Failed to delete booking');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50/50">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-gray-500 font-medium">{t('auth.loading')}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50/50 pb-20">
            {/* Header */}
            <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div>
                            <Link to="/" className="inline-flex items-center text-sm text-gray-500 hover:text-primary transition-colors mb-4 group">
                                <ArrowLeft size={16} className="mr-2 group-hover:-translate-x-1 transition-transform" />
                                {t('fleet.backHome')}
                            </Link>
                            <h1 className="text-4xl font-display font-extrabold text-gray-900 tracking-tight">
                                {t('booking.myRentals')}
                            </h1>
                            <p className="mt-2 text-gray-500 text-lg">{t('booking.trackTrips')}</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="relative flex-grow md:w-64">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input
                                    type="text"
                                    placeholder={t('booking.searchRef')}
                                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                {bookings.length === 0 ? (
                    <div className="bg-white rounded-3xl p-16 text-center border border-dashed border-gray-200 shadow-sm">
                        <div className="mx-auto w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                            <Car size={40} className="text-gray-300" />
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900 mb-2">{t('booking.noRentals')}</h3>
                        <p className="text-gray-500 mb-8 max-w-sm mx-auto">
                            {t('booking.noRentalsDesc')}
                        </p>
                        <Link to="/">
                            <Button className="rounded-xl px-8 py-6 text-lg shadow-xl shadow-primary/20 hover:shadow-primary/40 transition-all">
                                {t('booking.exploreFleet')}
                            </Button>
                        </Link>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {bookings.map((booking) => (
                            <div
                                key={booking.id}
                                className="group bg-card rounded-2xl border border-border hover:border-primary/20 hover:shadow-lg transition-all duration-300 overflow-hidden"
                            >
                                <div className="flex items-center gap-5 p-5">
                                    {/* Car Image/Icon */}
                                    <div className="relative w-36 h-28 rounded-xl bg-muted flex items-center justify-center overflow-hidden shrink-0">
                                        {booking.package ? (
                                            <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex flex-col items-center justify-center p-3">
                                                <Package size={30} className="text-primary mb-1" />
                                                <span className="text-xs font-bold text-primary text-center leading-tight">{booking.package.name}</span>
                                            </div>
                                        ) : booking.car?.imageUrl ? (
                                            <img
                                                src={api.getImageUrl(booking.car.imageUrl)}
                                                alt={booking.car.model}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                            />
                                        ) : (
                                            <Car size={36} className="text-muted-foreground" />
                                        )}
                                        <div className="absolute top-2 left-2">
                                            <StatusBadge status={booking.status} />
                                        </div>
                                    </div>

                                    {/* Details row */}
                                    <div className="flex-1 flex items-center gap-6 min-w-0">

                                        {/* Reference */}
                                        <div className="shrink-0">
                                            <p className="text-xs font-bold text-primary uppercase tracking-widest mb-1">{t('booking.reference')}</p>
                                            <p className="text-base font-mono font-bold text-foreground">#BK-{booking.id.toString().padStart(5, '0')}</p>
                                        </div>

                                        <div className="w-px h-10 bg-border shrink-0" />

                                        {/* Vehicle */}
                                        <div className="shrink-0 min-w-0">
                                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">{t('booking.vehicle')}</p>
                                            <p className="text-base font-bold text-foreground truncate max-w-[140px]">
                                                {booking.package ? booking.package.name : `${booking.car?.make} ${booking.car?.model}`}
                                            </p>
                                            <p className="text-xs text-muted-foreground mt-0.5">
                                                {booking.package ? `${booking.package.category} Package` : booking.car?.plateNumber}
                                            </p>
                                        </div>

                                        <div className="w-px h-10 bg-border shrink-0" />

                                        {/* Rental Period */}
                                        <div className="shrink-0">
                                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">{t('booking.rentalPeriod')}</p>
                                            <p className="text-sm font-semibold text-foreground whitespace-nowrap">
                                                {new Date(booking.startDate).toLocaleDateString()} → {new Date(booking.endDate).toLocaleDateString()}
                                            </p>
                                            {booking.actualReturnDate && (
                                                <p className="text-xs text-red-500 mt-0.5">Returned: {new Date(booking.actualReturnDate).toLocaleDateString()}</p>
                                            )}
                                        </div>

                                        <div className="w-px h-10 bg-border shrink-0" />

                                        {/* Total */}
                                        <div className="shrink-0">
                                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">{t('booking.totalAmount')}</p>
                                            <p className="text-base font-black text-foreground whitespace-nowrap">
                                                {booking.totalAmount?.toLocaleString()} <span className="text-xs font-bold text-muted-foreground">ETB</span>
                                            </p>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-2 shrink-0 border-l border-border pl-5">
                                        {booking.status === 'VERIFIED' && !booking.payment && (
                                            <Button
                                                onClick={() => navigate(`/payment?carId=${booking.carId || ''}&packageId=${booking.packageId || ''}&bookingId=${booking.id}`)}
                                                className="rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold text-sm px-4 py-2 h-auto"
                                            >
                                                Pay Now
                                            </Button>
                                        )}
                                        {booking.status === 'VERIFIED' && booking.payment && (
                                            <Button variant="outline" disabled className="rounded-xl font-bold text-sm px-4 py-2 h-auto">
                                                Pending
                                            </Button>
                                        )}
                                        {booking.status === 'PENDING' && (
                                            <Button
                                                onClick={() => navigate(`/pending-verification?bookingId=${booking.id}`)}
                                                variant="outline"
                                                className="rounded-xl font-bold text-sm px-4 py-2 h-auto"
                                            >
                                                Check Status
                                            </Button>
                                        )}
                                        <Button
                                            onClick={() => openDetails(booking)}
                                            className="rounded-xl font-bold text-sm px-4 py-2 h-auto"
                                        >
                                            {t('booking.details')}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Detailed Booking Dialog */}
            <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
                <DialogContent className="max-w-2xl overflow-hidden p-0 rounded-3xl border-none">
                    <div className="max-h-[85vh] overflow-y-auto">
                        <DialogHeader className="p-8 bg-gray-900 text-white relative">
                            <div className="absolute top-0 right-0 p-8 opacity-10">
                                <Car size={160} />
                            </div>
                            <DialogTitle className="text-2xl font-black tracking-tight mb-2">{t('booking.statusTracker')}</DialogTitle>
                            <DialogDescription className="text-gray-400">
                                {t('booking.realTimeUpdate')} #BK-{selectedBooking?.id?.toString().padStart(5, '0')}
                            </DialogDescription>
                        </DialogHeader>

                        <div className="p-8">
                            {/* Visual Tracker */}
                            <BookingProgressTracker status={selectedBooking?.status} />

                            <Separator className="my-8 opacity-50" />

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-6">
                                    {/* Vehicle Card */}
                                    <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
                                        <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2">
                                            <Car size={14} className="text-primary" /> {selectedBooking?.package ? t('booking.packageInfo') : t('booking.vehicleInfo')}
                                        </h4>
                                        {selectedBooking?.package ? (
                                            <div className="space-y-3">
                                                <div>
                                                    <p className="font-bold text-gray-900 text-lg">{selectedBooking.package.name}</p>
                                                    <p className="text-sm text-gray-500 mt-0.5">{t(`search.${selectedBooking.package.category.toLowerCase()}`)}</p>
                                                    <p className="text-xs font-bold text-primary bg-primary/5 inline-block px-2 py-0.5 rounded mt-2 uppercase tracking-tighter">
                                                        {selectedBooking.package.period}
                                                    </p>
                                                </div>
                                                {selectedBooking.package.features && selectedBooking.package.features.length > 0 && (
                                                    <div className="pt-2 border-t border-gray-200">
                                                        <p className="text-xs font-medium text-gray-500 mb-2">{t('booking.includes')}</p>
                                                        <ul className="space-y-1">
                                                            {selectedBooking.package.features.slice(0, 3).map((feature, idx) => (
                                                                <li key={idx} className="text-xs text-gray-600 flex items-center gap-1">
                                                                    <CheckCircle2 size={10} className="text-green-500" />
                                                                    {feature}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="flex gap-4">
                                                <div className="w-20 h-20 rounded-xl bg-white flex items-center justify-center overflow-hidden border border-gray-100 shrink-0">
                                                    {selectedBooking?.car?.imageUrl && (
                                                        <img src={api.getImageUrl(selectedBooking.car.imageUrl)} alt="Car" className="w-full h-full object-cover" />
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-gray-900">{selectedBooking?.car?.make} {selectedBooking?.car?.model}</p>
                                                    <p className="text-sm text-gray-500 mt-0.5">Plate: {selectedBooking?.car?.plateNumber}</p>
                                                    <p className="text-xs font-bold text-primary bg-primary/5 inline-block px-2 py-0.5 rounded mt-2 uppercase tracking-tighter">
                                                        {t(`search.${selectedBooking?.car?.category.toLowerCase()}`)}
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Location Info */}
                                    <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
                                        <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2">
                                            <MapPin size={14} className="text-primary" /> {t('booking.pickupLocation')}
                                        </h4>
                                        <p className="text-sm font-medium text-gray-700 leading-relaxed">
                                            {selectedBooking?.pickupLocation || 'Main Office, Addis Ababa'}
                                        </p>
                                        <div className="mt-3">
                                            {selectedBooking?.isDelivery ? (
                                                <Badge className="bg-orange-100 text-orange-800 border-orange-200">{t('booking.deliveryPickup')}</Badge>
                                            ) : (
                                                <Badge className="bg-green-100 text-green-800 border-green-200">{t('booking.officeBranch')}</Badge>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    {/* Support / Assistant Info */}
                                    <div className="bg-primary/5 rounded-2xl p-5 border border-primary/10">
                                        <h4 className="text-[10px] font-black uppercase tracking-widest text-primary mb-4 flex items-center gap-2">
                                            <UserIcon size={14} /> {t('booking.assignedPersonnel')}
                                        </h4>
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center border border-primary/20 text-primary">
                                                    <Shield size={20} />
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-400 font-bold uppercase">{t('booking.companyAgent')}</p>
                                                    <p className="font-bold text-gray-900 text-sm">TEDDY-ADMIN-01</p>
                                                </div>
                                            </div>

                                            {selectedBooking?.assignedDriver && (
                                                <div className="flex items-center gap-3 pt-2 border-t border-primary/10 animate-in fade-in slide-in-from-top-2">
                                                    <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center border border-primary/20 text-primary">
                                                        <Car size={20} />
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-gray-400 font-bold uppercase">{t('booking.deliveryDriver')}</p>
                                                        <p className="font-bold text-gray-900 text-sm">{selectedBooking.assignedDriver}</p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Payment Info */}
                                    <div className="bg-orange-50 rounded-2xl p-5 border border-orange-100">
                                        <h4 className="text-[10px] font-black uppercase tracking-widest text-orange-600 mb-4 flex items-center gap-2">
                                            <CreditCard size={14} /> Payment Information
                                        </h4>
                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-gray-500">Rental Amount</span>
                                                <span className="font-bold text-gray-900">{selectedBooking?.totalAmount?.toLocaleString()} ETB</span>
                                            </div>
                                            {selectedBooking?.penaltyAmount && parseFloat(selectedBooking.penaltyAmount) > 0 && (
                                                <div className="flex justify-between items-center text-sm pt-2 border-t border-orange-200">
                                                    <span className="text-red-500 font-bold">Late Return Penalty</span>
                                                    <span className="font-bold text-red-600">{parseFloat(selectedBooking.penaltyAmount).toLocaleString()} ETB</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Cancellation Policy */}
                                    <div className="bg-blue-50 rounded-2xl p-5 border border-blue-100">
                                        <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-700 mb-3">
                                            Cancellation Policy
                                        </h4>
                                        <p className="text-sm text-blue-900 leading-relaxed">
                                            Cancellation must happen within 24 hours before the rental start date to get a full refund.
                                            Late cancellations may be subject to a cancellation fee.
                                        </p>
                                    </div>

                                    {/* Contact Support */}
                                    <div className="bg-white rounded-2xl p-5 border border-dashed border-gray-200">
                                        <p className="text-xs text-center text-gray-400 font-medium">
                                            {t('booking.needHelp')}:
                                            <span className="block text-primary font-black mt-1 text-base">+251 911 22 33 44</span>
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 bg-gray-50 border-t flex justify-between items-center gap-3">
                        <p className="text-xs text-gray-500">
                            {canCancelBooking(selectedBooking)
                                ? 'You can cancel this booking from here.'
                                : 'Cancellation is not available for this booking status.'}
                        </p>
                        <div className="flex items-center gap-3">
                            <Button
                                onClick={handleDeleteBooking}
                                disabled={!canDeleteBooking(selectedBooking)}
                                variant="outline"
                                className="rounded-xl px-8 font-bold text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                            >
                                Delete Rental
                            </Button>
                            <Button
                                onClick={handleCancelBooking}
                                disabled={!canCancelBooking(selectedBooking)}
                                variant="destructive"
                                className="rounded-xl px-8 font-bold"
                            >
                                Cancel Rental
                            </Button>
                            <Button onClick={() => setDetailsOpen(false)} variant="outline" className="rounded-xl px-8 font-bold">
                                {t('booking.close')}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default MyBookings;
