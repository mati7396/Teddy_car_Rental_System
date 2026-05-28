import { Link, Outlet, useNavigate } from 'react-router-dom';
import { Home as HomeIcon, Info, Mail, LogIn, UserPlus, Briefcase, User, LogOut, Bell, Wallet } from 'lucide-react';
import logo from '../assets/logo.png';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './LanguageSwitcher';
import { api } from '../api';
import { ThemeToggle } from './theme-toggle';
import { useState, useEffect } from 'react';

const Layout = () => {
    const { user, logout, isAuthenticated } = useAuth();
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        if (!isAuthenticated) { setUnreadCount(0); return; }
        const fetch = async () => {
            try {
                const data = await api.get('/reports/my-notifications');
                setUnreadCount((data || []).filter(n => !n.isRead).length);
            } catch (_) {}
        };
        fetch();
        const interval = setInterval(fetch, 30000);
        return () => clearInterval(interval);
    }, [isAuthenticated]);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    // Reusable bell link with badge
    const BellLink = () => (
        <Link to="/notifications" className="group flex items-center gap-2 text-base text-muted-foreground hover:text-foreground font-semibold transition-all duration-300">
            <span className="relative">
                <Bell size={18} className="group-hover:scale-110 transition-transform shrink-0" />
                {unreadCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-0.5 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center ring-2 ring-background leading-none">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </span>
            <span className="relative">
                {t('nav.notifications')}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full"></span>
            </span>
        </Link>
    );

    return (
        <div className="min-h-screen flex flex-col font-sans bg-background text-foreground transition-colors duration-300">
            {/* Header */}
            <header className="bg-background/80 backdrop-blur-md border-b border-border sticky top-0 z-50 shadow-sm/5">
                <div className="w-full px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">

                    {/* Logo - pinned to the far left */}
                    <Link to="/" className="flex items-center shrink-0 transition-transform hover:scale-105 active:scale-95 duration-200">
                        <img src={logo} alt="Teddy Rental" className="w-32 h-11 object-contain" />
                    </Link>

                    {/* Center + Right: all nav items and actions in one unified row with equal gaps */}
                    <div className="hidden lg:flex items-center gap-6 flex-1 justify-end">
                        <Link to="/" className="group flex items-center gap-2 text-base text-muted-foreground hover:text-foreground font-semibold transition-all duration-300">
                            <HomeIcon size={18} className="group-hover:scale-110 transition-transform shrink-0" />
                            <span className="relative">
                                {t('nav.home')}
                                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full"></span>
                            </span>
                        </Link>

                        {isAuthenticated && (
                            <Link to="/my-bookings" className="group flex items-center gap-2 text-base text-muted-foreground hover:text-foreground font-semibold transition-all duration-300">
                                <Briefcase size={18} className="group-hover:scale-110 transition-transform shrink-0" />
                                <span className="relative">
                                    {t('nav.myRentals')}
                                    <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full"></span>
                                </span>
                            </Link>
                        )}

                        {isAuthenticated && user?.role === 'CUSTOMER' ? (
                            <>
                                <Link to="/payments" className="group flex items-center gap-2 text-base text-muted-foreground hover:text-foreground font-semibold transition-all duration-300">
                                    <Wallet size={18} className="group-hover:scale-110 transition-transform shrink-0" />
                                    <span className="relative">
                                        {t('nav.balance')}
                                        <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full"></span>
                                    </span>
                                </Link>
                                <BellLink />
                            </>
                        ) : isAuthenticated ? (
                            <BellLink />
                        ) : null}

                        <Link to="/about" className="group flex items-center gap-2 text-base text-muted-foreground hover:text-foreground font-semibold transition-all duration-300">
                            <Info size={18} className="group-hover:scale-110 transition-transform shrink-0" />
                            <span className="relative">
                                {t('nav.about')}
                                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full"></span>
                            </span>
                        </Link>

                        {/* Divider */}
                        <div className="w-px h-5 bg-border shrink-0" />

                        <ThemeToggle />
                        <LanguageSwitcher />

                        {!isAuthenticated ? (
                            <>
                                <Link to="/login" className="group flex items-center gap-2 text-base text-muted-foreground hover:text-foreground font-bold transition-colors">
                                    <LogIn size={18} />
                                    {t('nav.signIn')}
                                </Link>
                                <Link to="/register" className="flex items-center gap-2 text-base bg-primary text-primary-foreground px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-0.5 active:translate-y-0.5 transition-all duration-300">
                                    <UserPlus size={18} />
                                    {t('nav.signUp')}
                                </Link>
                            </>
                        ) : (
                            <div className="flex items-center gap-3">
                                <Link to="/profile" className="h-10 w-10 rounded-xl bg-muted/50 border border-border flex items-center justify-center text-primary hover:bg-muted group overflow-hidden shrink-0" title="My Profile">
                                    {user?.profile?.profilePhotoUrl ? (
                                        <img src={api.getImageUrl(user.profile.profilePhotoUrl)} alt="Profile" className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                                    ) : (
                                        <User size={20} className="group-hover:scale-110 transition-transform" />
                                    )}
                                </Link>
                                <div className="flex flex-col leading-tight">
                                    <span className="text-sm font-bold text-foreground whitespace-nowrap">
                                        {user?.profile?.firstName || user?.email?.split('@')[0]}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
                                        {user?.role}
                                    </span>
                                </div>
                                <button
                                    onClick={handleLogout}
                                    className="p-2 rounded-xl text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-300 shrink-0"
                                    title="Sign Out"
                                >
                                    <LogOut size={18} />
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 bg-muted/30">
                <Outlet />
            </main>

            {/* Footer */}
            <footer className="bg-gray-900 text-white py-12">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8">
                    <div>
                        <img src={logo} alt="Teddy Rental" className="w-20 h-20 object-contain mb-4" />
                        <p className="text-gray-400">{t('footer.desc')}</p>
                    </div>
                    <div>
                        <h4 className="font-bold mb-4">{t('footer.quickLinks')}</h4>
                        <ul className="space-y-2 text-gray-400">
                            <li><Link to="/" className="hover:text-white">{t('nav.home')}</Link></li>
                            <li><Link to="/about" className="hover:text-white">{t('nav.about')}</Link></li>
                            <li><Link to="/contact" className="hover:text-white">{t('contact.title')}</Link></li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-bold mb-4">{t('footer.legal')}</h4>
                        <ul className="space-y-2 text-gray-400">
                            <li><Link to="/terms" className="hover:text-white">{t('terms of service')}</Link></li>
                            <li><Link to="/privacy" className="hover:text-white">{t('privacy and setting')}</Link></li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-bold mb-4">{t('footer.connect')}</h4>
                        <div className="flex flex-col space-y-2 text-gray-400">
                            <a href="https://maps.google.com/?q=Bole+Road,+Addis+Ababa,+Ethiopia" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">{t('contact.addressText')}</a>
                            <a href="tel:+251900000000" className="hover:text-white transition-colors">+251 911452860</a>
                            <a href="mailto:info@teddyrental.com" className="hover:text-white transition-colors">teddycarrental@gmail.com</a>
                        </div>
                    </div>
                </div>
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 mt-8 pt-8 border-t border-gray-800 text-center text-gray-500">
                    © {new Date().getFullYear()} Teddy Car Rental. {t('footer.rights')}
                </div>
            </footer>
        </div>
    );
};

export default Layout;
