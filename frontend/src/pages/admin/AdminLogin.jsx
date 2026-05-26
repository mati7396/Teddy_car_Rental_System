import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import logo from '../../assets/logo.png';
import { Button } from '@/components/ui/button';
import { useAuth } from '../../context/AuthContext';

const AdminLogin = () => {
    const navigate = useNavigate();
    const { login } = useAuth();
    const [formData, setFormData] = useState({ email: '', password: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const user = await login(formData.email, formData.password);

            if (user.role === 'ADMIN' || user.role === 'EMPLOYEE') {
                const redirectPath = user.role === 'ADMIN' ? '/admin/dashboard' : '/employee/dashboard';
                navigate(redirectPath);
            } else {
                setError('Unauthorized: This portal is for staff only.');
            }
        } catch (err) {
            setError(err.message || 'Invalid staff credentials.');
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
                        Employee Portal
                    </h2>
                    <p className="mt-2 text-sm text-gray-600">
                        Authorized personnel only
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
                            <label htmlFor="email" className="sr-only">Email address</label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                required
                                className="appearance-none rounded-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm"
                                placeholder="Email address"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            />
                        </div>
                        <div>
                            <label htmlFor="password" className="sr-only">Password</label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                required
                                className="appearance-none rounded-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm"
                                placeholder="Password"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            />
                        </div>
                    </div>

                    <div>
                        <Button type="submit" isLoading={loading}>
                            Access Dashboard
                        </Button>
                    </div>

                    <div className="text-center">
                        <Link to="/" className="text-sm text-gray-500 hover:text-primary">
                            Return to Public Site
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AdminLogin;
