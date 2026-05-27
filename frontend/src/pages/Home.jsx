import React, { useState, useEffect } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../api';
import { Search, Filter, Calendar, Loader2, ArrowRight, Users, Award, MapPin, Shield, Mail, Phone, Clock, CheckCircle2, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { format } from "date-fns";

import { useAuth } from '../context/AuthContext';

const Home = () => {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const { isAuthenticated, user } = useAuth();
    const [cars, setCars] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState('All');
    const [openFaq, setOpenFaq] = useState(null);
    const [homeWhyChoose, setHomeWhyChoose] = useState([]);
    const [homeMission, setHomeMission] = useState([]);
    const [startDate, setStartDate] = useState(() => {
        const saved = sessionStorage.getItem('startDate');
        return saved ? new Date(saved) : null;
    });
    const [endDate, setEndDate] = useState(() => {
        const saved = sessionStorage.getItem('endDate');
        return saved ? new Date(saved) : null;
    });

    const handleBookNow = async (carId) => {
        if (!startDate || !endDate) {
            toast.error(t('booking.selectDatesError'));
            window.scrollTo({ top: 300, behavior: 'smooth' }); // Scroll to search bar
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
                toast.error(t('booking.failedToUpdateFleet'));
            } finally {
                setLoading(false);
            }
        };

        const fetchHomeContent = async () => {
            try {
                const data = await api.get(`/content/home?lng=${i18n.language}`);
                if (data?.whyChoose) setHomeWhyChoose(data.whyChoose);
                if (data?.mission) setHomeMission(data.mission);
            } catch (error) {
                console.error('Failed to fetch home content:', error);
            }
        };

        fetchCars();
        fetchHomeContent();
    }, [startDate, endDate, t, i18n.language]);

    const filteredCars = cars.filter(car => {
        const matchesSearch = `${car.make} ${car.model}`.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = filterCategory === 'All' || car.category === filterCategory;
        return matchesSearch && matchesCategory;
    });

    const categories = ['All', 'Economy', 'SUV', 'Luxury', 'Utility'];

    return (
        <div className="space-y-16 pb-16 bg-background">
            {/* Hero Sectionn */}
            <section className="relative h-[600px] flex items-center justify-center bg-gray-900 text-white overflow-hidden">
                <div className="absolute inset-0 z-0">
                    <img
                        src="https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&q=80&w=1920"
                        alt="Hero Background"
                        className="w-full h-full object-cover opacity-60"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/40 to-transparent"></div>
                </div>

                <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center text-center">
                    <div className="max-w-5xl">
                        <h1 className="text-5xl md:text-7xl font-extrabold mb-6 tracking-tight leading-tight animate-in slide-in-from-bottom-5 fade-in duration-700 drop-shadow-lg">
                            <Trans i18nKey="hero.title">
                                Drive Your <span className="text-primary text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">Dream</span> Today
                            </Trans>
                        </h1>
                        <p className="text-xl md:text-2xl text-gray-100 mb-10 max-w-3xl mx-auto font-light leading-relaxed animate-in slide-in-from-bottom-5 fade-in duration-700 delay-150 drop-shadow-md">
                            {t('hero.subtitle')}
                        </p>
                        <div className="animate-in slide-in-from-bottom-5 fade-in duration-700 delay-300">
                            <a href="#fleet" className="bg-primary text-white px-10 py-4 rounded-full font-bold text-lg hover:bg-white hover:text-primary transition-all hover:scale-105 inline-block shadow-lg hover:shadow-primary/50">
                                {t('hero.browseFleet')}
                            </a>
                            <button
                                onClick={() => navigate('/packages')}
                                className="ml-4 bg-white/10 backdrop-blur-sm text-white px-10 py-4 rounded-full font-bold text-lg hover:bg-white hover:text-gray-900 transition-all hover:scale-105 inline-block shadow-lg border border-white/30"
                            >
                                {t('hero.viewPackages')}
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {/* Search & Filter - Proximity: Grouped controls, Alignment: Center aligned within container */}
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 -mt-24 relative z-20">
                <div className="bg-card rounded-2xl shadow-2xl p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6 items-center ring-1 ring-border">
                    <div className="lg:col-span-3 relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors" size={20} />
                        <input
                            type="text"
                            placeholder={t('search.placeholder')}
                            className="w-full pl-12 pr-4 py-4 rounded-xl border border-border focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all bg-muted/50 focus:bg-background text-foreground"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="lg:col-span-2 relative group">
                        <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors" size={20} />
                        <select
                            className="w-full pl-12 pr-4 py-4 rounded-xl border border-border focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none appearance-none bg-muted/50 focus:bg-background cursor-pointer text-foreground"
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

                    <div className="lg:col-span-3 relative group">
                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary z-10 pointer-events-none" size={20} />
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
                            className="w-full pl-12 pr-4 py-4 rounded-xl border border-border focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all bg-muted/50 focus:bg-background text-foreground font-medium"
                        />
                        <span className="absolute -top-2 left-4 bg-background px-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider z-10">{t('search.pickup')}</span>
                    </div>

                    <div className="lg:col-span-3 relative group">
                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary z-10 pointer-events-none" size={20} />
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
                            className="w-full pl-12 pr-4 py-4 rounded-xl border border-border focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all bg-muted/50 focus:bg-background text-foreground font-medium"
                        />
                        <span className="absolute -top-2 left-4 bg-background px-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider z-10">{t('search.return')}</span>
                    </div>

                    <div className="lg:col-span-1">
                        <a href="#fleet" className="w-full h-[60px] bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition-all shadow-lg hover:shadow-xl flex items-center justify-center transform active:scale-95 group">
                            <Search className="group-hover:scale-120 transition-transform" size={20} />
                        </a>
                    </div>
                </div>
            </div>

            {/* Car Layout */}
            <section id="fleet" className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-12">
                    <h2 className="text-4xl font-extrabold text-foreground mb-4">{t('fleet.title')}</h2>
                    <p className="text-muted-foreground max-w-2xl mx-auto">{t('fleet.subtitle')}</p>
                </div>

                {loading ? (
                    <div className="flex justify-center py-24">
                        <Loader2 className="animate-spin text-primary" size={48} />
                    </div>
                ) : filteredCars.length > 0 ? (
                    <>
                        {/* Show only first 3 cars on landing page */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {filteredCars.slice(0, 3).map(car => (
                                <div key={car.id} className="bg-card rounded-2xl overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-300 group border border-border flex flex-col h-full">
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
                                            <div className="absolute top-4 left-4 bg-green-500/90 backdrop-blur-md px-4 py-1.5 rounded-full text-[10px] font-black shadow-lg uppercase tracking-widest text-white border border-white/20 animate-in fade-in zoom-in duration-500">
                                                {t('fleet.availableForDates')}
                                            </div>
                                        )}
                                    </div>

                                    {/* Content Section - Proximity: Grouped details */}
                                    <div className="p-6 flex flex-col flex-grow">
                                        <div className="flex justify-between items-start mb-6">
                                            <div>
                                                <h3 className="text-2xl font-bold text-foreground leading-tight group-hover:text-primary transition-colors">{car.make} {car.model}</h3>
                                                <p className="text-muted-foreground font-medium text-sm mt-1">{t('fleet.modelYear', { year: car.year })}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-2xl font-extrabold text-primary">{Number(car.dailyRate).toLocaleString()} <span className="text-sm font-normal text-muted-foreground">ETB</span></p>
                                                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{t('fleet.etbPerDay')}</p>
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
                                                    ? 'bg-gray-900 text-white hover:bg-primary hover:text-gray-900 shadow-md hover:shadow-lg transform active:scale-[0.98]'
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

                        {/* View All Cars CTA */}
                        <div className="text-center mt-12">
                            <button
                                onClick={() => navigate('/fleet')}
                                className="bg-primary text-white px-8 py-4 rounded-full font-bold text-lg hover:bg-gray-900 hover:text-white transition-all hover:scale-105 inline-block shadow-lg hover:shadow-primary/50"
                            >
                                {t('fleet.viewMore')}
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="text-center py-24 bg-card rounded-3xl shadow-sm border border-border">
                        <p className="text-xl text-muted-foreground font-medium">{t('fleet.noCarsFound')}</p>
                        <button onClick={() => { setSearchTerm(''); setFilterCategory('All'); }} className="mt-4 text-primary font-bold hover:underline">
                            {t('fleet.clearFilters')}
                        </button>
                    </div>
                )}
            </section>

            {/* About Us Section */}
            <section className="bg-background py-20">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-12">
                        <h2 className="text-4xl font-extrabold text-foreground mb-4">{t('whyChoose.title')}</h2>
                        <p className="text-muted-foreground max-w-2xl mx-auto text-lg">{t('whyChoose.subtitle')}</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {(homeWhyChoose.length > 0 ? homeWhyChoose : [
                            { title: t('whyChoose.customerFirst'), description: t('whyChoose.customerFirstDesc'), icon: 'Users' },
                            { title: t('whyChoose.qualityFleet'), description: t('whyChoose.qualityFleetDesc'), icon: 'Award' },
                            { title: t('whyChoose.localExpertise'), description: t('whyChoose.localExpertiseDesc'), icon: 'MapPin' },
                            { title: t('whyChoose.fullyInsured'), description: t('whyChoose.fullyInsuredDesc'), icon: 'Shield' }
                        ]).map((item, index) => {
                            const Icon = item.icon === 'Award' ? Award : item.icon === 'MapPin' ? MapPin : item.icon === 'Shield' ? Shield : Users;
                            return (
                                <div key={`why-${index}`} className="bg-card rounded-xl p-6 shadow-sm border border-border hover:shadow-md hover:border-primary/20 transition-all duration-300">
                                    <div className="mx-auto w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                                        <Icon className="text-primary" size={24} />
                                    </div>
                                    <h3 className="font-bold text-foreground mb-2 text-center">{item.title}</h3>
                                    <p className="text-sm text-muted-foreground text-center leading-relaxed">{item.description}</p>
                                </div>
                            );
                        })}
                    </div>

                    <div className="mt-16 bg-muted/50 rounded-2xl p-8 shadow-sm border border-border">
                        <h2 className="text-2xl font-bold text-foreground mb-6 text-center">{t('mission.title')}</h2>
                        <ul className="space-y-4 max-w-2xl mx-auto">
                            {(homeMission.length > 0 ? homeMission : [
                                { description: t('mission.point1') },
                                { description: t('mission.point2') },
                                { description: t('mission.point3') },
                                { description: t('mission.point4') }
                            ]).map((item, index) => (
                                <li key={`mission-${index}`} className="flex items-start gap-4 p-4 bg-card rounded-lg">
                                    <CheckCircle2 className="text-primary mt-0.5 flex-shrink-0" size={24} />
                                    <span className="text-foreground text-lg">{item.description}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </section>

            {/* Contact Us Section */}
            <section className="bg-muted/50 py-20">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-12">
                        <h2 className="text-4xl font-extrabold text-foreground mb-4">{t('contact.title')}</h2>
                        <p className="text-muted-foreground max-w-2xl mx-auto text-lg">{t('contact.subtitle')}</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
                        <a href="https://maps.google.com/?q=Bole+Road,+Addis+Ababa,+Ethiopia" target="_blank" rel="noopener noreferrer" className="block bg-card rounded-xl p-6 shadow-md border border-border hover:shadow-lg hover:border-primary/30 transition-all duration-300 hover:-translate-y-1">
                            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                                <MapPin className="text-primary" size={22} />
                            </div>
                            <h3 className="font-bold text-foreground text-center mb-2">{t('contact.address')}</h3>
                            <p className="text-muted-foreground text-sm text-center hover:text-primary transition-colors">{t('contact.addressText')}</p>
                        </a>
                        <a href="tel:+251900000000" className="block bg-card rounded-xl p-6 shadow-md border border-border hover:shadow-lg hover:border-primary/30 transition-all duration-300 hover:-translate-y-1">
                            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                                <Phone className="text-primary" size={22} />
                            </div>
                            <h3 className="font-bold text-foreground text-center mb-2">{t('contact.phone')}</h3>
                            <p className="text-muted-foreground text-sm text-center hover:text-primary transition-colors">+251 900 000 000</p>
                        </a>
                        <a href="mailto:info@teddyrental.com" className="block bg-card rounded-xl p-6 shadow-md border border-border hover:shadow-lg hover:border-primary/30 transition-all duration-300 hover:-translate-y-1">
                            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                                <Mail className="text-primary" size={22} />
                            </div>
                            <h3 className="font-bold text-foreground text-center mb-2">{t('contact.email')}</h3>
                            <p className="text-muted-foreground text-sm text-center hover:text-primary transition-colors">info@teddyrental.com</p>
                        </a>
                        <div className="bg-card rounded-xl p-6 shadow-md border border-border hover:shadow-lg hover:border-primary/30 transition-all duration-300">
                            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                                <Clock className="text-primary" size={22} />
                            </div>
                            <h3 className="font-bold text-foreground text-center mb-2">{t('contact.businessHours')}</h3>
                            <p className="text-muted-foreground text-sm text-center">{t('contact.hoursText')}</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* FAQ Section */}
            <section className="bg-background py-20">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-12">
                        <h2 className="text-4xl font-extrabold text-foreground mb-4">{t('faq.title')}</h2>
                        <p className="text-muted-foreground max-w-2xl mx-auto text-lg">{t('faq.subtitle')}</p>
                    </div>

                    <div className="max-w-3xl mx-auto space-y-4">
                        {[
                            {
                                question: t('faq.q1'),
                                answer: t('faq.a1')
                            },
                            {
                                question: t('faq.q2'),
                                answer: t('faq.a2')
                            },
                            {
                                question: t('faq.q3'),
                                answer: t('faq.a3')
                            },
                            {
                                question: t('faq.q4'),
                                answer: t('faq.a4')
                            },
                            {
                                question: t('faq.q5'),
                                answer: t('faq.a5')
                            },
                            {
                                question: t('faq.q6'),
                                answer: t('faq.a6')
                            }
                        ].map((faq, index) => (
                            <div
                                key={index}
                                className="border border-border rounded-xl overflow-hidden hover:border-primary/30 transition-colors duration-300"
                            >
                                <button
                                    onClick={() => setOpenFaq(openFaq === index ? null : index)}
                                    className="w-full flex items-center justify-between p-5 text-left bg-muted/50 hover:bg-muted transition-colors duration-300"
                                >
                                    <span className="font-semibold text-foreground pr-4">{faq.question}</span>
                                    <ChevronDown
                                        className={`text-primary flex-shrink-0 transition-transform duration-300 ${openFaq === index ? 'rotate-180' : ''}`}
                                        size={20}
                                    />
                                </button>
                                {openFaq === index && (
                                    <div className="p-5 bg-card border-t border-border">
                                        <p className="text-muted-foreground leading-relaxed">{faq.answer}</p>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        </div>
    );
};

export default Home;
