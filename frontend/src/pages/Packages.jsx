import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../api';
import { Package, Check, Calendar, ArrowLeft, Loader2, Search } from 'lucide-react';
import { toast } from 'sonner';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { useAuth } from '../context/AuthContext';

const Packages = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { isAuthenticated, user } = useAuth();
    const [packages, setPackages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedPackage, setSelectedPackage] = useState(null);
    const [startDate, setStartDate] = useState(() => {
        const saved = sessionStorage.getItem('startDate');
        return saved ? new Date(saved) : null;
    });
    const [endDate, setEndDate] = useState(() => {
        const saved = sessionStorage.getItem('endDate');
        return saved ? new Date(saved) : null;
    });

    useEffect(() => {
        const fetchPackages = async () => {
            setLoading(true);
            try {
                const data = await api.get('/packages');
                setPackages(data);
            } catch (error) {
                console.error('Failed to fetch packages:', error);
                toast.error(t('booking.failedToLoadPackages'));
            } finally {
                setLoading(false);
            }
        };
        fetchPackages();
    }, []);

    const handleBookPackage = async (pkg) => {
        if (!startDate || !endDate) {
            toast.error(t('booking.selectDatesError'));
            return;
        }

        if (isAuthenticated) {
            const hasDocs = user.profile?.idCardUrl && user.profile?.driverLicenseUrl;
            const hasAgreement = user.profile?.agreementSigned;

            // Store package selection in session storage
            sessionStorage.setItem('selectedPackageId', pkg.id);

            if (!hasDocs) {
                navigate(`/upload-docs?packageId=${pkg.id}`);
            } else if (!hasAgreement) {
                navigate(`/agreement?packageId=${pkg.id}`);
            } else {
                // User has docs and agreement, go to agreement page which will create booking
                navigate(`/agreement?packageId=${pkg.id}`);
            }
        } else {
            navigate(`/login?packageId=${pkg.id}`);
        }
    };

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <div className="bg-card border-b border-border">
                <div className="container mx-auto px-4 py-4">
                    <Link to="/" className="inline-flex items-center text-muted-foreground hover:text-primary transition-colors">
                        <ArrowLeft className="mr-2" size={20} />
                        {t('fleet.backHome')}
                    </Link>
                </div>
            </div>

            {/* Hero */}
            <div className="bg-gray-900 text-white py-16">
                <div className="container mx-auto px-4 text-center">
                    <h1 className="text-4xl md:text-5xl font-extrabold mb-4">{t('packagesPage.title')}</h1>
                    <p className="text-xl text-gray-300 max-w-2xl mx-auto">
                        {t('packagesPage.subtitle')}
                    </p>
                </div>
            </div>

            {/* Date Selection */}
            <div className="container mx-auto px-4 -mt-8 relative z-10">
                <div className="bg-card rounded-2xl shadow-xl p-6 flex flex-wrap gap-4 items-center justify-center border border-border">
                    <div className="relative">
                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 z-10 pointer-events-none" size={20} />
                        <DatePicker
                            selected={startDate}
                            onChange={(date) => {
                                setStartDate(date);
                                if (date) sessionStorage.setItem('startDate', date.toISOString());
                            }}
                            selectsStart
                            startDate={startDate}
                            endDate={endDate}
                            minDate={new Date()}
                            placeholderText={t('search.pickup')}
                            className="pl-12 pr-4 py-3 rounded-xl border border-border focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all bg-muted/50 text-foreground"
                        />
                    </div>
                    <div className="relative">
                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 z-10 pointer-events-none" size={20} />
                        <DatePicker
                            selected={endDate}
                            onChange={(date) => {
                                setEndDate(date);
                                if (date) sessionStorage.setItem('endDate', date.toISOString());
                            }}
                            selectsEnd
                            startDate={startDate}
                            endDate={endDate}
                            minDate={startDate || new Date()}
                            placeholderText={t('search.return')}
                            className="pl-12 pr-4 py-3 rounded-xl border border-border focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all bg-muted/50 text-foreground"
                        />
                    </div>
                    {!startDate || !endDate ? (
                        <span className="text-sm text-muted-foreground ml-2">
                            <Search className="inline mr-1" size={16} />
                            {t('packagesPage.selectDates')}
                        </span>
                    ) : (
                        <span className="text-sm text-green-600 ml-2 font-medium">
                            <Check className="inline mr-1" size={16} />
                            {t('packagesPage.readyToBook')}
                        </span>
                    )}
                </div>
            </div>

            {/* Packages Grid */}
            <div className="container mx-auto px-4 py-16">
                {loading ? (
                    <div className="flex justify-center py-24">
                        <Loader2 className="animate-spin text-primary" size={48} />
                    </div>
                ) : packages.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {packages.map(pkg => (
                            <div
                                key={pkg.id}
                                className={`bg-card rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 border-2 flex flex-col ${selectedPackage === pkg.id ? 'border-primary' : 'border-border'
                                    }`}
                                onClick={() => setSelectedPackage(pkg.id)}
                            >
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-3 bg-primary/10 rounded-xl">
                                        <Package className="text-primary" size={28} />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-foreground">{pkg.name}</h3>
                                        <p className="text-sm text-muted-foreground">{pkg.period}</p>
                                    </div>
                                </div>

                                {pkg.category && (
                                    <span className="inline-block bg-muted text-muted-foreground px-3 py-1 rounded-full text-xs font-medium mb-4 w-fit border border-border">
                                        {t(`search.${pkg.category.toLowerCase()}`)}
                                    </span>
                                )}

                                <div className="mb-6">
                                    <span className="text-4xl font-extrabold text-primary">{pkg.price?.toLocaleString()}</span>
                                    <span className="text-muted-foreground ml-2">ETB</span>
                                    <span className="text-muted-foreground text-sm block mt-1">{t('packagesPage.totalPrice')}</span>
                                </div>

                                {pkg.features && pkg.features.length > 0 && (
                                    <ul className="space-y-3 mb-8 flex-grow">
                                        {pkg.features.map((feature, index) => (
                                            <li key={index} className="flex items-start gap-2">
                                                <Check className="text-green-500 shrink-0 mt-0.5" size={16} />
                                                <span className="text-muted-foreground text-sm">{feature}</span>
                                            </li>
                                        ))}
                                    </ul>
                                )}

                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleBookPackage(pkg);
                                    }}
                                    className="w-full bg-primary text-white py-3 rounded-xl font-bold hover:bg-primary/90 transition-colors"
                                >
                                    {t('packagesPage.bookPackage')}
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-16">
                        <Package className="mx-auto text-muted-foreground mb-4" size={64} />
                        <h3 className="text-xl font-bold text-foreground mb-2">{t('packagesPage.noPackages')}</h3>
                        <p className="text-muted-foreground mb-6">{t('packagesPage.noPackagesDesc')}</p>
                        <Link
                            to="/"
                            className="inline-flex items-center bg-primary text-white px-6 py-3 rounded-xl font-bold hover:bg-primary/90 transition-colors"
                        >
                            <ArrowLeft className="mr-2" size={20} />
                            {t('hero.browseFleet')}
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Packages;
