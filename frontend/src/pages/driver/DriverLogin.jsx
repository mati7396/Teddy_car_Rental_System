import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Navigation } from 'lucide-react';
import logo from '../../assets/logo.png';
import { Button } from '@/components/ui/button';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

const DriverLogin = () => {
    const navigate = useNavigate();
    const { driverLogin } = useAuth();
    const [formData, setFormData] = useState({ email: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { t } = useTranslation();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const user = await driverLogin(formData.email, formData.password);
            toast.success('Login successful!');
            navigate('/driver/dashboard');
        } catch (err) {
            const msg = err.response?.data?.message || 'Invalid email or password';
            setError(msg);
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-xl shadow-2xl">
                <div className="text-center">
                    <div className="mx-auto h-20 w-40 flex items-center justify-center">
                        <img src={logo} alt="Teddy Rental" className="h-16 object-contain" />
                    </div>
                    <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
                        {t('driver.driverPortal', 'Driver Portal')}
                    </h2>
                    <p className="mt-2 text-sm text-gray-600">
                        Authorized drivers only
                    </p>
                </div>

                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    {error && (
                        <div className="bg-red-50 border-l-4 border-red-500 p-4 text-sm text-red-700">
                            {error}
                        </div>
                    )}

                    <div className="rounded-md shadow-sm -space-y-px">
                        <div>
                            <label htmlFor="email" className="sr-only">{t('auth.email', 'Email Address')}</label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                required
                                className="appearance-none rounded-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm"
                                placeholder={t('auth.emailPlaceholder', 'driver@example.com')}
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            />
                        </div>
                        <div>
                            <label htmlFor="password" className="sr-only">{t('auth.password', 'Password')}</label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                required
                                className="appearance-none rounded-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm"
                                placeholder="••••••••"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            />
                        </div>
                    </div>

                    <div>
                        <Button type="submit" isLoading={loading} className="w-full py-3">
                            {t('auth.signIn', 'Sign In')}
                        </Button>
                    </div>

                    <div className="text-center">
                        <Link to="/" className="text-sm text-gray-500 hover:text-primary transition-colors">
                            Return to Public Site
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default DriverLogin;
