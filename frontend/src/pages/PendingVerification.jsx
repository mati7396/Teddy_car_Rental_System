import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Clock, FileCheck, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { api } from '@/api';
import { toast } from 'sonner';

const PendingVerification = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [booking, setBooking] = useState(null);
    const [loading, setLoading] = useState(true);
    const [checking, setChecking] = useState(false);

    const bookingId = searchParams.get('bookingId');

    useEffect(() => {
        if (!bookingId) {
            navigate('/');
            return;
        }
        fetchBookingStatus();
    }, [bookingId]);

    const fetchBookingStatus = async () => {
        try {
            const data = await api.get(`/bookings/${bookingId}`);
            setBooking(data);
            
            // If verified, redirect to payment
            if (data.status === 'VERIFIED') {
                toast.success('Documents verified! Proceeding to payment...');
                const carId = data.carId;
                const packageId = data.packageId;
                navigate(`/payment?carId=${carId || ''}&packageId=${packageId || ''}&bookingId=${bookingId}`);
            }
            
            // If rejected, show error
            if (data.status === 'REJECTED') {
                toast.error('Documents were rejected. Please contact support.');
            }
        } catch (error) {
            console.error('Failed to fetch booking:', error);
            toast.error('Failed to load booking status');
        } finally {
            setLoading(false);
            setChecking(false);
        }
    };

    const handleCheckStatus = () => {
        setChecking(true);
        fetchBookingStatus();
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
            <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl p-8 md:p-12">
                <div className="text-center">
                    {booking?.status === 'PENDING' && (
                        <>
                            <div className="mx-auto w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mb-6 animate-pulse">
                                <Clock className="text-yellow-600" size={40} />
                            </div>
                            <h1 className="text-3xl font-bold text-gray-900 mb-4">
                                Documents Under Review
                            </h1>
                            <p className="text-gray-600 text-lg mb-8">
                                Your ID card and driver's license are being verified by our team. 
                                This usually takes 5-15 minutes.
                            </p>
                        </>
                    )}

                    {booking?.status === 'REJECTED' && (
                        <>
                            <div className="mx-auto w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6">
                                <AlertCircle className="text-red-600" size={40} />
                            </div>
                            <h1 className="text-3xl font-bold text-gray-900 mb-4">
                                Documents Rejected
                            </h1>
                            <p className="text-gray-600 text-lg mb-8">
                                Unfortunately, your documents could not be verified. 
                                Please contact our support team for assistance.
                            </p>
                        </>
                    )}

                    <div className="bg-gray-50 rounded-xl p-6 mb-8">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-sm font-medium text-gray-600">Booking Reference</span>
                            <span className="text-sm font-bold text-gray-900">#{booking?.id}</span>
                        </div>
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-sm font-medium text-gray-600">Status</span>
                            <span className={`text-sm font-bold ${
                                booking?.status === 'PENDING' ? 'text-yellow-600' :
                                booking?.status === 'REJECTED' ? 'text-red-600' :
                                'text-green-600'
                            }`}>
                                {booking?.status}
                            </span>
                        </div>
                        {booking?.car && (
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-gray-600">Vehicle</span>
                                <span className="text-sm font-bold text-gray-900">
                                    {booking.car.make} {booking.car.model}
                                </span>
                            </div>
                        )}
                    </div>

                    <div className="space-y-4">
                        <Button 
                            onClick={handleCheckStatus} 
                            disabled={checking}
                            className="w-full py-6 text-lg"
                        >
                            {checking ? (
                                <>
                                    <RefreshCw className="mr-2 animate-spin" size={20} />
                                    Checking Status...
                                </>
                            ) : (
                                <>
                                    <RefreshCw className="mr-2" size={20} />
                                    Check Status
                                </>
                            )}
                        </Button>

                        <Button 
                            variant="outline" 
                            onClick={() => navigate('/my-bookings')}
                            className="w-full py-6 text-lg"
                        >
                            View My Bookings
                        </Button>
                    </div>

                    <p className="text-sm text-gray-500 mt-8">
                        You will be automatically redirected to payment once your documents are verified.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default PendingVerification;
