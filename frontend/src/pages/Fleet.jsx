import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../api';
import { Car, Check, Calendar, ArrowLeft, Loader2, Search, Filter } from 'lucide-react';
import { toast } from 'sonner';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { useAuth } from '../context/AuthContext';

const Fleet = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { isAuthenticated, user } = useAuth();
    const [cars, setCars] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState('All');
    const [startDate, setStartDate] = useState(() => {
        const saved = sessionStorage.getItem('startDate');
        return saved ? new Date(saved) : null;
    });
    const [endDate, setEndDate] = useState(() => {
        const saved = sessionStorage.getItem('endDate');
        return saved ? new Date(saved) : null;
    });

    const categories = ['All', 'Economy', 'SUV', 'Luxury', 'Utility'];

    const handleBookNow = async (carId) => {
        if (!startDate || !endDate) {
            toast.error(t('booking.selectDatesError'));
            return;
        }

        if (isAuthenticated) {
            const hasDocs = user.profile?.idCardUrl && user.profile?.driverLicenseUrl;
            const hasAgreement = user.profile?.agreementSigned;

            if (!hasDocs) {
                navigate(`/upload-docs?carId=${carId}`);
            } else if (!hasAgreement) {
                navigate(`/agreement?carId=${carId}`);
            } else {
                // User has docs and agreement, go to agreement page which will create booking
                navigate(`/agreement?carId=${carId}`);
            }
        } else {
            navigate(`/login?carId=${carId}`);
        }
    };

    useEffect(() => {
        const fetchCars = async () => {
            setLoading(true);
            try {
                const params = {};
                if (startDate) params.startDate = startDate.toISOString();
                if (endDate) params.endDate = endDate.toISOString();

                const data = await api.get('/cars', { params });
                setCars(data);
            } catch (error) {
                console.error('Failed to fetch cars:', error);
                toast.error(t('booking.failedToLoadCars'));
            } finally {
                setLoading(false);
            }
        };
        fetchCars();
    }, [startDate, endDate]);

    const filteredCars = cars.filter(car => {
        const matchesSearch = `${car.make} ${car.model}`.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = filterCategory === 'All' || car.category === filterCategory;
        return matchesSearch && matchesCategory;
    });

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
                    <h1 className="text-4xl md:text-5xl font-extrabold mb-4">{t('fleet.title')}</h1>
                    <p className="text-xl text-gray-300 max-w-2xl mx-auto">
                        {t('fleet.subtitle')}
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
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 z-10 pointer-events-none" size={20} />
                        <input
                            type="text"
                            placeholder={t('fleet.searchCars')}
                            className="pl-12 pr-4 py-3 rounded-xl border border-border focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all bg-muted/50 w-64 text-foreground"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="relative">
                        <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 z-10 pointer-events-none" size={20} />
                        <select
                            className="pl-12 pr-8 py-3 rounded-xl border border-border focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none appearance-none bg-muted/50 cursor-pointer text-foreground"
                            value={filterCategory}
                            onChange={(e) => setFilterCategory(e.target.value)}
                        >
                            {categories.map(cat => (
                                <option key={cat} value={cat}>
                                    {cat === 'All' ? t('search.all') : t(`search.${cat.toLowerCase()}`)}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Cars Grid */}
            <div className="container mx-auto px-4 py-16">
                {loading ? (
                    <div className="flex justify-center py-24">
                        <Loader2 className="animate-spin text-primary" size={48} />
                    </div>
                ) : filteredCars.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {filteredCars.map(car => (
                            <div key={car.id} className="bg-card rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 group border border-border flex flex-col h-full">
                                {/* Image Section */}
                                <div className="relative h-56 overflow-hidden bg-gray-100">
                                    <img
                                        src={api.getImageUrl(car.imageUrl) || "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?auto=format&fit=crop&q=80&w=800"}
                                        alt={`${car.make} ${car.model}`}
                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                    />
                                    <div className="absolute top-4 right-4 bg-background/95 backdrop-blur-md px-4 py-1.5 rounded-full text-xs font-bold shadow-sm uppercase tracking-wider text-foreground border border-border">
                                        {t(`search.${car.category.toLowerCase()}`)}
                                    </div>
                                    {car.status === 'RENTED' && (!startDate || !endDate) && (
                                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-[2px]">
                                            <span className="bg-red-500 text-white px-4 py-2 rounded-full font-bold shadow-lg transform -rotate-12 border-2 border-white">
                                                {t('fleet.rented')}
                                            </span>
                                        </div>
                                    )}
                                    {car.status === 'RENTED' && startDate && endDate && (
                                        <div className="absolute top-4 left-4 bg-green-500/90 backdrop-blur-md px-4 py-1.5 rounded-full text-[10px] font-black shadow-lg uppercase tracking-widest text-white border border-white/20">
                                            {t('fleet.availableForDates')}
                                        </div>
                                    )}
                                </div>

                                {/* Content Section */}
                                <div className="p-6 flex flex-col flex-grow">
                                    <div className="flex justify-between items-start mb-6">
                                        <div>
                                            <h3 className="text-2xl font-bold text-foreground leading-tight group-hover:text-primary transition-colors">{car.make} {car.model}</h3>
                                            <p className="text-muted-foreground font-medium text-sm mt-1">{t('fleet.modelYear', { year: car.year })}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-2xl font-extrabold text-primary">{Number(car.dailyRate).toLocaleString()} <span className="text-sm font-normal text-muted-foreground">ETB</span></p>
                                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{t('fleet.etbPerDay').split(' ')[2]}</p>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap gap-2 mb-8">
                                        {car.features.map((feature, idx) => (
                                            <span key={idx} className="bg-muted text-muted-foreground text-xs font-medium px-3 py-1.5 rounded-lg border border-border">
                                                {feature}
                                            </span>
                                        ))}
                                    </div>

                                    <div className="mt-auto">
                                        <button
                                            onClick={() => (car.status === 'AVAILABLE' || (startDate && endDate)) ? handleBookNow(car.id) : null}
                                            className={`block w-full text-center py-4 rounded-xl font-bold text-sm tracking-wide transition-all uppercase ${(car.status === 'AVAILABLE' || (startDate && endDate))
                                                ? 'bg-gray-900 text-white hover:bg-primary hover:text-gray-900 shadow-md hover:shadow-lg'
                                                : 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                                                }`}
                                        >
                                            {(car.status === 'AVAILABLE' || (startDate && endDate)) ? t('fleet.bookNow') : t('fleet.currentlyUnavailable')}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-16 bg-card rounded-3xl shadow-sm border border-border">
                        <Car className="mx-auto text-muted-foreground mb-4" size={64} />
                        <h3 className="text-xl font-bold text-foreground mb-2">{t('fleet.noCarsFound')}</h3>
                        <p className="text-muted-foreground mb-6">{t('fleet.noCarsDesc')}</p>
                        <button
                            onClick={() => { setSearchTerm(''); setFilterCategory('All'); }}
                            className="inline-flex items-center bg-primary text-white px-6 py-3 rounded-xl font-bold hover:bg-primary/90 transition-colors"
                        >
                            {t('fleet.clearFilters')}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Fleet;
