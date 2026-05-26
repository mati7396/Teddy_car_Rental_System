import React, { useState } from 'react';
import { Shield, Lock, CheckCircle2, AlertCircle, Loader2, Eye, EyeOff } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import AdminLayout from "@/components/admin-layout";
import EmployeeLayout from "@/components/employee-layout";
import Layout from "@/components/Layout";
import { useAuth } from '@/context/AuthContext';
import { api } from '@/api';
import { toast } from 'sonner';

const SecuritySettings = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [showPasswords, setShowPasswords] = useState({
        current: false,
        new: false,
        confirm: false
    });

    const [formData, setFormData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (formData.newPassword !== formData.confirmPassword) {
            toast.error('New passwords do not match');
            return;
        }

        if (formData.newPassword.length < 6) {
            toast.error('Password must be at least 6 characters');
            return;
        }

        setLoading(true);
        try {
            await api.post('/auth/change-password', {
                currentPassword: formData.currentPassword,
                newPassword: formData.newPassword
            });
            toast.success('Password changed successfully');
            setFormData({
                currentPassword: '',
                newPassword: '',
                confirmPassword: ''
            });
        } catch (error) {
            toast.error(error.message || 'Failed to change password');
        } finally {
            setLoading(false);
        }
    };

    const togglePasswordVisibility = (field) => {
        setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
    };

    const content = (
        <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-primary/10 rounded-lg">
                    <Shield className="text-primary" size={24} />
                </div>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Security Settings</h1>
                    <p className="text-muted-foreground">Manage your account security and password.</p>
                </div>
            </div>

            <Card className="border-border/60 shadow-lg">
                <CardHeader className="border-b bg-muted/30">
                    <CardTitle className="flex items-center gap-2">
                        <Lock size={18} className="text-primary" />
                        Change Password
                    </CardTitle>
                    <CardDescription>
                        Update your password to keep your account secure.
                    </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="currentPassword">Current Password</Label>
                            <div className="relative">
                                <Input 
                                    id="currentPassword" 
                                    type={showPasswords.current ? "text" : "password"} 
                                    required 
                                    value={formData.currentPassword}
                                    onChange={e => setFormData({ ...formData, currentPassword: e.target.value })}
                                    className="pr-10"
                                />
                                <button 
                                    type="button"
                                    onClick={() => togglePasswordVisibility('current')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                >
                                    {showPasswords.current ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="newPassword">New Password</Label>
                            <div className="relative">
                                <Input 
                                    id="newPassword" 
                                    type={showPasswords.new ? "text" : "password"} 
                                    required 
                                    value={formData.newPassword}
                                    onChange={e => setFormData({ ...formData, newPassword: e.target.value })}
                                    className="pr-10"
                                />
                                <button 
                                    type="button"
                                    onClick={() => togglePasswordVisibility('new')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                >
                                    {showPasswords.new ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword">Confirm New Password</Label>
                            <div className="relative">
                                <Input 
                                    id="confirmPassword" 
                                    type={showPasswords.confirm ? "text" : "password"} 
                                    required 
                                    value={formData.confirmPassword}
                                    onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
                                    className="pr-10"
                                />
                                <button 
                                    type="button"
                                    onClick={() => togglePasswordVisibility('confirm')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                >
                                    {showPasswords.confirm ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        <div className="pt-4 flex justify-end">
                            <Button type="submit" disabled={loading} className="px-8 shadow-lg shadow-primary/20">
                                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                                Update Password
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            <Card className="border-border/60 bg-muted/10 border-dashed">
                <CardContent className="pt-6">
                    <div className="flex gap-4">
                        <div className="p-2 bg-yellow-500/10 rounded-full h-fit mt-1">
                            <AlertCircle className="text-yellow-600" size={20} />
                        </div>
                        <div className="space-y-1">
                            <h4 className="font-semibold text-sm">Password Requirements</h4>
                            <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
                                <li>Minimum 6 characters long</li>
                                <li>Should be different from your current password</li>
                                <li>Avoid using common words or easily guessable patterns</li>
                            </ul>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );

    // Wrap with appropriate layout
    if (user?.role === 'ADMIN') {
        return <AdminLayout>{content}</AdminLayout>;
    } else if (user?.role === 'EMPLOYEE') {
        return <EmployeeLayout>{content}</EmployeeLayout>;
    } else {
        return (
            <div className="py-12">
                <Layout>
                    <div className="container mx-auto px-4">
                        {content}
                    </div>
                </Layout>
            </div>
        );
    }
};

export default SecuritySettings;
