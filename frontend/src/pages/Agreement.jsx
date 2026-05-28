import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { FileText, PenTool } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { api } from '@/api';
import { useAuth } from '../context/AuthContext';

const Agreement = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { user, refreshUser, isAuthenticated, loading: authLoading } = useAuth();
    const [loading, setLoading] = useState(false);
    const [signature, setSignature] = useState('');
    const [agreed, setAgreed] = useState(false);
    const [carInfo, setCarInfo] = useState(null);
    const [expectedReturn, setExpectedReturn] = useState('');
    const [actualReturn, setActualReturn] = useState('');
    const [estimatedPenalty, setEstimatedPenalty] = useState(0);
    const carId = searchParams.get('carId');
    const packageId = searchParams.get('packageId');
    const bookingCreatedRef = React.useRef(false); // Prevent duplicate creation

    // Auto-create booking for users who already signed agreement
    useEffect(() => {
        const autoCreateBooking = async () => {
            // Wait for auth to load
            if (authLoading) return;
            
            // If not authenticated, let the form handle it
            if (!isAuthenticated) return;
            
            // If user hasn't signed agreement yet, show the form
            if (!user?.profile?.agreementSigned) return;
            
            // If no booking in progress, redirect home
            if (!carId && !packageId) {
                navigate('/');
                return;
            }
            
            // Prevent duplicate creation (React 18 Strict Mode runs effects twice)
            if (bookingCreatedRef.current) return;
            bookingCreatedRef.current = true;
            
            // User has signed agreement and is trying to book - create booking automatically
            setLoading(true);
            try {
                const sDateStr = sessionStorage.getItem('startDate');
                const eDateStr = sessionStorage.getItem('endDate');
                
                let durationDays = 3;
                if (sDateStr && eDateStr) {
                    const start = new Date(sDateStr);
                    const end = new Date(eDateStr);
                    const diffTime = Math.abs(end - start);
                    durationDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
                }

                const payload = {
                    carId: carId ? parseInt(carId) : null,
                    packageId: packageId ? parseInt(packageId) : null,
                    startDate: sDateStr ? new Date(sDateStr).toISOString() : new Date().toISOString(),
                    endDate: eDateStr ? new Date(eDateStr).toISOString() : new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString(),
                    totalAmount: 0,
                    idCardUrl: sessionStorage.getItem('idCardUrl') || user?.profile?.idCardUrl,
                    driverLicenseUrl: sessionStorage.getItem('licenseUrl') || user?.profile?.driverLicenseUrl,
                    pickupLocation: 'To be determined',
                    returnLocation: 'To be determined',
                    isDelivery: false
                };

                // Create booking - backend will determine if it should be PENDING or VERIFIED
                const booking = await api.post('/bookings', payload);
                
                // Check the status of the newly created booking
                if (booking.status === 'VERIFIED') {
                    // User has verified documents - go to payment
                    toast.success('Booking created! Proceeding to payment...');
                    navigate(`/payment?carId=${carId || ''}&packageId=${packageId || ''}&bookingId=${booking.id}`);
                } else {
                    // First-time user or pending verification - go to pending page
                    toast.success('Booking created! Waiting for document verification...');
                    navigate(`/pending-verification?bookingId=${booking.id}`);
                }
            } catch (error) {
                console.error('Error creating booking:', error);
                toast.error(error.message || 'Failed to create booking');
                setLoading(false);
                bookingCreatedRef.current = false; // Reset on error
            }
        };

        autoCreateBooking();
    }, [authLoading, isAuthenticated, user?.profile?.agreementSigned, carId, packageId, navigate]);

    // Fetch car info for penalty calculations when carId is present
    useEffect(() => {
        if (!carId) return;
        let mounted = true;
        (async () => {
            try {
                const data = await api.get(`/cars/${carId}`);
                if (mounted) setCarInfo(data);
            } catch (err) {
                console.warn('Unable to load car info for penalty calc', err.message || err);
            }
        })();
        return () => { mounted = false; };
    }, [carId]);

    const computePenalty = () => {
        if (!expectedReturn || !actualReturn) return 0;
        const expected = new Date(expectedReturn);
        const actual = new Date(actualReturn);

        // 2-hour grace period
        const graceMs = 2 * 60 * 60 * 1000;
        const adjustedExpected = new Date(expected.getTime() + graceMs);

        if (actual <= adjustedExpected) return 0;

        const diffMs = Math.abs(actual - adjustedExpected);
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        const rate = Number(carInfo?.dailyRate || 0) || 0;
        return diffDays * rate;
    };

    useEffect(() => {
        try {
            const p = computePenalty();
            setEstimatedPenalty(p);
        } catch (e) {
            setEstimatedPenalty(0);
        }
    }, [expectedReturn, actualReturn, carInfo]);

    // Unified Agreement: No longer blocks without carId.
    // This allows setup during registration.

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // This form is only for first-time users who haven't signed the agreement yet
        if (!signature || !agreed) return;

        setLoading(true);
        try {
            // Save agreement to profile
            await api.patch('/auth/profile', {
                agreementSigned: true,
                firstName: user?.profile?.firstName,
                lastName: user?.profile?.lastName,
                phoneNumber: user?.profile?.phoneNumber
            });

            await refreshUser();

            // Create a PENDING booking with documents
            if (carId || packageId) {
                const sDateStr = sessionStorage.getItem('startDate');
                const eDateStr = sessionStorage.getItem('endDate');
                
                let durationDays = 3;
                if (sDateStr && eDateStr) {
                    const start = new Date(sDateStr);
                    const end = new Date(eDateStr);
                    const diffTime = Math.abs(end - start);
                    durationDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
                }

                const payload = {
                    carId: carId ? parseInt(carId) : null,
                    packageId: packageId ? parseInt(packageId) : null,
                    startDate: sDateStr ? new Date(sDateStr).toISOString() : new Date().toISOString(),
                    endDate: eDateStr ? new Date(eDateStr).toISOString() : new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString(),
                    totalAmount: 0,
                    idCardUrl: sessionStorage.getItem('idCardUrl') || user?.profile?.idCardUrl,
                    driverLicenseUrl: sessionStorage.getItem('licenseUrl') || user?.profile?.driverLicenseUrl,
                    pickupLocation: 'To be determined',
                    returnLocation: 'To be determined',
                    isDelivery: false
                };

                const booking = await api.post('/bookings', payload);
                toast.success('Booking created! Waiting for document verification...');
                navigate(`/pending-verification?bookingId=${booking.id}`);
            } else {
                // No booking, just profile setup - redirect to home
                toast.success('Profile setup complete! You can now book a vehicle.');
                navigate('/');
            }
        } catch (error) {
            toast.error(error.message || t('booking.failedToSaveAgreement'));
        } finally {
            setLoading(false);
        }
    };

    if (authLoading) {
        return <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>;
    }

    return (
        <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-10">
                <h2 className="text-3xl font-extrabold text-foreground tracking-tight">{t('booking.rentalAgreement')}</h2>
                <p className="mt-3 text-lg text-muted-foreground">
                    {t('booking.reviewSign')}
                </p>
            </div>

            <div className="bg-card shadow-xl rounded-2xl overflow-hidden border border-border">
                {/* Document Header */}
                <div className="px-8 py-5 bg-muted/50 border-b border-border flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <FileText className="text-primary" size={24} />
                        <span className="font-bold text-foreground uppercase tracking-wide">{t('booking.standardContract')}</span>
                    </div>
                    <span className="text-xs font-mono text-muted-foreground">REF-89302-2024</span>
                </div>

                {/* Agreement Text */}
                <div className="px-8 py-8 h-[400px] overflow-y-auto text-sm text-foreground leading-relaxed font-sans bg-card">
                    <h3 className="font-bold text-xl mb-6 text-center underline decoration-primary decoration-2 underline-offset-4">{t('termsPage.title')}</h3>

                    <div className="space-y-4 max-w-3xl mx-auto">
                        <p><strong>{t('termsPage.s1Title')}:</strong> {t('termsPage.s1Desc')}</p>
                        <p><strong>{t('termsPage.s2Title')}:</strong> {t('termsPage.s2Desc')}</p>
                        <p><strong>{t('termsPage.s3Title')}:</strong> {t('termsPage.s3Desc')}</p>
                        <p><strong>{t('termsPage.s4Title')}:</strong> {t('termsPage.s4Desc')}</p>
                        <p><strong>{t('termsPage.s5Title')}:</strong> {t('termsPage.s5Desc')}</p>
                        <p><strong>{t('termsPage.s6Title')}:</strong> {t('termsPage.s6Desc')}</p>
                        <p><strong>{t('termsPage.s7Title')}:</strong> {t('termsPage.s7Desc')}</p>
                        <p><strong>{t('termsPage.s8Title')}:</strong> {t('termsPage.s8Desc')}</p>

                        <p className="pt-6 font-bold text-foreground">Signed this day, <span className="underline">{new Date().toLocaleDateString()}</span>.</p>
                    </div>
                </div>

                {/* Signature Section */}
                <div className="px-8 py-8 bg-muted/30 border-t border-border">
                    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl mx-auto">

                        <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
                            <label htmlFor="signature" className="block text-sm font-bold text-foreground mb-3">
                                {t('booking.digitalSignature')}
                            </label>
                            <div className="relative">
                                <input
                                    type="text"
                                    id="signature"
                                    className="block w-full pl-12 pr-4 py-4 border border-border rounded-xl shadow-inner focus:ring-4 focus:ring-primary/20 focus:border-primary text-2xl text-foreground placeholder-muted-foreground outline-none transition-all bg-background"
                                    placeholder={t('booking.signHere')}
                                    value={signature}
                                    onChange={(e) => setSignature(e.target.value)}
                                    required
                                />
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-primary p-1 bg-primary/10 rounded">
                                    <PenTool size={20} />
                                </div>
                            </div>
                            <p className="mt-2 text-xs text-muted-foreground">{t('booking.consentElectronic')}</p>
                        </div>

                        <div className="flex items-start bg-card p-4 rounded-xl border border-border">
                            <div className="flex items-center h-5">
                                <input
                                    id="agree"
                                    name="agree"
                                    type="checkbox"
                                    className="h-5 w-5 text-primary focus:ring-primary border-border rounded cursor-pointer"
                                    checked={agreed}
                                    onChange={(e) => setAgreed(e.target.checked)}
                                    required
                                />
                            </div>
                            <div className="ml-3 text-sm">
                                <label htmlFor="agree" className="font-medium text-foreground cursor-pointer">
                                    {t('booking.iAgree')}
                                </label>
                                <p className="text-muted-foreground">{t('booking.confirmAge')}</p>
                            </div>
                        </div>

                        <div className="flex justify-end gap-4 pt-4">
                            <Button type="button" variant="outline" onClick={() => navigate(carId ? `/upload-docs?carId=${carId}` : '/upload-docs')} className="w-auto px-8 py-3 rounded-xl">
                                {t('booking.back')}
                            </Button>
                            <Button type="submit" isLoading={loading} disabled={!signature || !agreed} className="w-auto px-8 py-3 rounded-xl font-bold shadow-md">
                                {t('booking.signContinue')}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Agreement;
