import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, Download, Home, FileText, Loader2, Briefcase } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api } from '@/api';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

const Confirmation = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [booking, setBooking] = useState(null);
    const [loading, setLoading] = useState(true);
    const [paymentError, setPaymentError] = useState('');

    useEffect(() => {
        const fetchBooking = async () => {
            const bookingIdFromQuery = searchParams.get('bookingId');
            const txRef = searchParams.get('tx_ref');
            const status = searchParams.get('status');
            const bookingId = bookingIdFromQuery || sessionStorage.getItem('lastBookingId');

            try {
                if (status && String(status).toLowerCase() !== 'success') {
                    setPaymentError('Payment was cancelled or failed. Please try again.');
                    setLoading(false);
                    return;
                }

                if (bookingId && txRef) {
                    await api.get('/bookings/payments/chapa/verify', {
                        params: { bookingId, tx_ref: txRef }
                    });
                }

                if (!bookingId) {
                    setLoading(false);
                    return;
                }

                const data = await api.get(`/bookings/${bookingId}`);
                setBooking(data);
            } catch (error) {
                console.error('Failed to fetch booking:', error);
                const message = error.message || 'Payment verification failed. Please contact support.';
                setPaymentError(message);
                toast.error(message);
            } finally {
                setLoading(false);
            }
        };
        fetchBooking();
    }, [searchParams]);

    const handleDownloadReceipt = () => {
        if (!booking) return;

        try {
            const doc = new jsPDF();

            // Header
            doc.setFontSize(22);
            doc.text('TEDDY CAR RENTAL', 105, 20, { align: 'center' });
            doc.setFontSize(14);
            doc.text('Payment Receipt', 105, 30, { align: 'center' });

            // Content
            doc.setFontSize(10);
            const ref = booking?.id?.toString().padStart(5, '0') || 'N/A';
            doc.text(`Reference: #BK-${ref}`, 20, 50);
            doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, 55);

            autoTable(doc, {
                startY: 65,
                head: [['Description', 'Details']],
                body: [
                    ['Type', booking?.package ? 'Package Booking' : 'Car Rental'],
                    ['Package', booking?.package?.name || 'N/A'],
                    ['Vehicle', booking?.car ? `${booking?.car?.make} ${booking?.car?.model}` : 'N/A'],
                    ['Registration', booking?.car?.plateNumber || 'N/A'],
                    ['Rental Period', `${booking?.startDate ? new Date(booking.startDate).toLocaleDateString() : 'N/A'} - ${booking?.endDate ? new Date(booking.endDate).toLocaleDateString() : 'N/A'}`],
                    ['Total Amount', `${booking?.totalAmount?.toLocaleString() || '0'} ETB`],
                    ['Status', 'PAID']
                ],
                theme: 'striped',
                headStyles: { fillColor: [48, 213, 200] }
            });

            const finalY = doc.lastAutoTable?.finalY || 150;
            doc.text('Thank you for choosing Teddy Car Rental!', 105, finalY + 20, { align: 'center' });

            doc.save(`Receipt_BK_${ref}.pdf`);
            toast.success(t('booking.confirmation.receiptSuccess'));
        } catch (error) {
            console.error('Receipt generation failed:', error);
            toast.error(t('booking.confirmation.receiptError'));
        }
    };

    const handleDownloadAgreement = () => {
        if (!booking) return;

        try {
            const doc = new jsPDF();

            doc.setFontSize(18);
            doc.text('RENTAL AGREEMENT', 105, 25, { align: 'center' });

            doc.setFontSize(12);
            doc.text('Terms and Conditions', 20, 45);
            doc.setFontSize(10);
            const terms = [
                "1. The vehicle must be returned in the same condition as received.",
                "2. Smoking and pets are strictly prohibited inside the vehicle.",
                "3. The renter is responsible for any traffic violations during the period.",
                "4. Late returns will incur additional hourly charges.",
                "5. The vehicle is covered by comprehensive insurance with a deductible."
            ];

            let y = 55;
            terms.forEach(term => {
                doc.text(term, 20, y);
                y += 7;
            });

            // Get name from profile or fallback
            const profile = booking.user?.customerProfile;
            const customerName = profile ? `${profile.firstName} ${profile.lastName}` : 'Valued Customer';

            autoTable(doc, {
                startY: y + 10,
                head: [['Customer Details', 'Reference']],
                body: [
                    ['Name', customerName],
                    ['Booking ID', `#BK-${booking?.id?.toString().padStart(5, '0') || 'N/A'}`],
                    ['Type', booking?.package ? 'Package Booking' : 'Car Rental'],
                    ['Package', booking?.package?.name || 'N/A'],
                    ['Vehicle', booking?.car ? `${booking?.car?.make} ${booking?.car?.model}` : 'N/A']
                ],
                theme: 'grid'
            });

            const finalY = doc.lastAutoTable?.finalY || 200;
            doc.setFontSize(10);
            doc.setFont('helvetica', 'italic');
            doc.text('This document is electronically generated and accepted at the time of booking.', 105, finalY + 20, { align: 'center' });

            doc.save(`Agreement_BK_${booking?.id || 'Ref'}.pdf`);
            toast.success(t('booking.confirmation.agreementSuccess'));
        } catch (error) {
            console.error('Agreement generation failed:', error);
            toast.error(t('booking.confirmation.agreementError'));
        }
    };

    if (loading) {
        return (
            <div className="min-h-[80vh] flex items-center justify-center">
                <Loader2 className="animate-spin text-primary h-12 w-12" />
            </div>
        );
    }

    return (
        <div className="min-h-[80vh] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl p-8 max-w-lg w-full text-center border border-gray-100 animate-in fade-in zoom-in duration-500">
                <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-green-100 mb-6 shadow-inner">
                    <CheckCircle className="h-10 w-10 text-green-600 animate-bounce" />
                </div>

                <h2 className="font-display text-3xl font-extrabold text-gray-900 mb-2">{t('booking.confirmation.title')}</h2>
                {paymentError ? (
                    <p className="text-red-600 mb-8">{paymentError}</p>
                ) : (
                    <p className="text-gray-500 mb-8">
                        {t('booking.confirmation.successDesc')}
                    </p>
                )}

                <div className="bg-gray-50 rounded-2xl p-6 mb-8 text-left space-y-4 border border-gray-100">
                    <div className="flex justify-between items-center">
                        <span className="text-gray-500 font-medium">{t('booking.confirmation.reference')}</span>
                        <span className="font-mono font-bold text-primary bg-primary/5 px-3 py-1 rounded-lg">
                            #BK-{booking?.id?.toString().padStart(5, '0') || 'N/A'}
                        </span>
                    </div>
                    {booking?.package ? (
                        <>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-500 font-medium">{t('booking.confirmation.package')}</span>
                                <span className="font-semibold text-gray-900">{booking.package.name}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-500 font-medium">{t('booking.confirmation.category')}</span>
                                <span className="font-semibold text-gray-900">{booking.package.category}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-500 font-medium">{t('booking.confirmation.duration')}</span>
                                <span className="font-semibold">{booking.package.period}</span>
                            </div>
                        </>
                    ) : (
                        <div className="flex justify-between items-center">
                            <span className="text-gray-500 font-medium">{t('booking.confirmation.vehicle')}</span>
                            <span className="font-semibold text-gray-900">{booking?.car ? `${booking.car.make} ${booking.car.model}` : 'N/A'}</span>
                        </div>
                    )}
                    <div className="flex justify-between items-center">
                        <span className="text-gray-500 font-medium">{t('booking.confirmation.pickupDate')}</span>
                        <span className="font-semibold">{booking?.startDate ? new Date(booking.startDate).toLocaleDateString() : 'N/A'}</span>
                    </div>
                    <div className="flex justify-between items-center pt-3 border-t border-gray-200">
                        <span className="text-gray-500 font-medium text-sm">{t('booking.confirmation.amountPaid')}</span>
                        <span className="font-bold text-emerald-600">{booking?.totalAmount?.toLocaleString() || '0'} ETB</span>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="flex gap-4">
                        <Button
                            variant="outline"
                            onClick={handleDownloadReceipt}
                            className="flex-1 py-6 rounded-xl border-gray-200 hover:bg-gray-50"
                        >
                            <Download size={18} className="mr-2" />
                            {t('booking.confirmation.receipt')}
                        </Button>
                        <Button
                            variant="outline"
                            onClick={handleDownloadAgreement}
                            className="flex-1 py-6 rounded-xl border-gray-200 hover:bg-gray-50"
                        >
                            <FileText size={18} className="mr-2" />
                            {t('booking.confirmation.agreement')}
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Link to="/my-bookings" className="block">
                            <Button variant="outline" className="w-full py-6 rounded-xl text-lg border-gray-200 hover:bg-gray-50 flex items-center justify-center">
                                <Briefcase size={18} className="mr-2" />
                                {t('booking.confirmation.viewMyRentals')}
                            </Button>
                        </Link>
                        <Link to="/" className="block">
                            <Button className="w-full py-6 rounded-xl text-lg shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all flex items-center justify-center">
                                <Home size={18} className="mr-2" />
                                {t('booking.confirmation.returnToFleet')}
                            </Button>
                        </Link>
                    </div>

                    <button
                        onClick={() => {
                            sessionStorage.clear();
                            navigate('/login');
                        }}
                        className="block w-full text-sm text-gray-400 hover:text-gray-900 mt-6 transition-colors"
                    >
                        {t('booking.confirmation.signOut')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Confirmation;
