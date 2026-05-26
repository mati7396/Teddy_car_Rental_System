import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { AlertCircle, ArrowLeft, Clock, Loader2, Receipt, ShieldAlert } from 'lucide-react';
import { api } from '@/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

const CancellationDetails = () => {
    const { bookingId } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [isCancelling, setIsCancelling] = useState(false);
    const [data, setData] = useState(null);

    useEffect(() => {
        const fetchPreview = async () => {
            try {
                const preview = await api.get(`/bookings/${bookingId}/cancellation-preview`);
                setData(preview);
            } catch (error) {
                console.error('Failed to load cancellation preview:', error);
                toast.error(error.message || 'Failed to load cancellation details');
                navigate('/my-bookings');
            } finally {
                setLoading(false);
            }
        };
        fetchPreview();
    }, [bookingId, navigate]);

    const handleConfirmCancel = async () => {
        if (!data?.cancellation?.canCancel) return;
        setIsCancelling(true);
        try {
            const response = await api.patch(`/bookings/${bookingId}/cancel`);
            toast.success(response?.message || 'Booking cancelled successfully');
            navigate('/my-bookings');
        } catch (error) {
            console.error('Cancellation failed:', error);
            toast.error(error.message || 'Failed to cancel booking');
        } finally {
            setIsCancelling(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
        );
    }

    const booking = data?.booking;
    const cancellation = data?.cancellation;

    return (
        <div className="min-h-screen bg-gray-50 py-10 px-4">
            <div className="max-w-3xl mx-auto space-y-6">
                <Link to="/my-bookings" className="inline-flex items-center text-sm text-gray-500 hover:text-primary">
                    <ArrowLeft size={16} className="mr-2" />
                    Back to My Rentals
                </Link>

                <Card className="border-none shadow-lg">
                    <CardHeader className="bg-gray-900 text-white rounded-t-xl">
                        <CardTitle className="text-2xl flex items-center gap-2">
                            <Receipt size={22} />
                            Cancellation Details
                        </CardTitle>
                        <p className="text-gray-300 text-sm mt-1">Booking #BK-{booking?.id?.toString().padStart(5, '0')}</p>
                    </CardHeader>
                    <CardContent className="space-y-5 p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="p-4 rounded-xl bg-gray-50 border">
                                <p className="text-xs text-gray-500 uppercase font-bold">Rental Amount</p>
                                <p className="text-xl font-black mt-1">{Number(booking?.totalAmount || 0).toLocaleString()} ETB</p>
                            </div>
                            <div className="p-4 rounded-xl bg-gray-50 border">
                                <p className="text-xs text-gray-500 uppercase font-bold">Booking Status</p>
                                <p className="text-xl font-black mt-1">{booking?.status}</p>
                            </div>
                        </div>

                        <div className="p-4 rounded-xl bg-blue-50 border border-blue-100">
                            <p className="text-sm text-blue-900 flex items-start gap-2">
                                <Clock size={16} className="mt-0.5" />
                                Full refund applies when cancellation is at least {cancellation?.fullRefundWindowHours || 24} hours before start date.
                            </p>
                            <p className="text-xs text-blue-800 mt-2">
                                Time before start: {Number(cancellation?.hoursBeforeStart || 0).toFixed(2)} hours
                            </p>
                        </div>

                        <div className="space-y-2 border rounded-xl p-4 bg-white">
                            <div className="flex justify-between text-sm">
                                <span>Cancellation Fee</span>
                                <span className="font-bold text-red-600">{Number(cancellation?.cancellationFee || 0).toLocaleString()} ETB</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span>Refund Amount</span>
                                <span className="font-bold text-green-600">{Number(cancellation?.refundAmount || 0).toLocaleString()} ETB</span>
                            </div>
                        </div>

                        {cancellation?.qualifiesForFullRefund ? (
                            <Badge className="bg-green-100 text-green-700 border-green-200">Eligible for full refund</Badge>
                        ) : (
                            <Badge className="bg-orange-100 text-orange-700 border-orange-200">Late cancellation fee applies</Badge>
                        )}

                        {!cancellation?.canCancel && (
                            <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-red-800 text-sm flex items-start gap-2">
                                <ShieldAlert size={16} className="mt-0.5" />
                                This booking cannot be cancelled in its current status.
                            </div>
                        )}

                        <div className="flex justify-end gap-3 pt-2">
                            <Button variant="outline" onClick={() => navigate('/my-bookings')}>Back</Button>
                            <Button
                                variant="destructive"
                                onClick={handleConfirmCancel}
                                disabled={isCancelling || !cancellation?.canCancel}
                            >
                                {isCancelling ? 'Cancelling...' : 'Confirm Cancellation'}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default CancellationDetails;
