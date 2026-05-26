import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

const Register = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { register } = useAuth();
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: ''
    });
    const [searchParams] = useSearchParams();
    const carId = searchParams.get('carId');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // Unified Registration: No longer blocks without carId.
    // If carId flows in from Home, we keep it for redirecting at the end of onboarding.

    

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (formData.password !== formData.confirmPassword) {
            setError(t('auth.passwordsNoMatch'));
            return;
        }

        setLoading(true);

        try {
            await register({
                email: formData.email,
                password: formData.password,
                firstName: formData.firstName,
                lastName: formData.lastName,
                phoneNumber: formData.phone,
                role: 'CUSTOMER'
            });

            if (carId) {
                navigate(`/upload-docs?carId=${carId}`);
            } else {
                navigate('/upload-docs');
            }
        } catch (err) {
            const msg = err.message || 'Registration failed';
            setError(msg);
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };


    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    return (
        <div className="min-h-[85vh] flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-background">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <div className="text-center mb-6">
                    <h1 className="text-2xl font-bold text-primary mb-2">{t('auth.joinTeddy')}</h1>
                    <h2 className="text-3xl font-extrabold text-foreground tracking-tight">
                        {t('auth.createAccount')}
                    </h2>
                </div>

                <div className="bg-card py-10 px-6 shadow-xl rounded-2xl border border-border sm:px-10 relative">
                    <form className="space-y-5" onSubmit={handleSubmit}>
                        {error && (
                            <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4 rounded-r-md">
                                <div className="flex">
                                    <div className="ml-3">
                                        <p className="text-sm font-medium text-red-700">{error}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="firstName" className="block text-sm font-semibold text-muted-foreground mb-1">
                                    {t('auth.firstName')}
                                </label>
                                <input
                                    id="firstName"
                                    name="firstName"
                                    type="text"
                                    required
                                    className="appearance-none block w-full px-4 py-3 border border-border rounded-lg shadow-sm placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary sm:text-sm transition-all text-foreground bg-muted/20"
                                    value={formData.firstName}
                                    onChange={handleChange}
                                />
                            </div>
                            <div>
                                <label htmlFor="lastName" className="block text-sm font-semibold text-muted-foreground mb-1">
                                    {t('auth.lastName')}
                                </label>
                                <input
                                    id="lastName"
                                    name="lastName"
                                    type="text"
                                    required
                                    className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary sm:text-sm transition-all text-gray-900"
                                    value={formData.lastName}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="email" className="block text-sm font-semibold text-muted-foreground mb-1">
                                {t('auth.emailAddress')}
                            </label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                className="appearance-none block w-full px-4 py-3 border border-border rounded-lg shadow-sm placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary sm:text-sm transition-all text-foreground bg-muted/20"
                                value={formData.email}
                                onChange={handleChange}
                            />
                        </div>

                        <div>
                            <label htmlFor="phone" className="block text-sm font-semibold text-muted-foreground mb-1">
                                {t('auth.phone')}
                            </label>
                            <input
                                id="phone"
                                name="phone"
                                type="tel"
                                required
                                className="appearance-none block w-full px-4 py-3 border border-border rounded-lg shadow-sm placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary sm:text-sm transition-all text-foreground bg-muted/20"
                                value={formData.phone}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="password" className="block text-sm font-semibold text-muted-foreground mb-1">
                                    {t('auth.password')}
                                </label>
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    required
                                    className="appearance-none block w-full px-4 py-3 border border-border rounded-lg shadow-sm placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary sm:text-sm transition-all text-foreground bg-muted/20"
                                    value={formData.password}
                                    onChange={handleChange}
                                />
                            </div>

                            <div>
                                <label htmlFor="confirmPassword" className="block text-sm font-semibold text-muted-foreground mb-1">
                                    {t('auth.confirmPassword')}
                                </label>
                                <input
                                    id="confirmPassword"
                                    name="confirmPassword"
                                    type="password"
                                    required
                                    className="appearance-none block w-full px-4 py-3 border border-border rounded-lg shadow-sm placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary sm:text-sm transition-all text-foreground bg-muted/20"
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>

                        {/* Buttons moved below the card to match Sign In layout */}
                        <div className="pt-4">
                            <button type="submit" disabled={loading} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground border-transparent shadow-md hover:shadow-lg transition-all py-3">
                                {loading ? t('auth.loading') : t('auth.signUp')}
                            </button>
                        </div>

                        <div className="mt-4 text-center">
                            <span className="text-sm text-muted-foreground">
                                {t('auth.alreadyHaveAccount')}{' '}
                                <Link to={carId ? `/login?carId=${carId}` : '/login'} className="text-primary font-semibold hover:underline">
                                    {t('auth.signInHere')}
                                </Link>
                            </span>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Register;
