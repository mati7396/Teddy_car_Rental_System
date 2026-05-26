import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, MapPin, Camera, Loader2, Save, Briefcase } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import EmployeeLayout from "@/components/employee-layout";
import { useAuth } from '@/context/AuthContext';
import { api } from '@/api';
import { toast } from 'sonner';

const EmployeeProfile = () => {
    const { user, refreshUser } = useAuth();
    const [loading, setLoading] = useState(false);
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
        if (user && user.profile) {
            setFormData({
                firstName: user.profile.firstName || '',
                lastName: user.profile.lastName || '',
                email: user.email || '',
                phoneNumber: user.profile.phoneNumber || '',
                address: user.profile.address || '',
                profilePhotoUrl: user.profile.profilePhotoUrl || ''
            });
        }
    }, [user]);

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        const data = new FormData();
        data.append('document', file);

        try {
            const res = await api.upload('/upload/document', data);
            setFormData(prev => ({ ...prev, profilePhotoUrl: res.url }));
            toast.success('Photo uploaded successfully. Click Save to apply.');
        } catch (error) {
            toast.error(error.message || 'Failed to upload photo');
        } finally {
            setUploading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Basic validation
        const nameRegex = /^[A-Za-z\s]+$/;
        if (formData.firstName && !nameRegex.test(formData.firstName)) {
            toast.error('First name must contain only letters');
            return;
        }
        if (formData.lastName && !nameRegex.test(formData.lastName)) {
            toast.error('Last name must contain only letters');
            return;
        }

        setLoading(true);
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

    return (
        <EmployeeLayout>
            <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">My Profile</h1>
                    <p className="text-muted-foreground mt-1">Manage your staff account information and preferences.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: Avatar & Summary */}
                    <div className="space-y-6">
                        <Card className="border-border/60 shadow-md">
                            <CardContent className="pt-8 flex flex-col items-center text-center">
                                <div className="relative group">
                                    <Avatar className="h-32 w-32 border-4 border-primary/10 shadow-xl">
                                        <AvatarImage src={api.getImageUrl(formData.profilePhotoUrl)} className="object-cover" />
                                        <AvatarFallback className="bg-primary/5 text-primary text-3xl font-bold">
                                            {formData.firstName?.[0] || 'E'}{formData.lastName?.[0] || 'U'}
                                        </AvatarFallback>
                                    </Avatar>
                                    <label className="absolute bottom-0 right-0 p-2 bg-primary text-primary-foreground rounded-full shadow-lg cursor-pointer hover:scale-110 transition-transform group-hover:bg-primary/90">
                                        {uploading ? <Loader2 size={18} className="animate-spin" /> : <Camera size={18} />}
                                        <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} disabled={uploading} />
                                    </label>
                                </div>
                                
                                <div className="mt-6">
                                    <h3 className="text-xl font-bold">{formData.firstName} {formData.lastName}</h3>
                                    <div className="flex items-center justify-center gap-1 text-primary font-semibold mt-1">
                                        <Briefcase size={14} />
                                        <span className="text-sm uppercase tracking-wider">Staff Member</span>
                                    </div>
                                    <div className="flex items-center justify-center gap-2 mt-4 text-xs text-muted-foreground bg-muted/50 px-3 py-1 rounded-full">
                                        <div className="h-2 w-2 bg-emerald-500 rounded-full" />
                                        Active Account
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-border/60 shadow-sm bg-muted/20 border-dashed">
                            <CardContent className="pt-6 space-y-4 text-muted-foreground">
                                <div className="flex items-center gap-3 text-sm">
                                    <Mail size={16} className="text-primary" />
                                    <span className="truncate">{formData.email}</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm">
                                    <Phone size={16} className="text-primary" />
                                    <span>{formData.phoneNumber || 'Not provided'}</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm">
                                    <MapPin size={16} className="text-primary" />
                                    <span className="leading-tight">{formData.address || 'Not provided'}</span>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right Column: Edit Form */}
                    <div className="lg:col-span-2">
                        <Card className="border-border/60 shadow-lg">
                            <CardHeader className="border-b bg-muted/30">
                                <CardTitle>Edit Profile Information</CardTitle>
                                <CardDescription>Update your personal details here.</CardDescription>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <form onSubmit={handleSubmit} className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="firstName">First Name</Label>
                                            <Input 
                                                id="firstName" 
                                                required 
                                                value={formData.firstName} 
                                                onChange={e => setFormData({ ...formData, firstName: e.target.value })} 
                                                placeholder="Enter first name"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="lastName">Last Name</Label>
                                            <Input 
                                                id="lastName" 
                                                required 
                                                value={formData.lastName} 
                                                onChange={e => setFormData({ ...formData, lastName: e.target.value })} 
                                                placeholder="Enter last name"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="email">Email Address</Label>
                                        <Input 
                                            id="email" 
                                            type="email" 
                                            required 
                                            value={formData.email} 
                                            onChange={e => setFormData({ ...formData, email: e.target.value })} 
                                            placeholder="employee@teddyrental.com"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="phoneNumber">Phone Number</Label>
                                        <Input 
                                            id="phoneNumber" 
                                            value={formData.phoneNumber} 
                                            onChange={e => setFormData({ ...formData, phoneNumber: e.target.value })} 
                                            placeholder="+251 912 345 678"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="address">Address</Label>
                                        <Input 
                                            id="address" 
                                            value={formData.address} 
                                            onChange={e => setFormData({ ...formData, address: e.target.value })} 
                                            placeholder="City, Region"
                                        />
                                    </div>

                                    <div className="flex justify-end pt-4 border-t border-border mt-6">
                                        <Button type="submit" disabled={loading} className="px-8 shadow-lg shadow-primary/20">
                                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                            Save Changes
                                        </Button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </EmployeeLayout>
    );
};

export default EmployeeProfile;
