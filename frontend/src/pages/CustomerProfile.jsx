import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

const CustomerProfile = () => {
    const navigate = useNavigate();
    const { user, refreshUser } = useAuth();

    const [loading, setLoading] = useState(false);
    const [bankAccount, setBankAccount] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phoneNumber: '',
        address: '',
        profilePhotoUrl: ''
    });

    useEffect(() => {
        if (!user) return;

        // Populate profile fields if available
        setFormData({
            firstName: user.profile?.firstName || '',
            lastName: user.profile?.lastName || '',
            email: user.email || '',
            phoneNumber: user.profile?.phoneNumber || '',
            address: user.profile?.address || '',
            profilePhotoUrl: user.profile?.profilePhotoUrl || ''
        });

        // fetch bank account info for any logged-in user
        (async () => {
            try {
                const res = await api.get('/payment/local-bank/account');
                setBankAccount(res.account || null);
            } catch (e) {
                console.warn('Could not fetch bank account:', e.message || e);
                setBankAccount(null);
            }
        })();
    }, [user]);

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        const data = new FormData();
        data.append('document', file); // using existing /upload/document endpoint

        try {
            const res = await api.upload('/upload/document', data);
            setFormData(prev => ({ ...prev, profilePhotoUrl: res.url }));
            toast.success('Photo uploaded successfully. Save to keep changes.');
        } catch (error) {
            toast.error(error.message || 'Failed to upload photo');
        } finally {
            setUploading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        const nameRegex = /^[A-Za-z\s]+$/;
        if (formData.firstName && !nameRegex.test(formData.firstName)) {
            toast.error('First name must contain only letters');
            setLoading(false);
            return;
        }
        if (formData.lastName && !nameRegex.test(formData.lastName)) {
            toast.error('Last name must contain only letters');
            setLoading(false);
            return;
        }

        try {
            await api.patch('/auth/profile', formData);
            await refreshUser();
            toast.success('Profile updated successfully');
        } catch (error) {
            toast.error(error.message || 'Failed to update profile');
        } finally {
            setLoading(false);
        }
    };

    if (!user) return null;

    return (
        <div className="max-w-3xl mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold">My Profile</h1>
                <Button variant="outline" onClick={() => navigate('/security-settings')}>
                    Security Settings
                </Button>

            </div>

            <div className="bg-white rounded-lg shadow-sm border p-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                    {bankAccount && (
                        <div className="mb-6 p-4 border rounded-md bg-gray-50">
                            <h2 className="text-lg font-semibold mb-2">Bank Account</h2>
                            <div className="text-sm text-muted-foreground">Account Number: {bankAccount.accountNumber}</div>
                            <div className="text-sm">Balance: {bankAccount.balance.toLocaleString()} ETB</div>
                            <div className="mt-2">
                                <a href="/payments" className="text-primary underline">View payment history & details</a>
                            </div>
                        </div>
                    )}
                    <div className="flex flex-col items-center mb-6">
                        <div className="w-32 h-32 rounded-full bg-gray-200 overflow-hidden mb-4 border-2 border-primary">
                            {formData.profilePhotoUrl ? (
                                <img src={api.getImageUrl(formData.profilePhotoUrl)} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-500">No Photo</div>
                            )}
                        </div>
                        <label className="cursor-pointer bg-secondary text-secondary-foreground px-4 py-2 rounded-md hover:bg-secondary/80 transition-colors">
                            {uploading ? 'Uploading...' : 'Change Photo'}
                            <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} disabled={uploading} />
                        </label>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
                            <input
                                type="text"
                                value={formData.firstName}
                                onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                                className="w-full p-2 border rounded-md"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
                            <input
                                type="text"
                                value={formData.lastName}
                                onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                                className="w-full p-2 border rounded-md"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                            <input
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                                className="w-full p-2 border rounded-md"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                            <input
                                type="tel"
                                value={formData.phoneNumber}
                                onChange={(e) => setFormData(prev => ({ ...prev, phoneNumber: e.target.value }))}
                                className="w-full p-2 border rounded-md"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                            <input
                                type="text"
                                value={formData.address}
                                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                                className="w-full p-2 border rounded-md"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end pt-4">
                        <Button type="submit" isLoading={loading}>
                            Save Changes
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CustomerProfile;
