import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle, Loader2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const PaymentSuccess = () => {
    const [searchParams] = useSearchParams();
    const [loading, setLoading] = useState(true);
    const [success, setSuccess] = useState(false);
    const [message, setMessage] = useState('Verifying payment...');
    const [receipt, setReceipt] = useState(null);

    useEffect(() => {
        const verify = async () => {
            const bookingId = searchParams.get('bookingId') || sessionStorage.getItem('lastBookingId');

            if (!bookingId) {
                setMessage('Booking reference is missing.');
                setLoading(false);
                return;
            }

            try {
                const receiptRaw = sessionStorage.getItem('latestPaymentReceipt');
                if (receiptRaw) {
                    setReceipt(JSON.parse(receiptRaw));
                }
                setSuccess(true);
                setMessage('Payment successful! Your booking is now paid.');
            } catch (error) {
                console.error('Payment verification error:', error);
                setSuccess(false);
                setMessage(error.message || 'Payment verification failed.');
                toast.error(error.message || 'Payment verification failed');
            } finally {
                setLoading(false);
            }
        };

        verify();
    }, [searchParams]);

    if (loading) {
        return (
            <div className="min-h-[80vh] flex items-center justify-center">
                <Loader2 className="animate-spin text-primary h-12 w-12" />
            </div>
        );
    }

    return (
        <div className="min-h-[80vh] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl p-8 max-w-lg w-full text-center border border-gray-100">
                <div className={`mx-auto flex items-center justify-center h-20 w-20 rounded-full mb-6 ${success ? 'bg-green-100' : 'bg-red-100'}`}>
                    {success ? (
                        <CheckCircle className="h-10 w-10 text-green-600" />
                    ) : (
                        <XCircle className="h-10 w-10 text-red-600" />
                    )}
                </div>

                <h1 className="text-3xl font-extrabold text-gray-900 mb-3">
                    {success ? 'Payment Success' : 'Payment Failed'}
                </h1>
                <p className={`mb-8 ${success ? 'text-gray-600' : 'text-red-600'}`}>{message}</p>

                {success && receipt && (
                    <div className="mb-8 text-left bg-gray-50 border border-gray-100 rounded-xl p-4 space-y-2">
                        <p className="text-sm"><span className="font-semibold">Receipt Ref:</span> {receipt.reference}</p>
                        <p className="text-sm"><span className="font-semibold">Amount:</span> {Number(receipt.amount || 0).toLocaleString()} ETB</p>
                        <p className="text-sm"><span className="font-semibold">Date:</span> {new Date(receipt.date).toLocaleString()}</p>
                    </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Link to="/my-bookings" className="block">
                        <Button variant="outline" className="w-full py-6 rounded-xl border-gray-200 hover:bg-gray-50">
                            View My Bookings
                        </Button>
                    </Link>
                    <Link to="/confirmation" className="block">
                        <Button className="w-full py-6 rounded-xl">Go to Confirmation</Button>
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default PaymentSuccess;
