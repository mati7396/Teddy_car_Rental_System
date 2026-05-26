import React, { useState, useEffect } from 'react';
import { 
    User, Phone, Mail, Lock, ShieldCheck, Loader2, Save, 
    KeyRound, AlertCircle, Camera, CheckCircle2
} from 'lucide-react';
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

// Shadcn Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DriverLayout from "@/components/driver-layout";
import { api } from "@/api";
import { useTranslation } from 'react-i18next';

const DriverProfile = () => {
    const { user, setUser } = useAuth();
    const [profileLoading, setProfileLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [changingPassword, setChangingPassword] = useState(false);
    const { t } = useTranslation();

    const [formData, setFormData] = useState({
        fullName: '',
        phone: '',
        email: '',
        licenseNumber: '',
        profilePictureUrl: ''
    });

    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    const fetchProfile = async () => {
        try {
            setProfileLoading(true);
            const data = await api.get('/drivers/profile');
            setFormData({
                fullName: data.fullName,
                phone: data.phone,
                email: data.email,
                licenseNumber: data.licenseNumber || '',
                profilePictureUrl: data.profilePictureUrl || ''
            });
        } catch (error) {
            console.error('Failed to fetch profile:', error);
            toast.error("Could not load profile data");
        } finally {
            setProfileLoading(false);
        }
    };

    useEffect(() => {
        fetchProfile();
    }, []);

    const handleProfileUpdate = async (e) => {
        e.preventDefault();
        try {
            setUpdating(true);
            const response = await api.put('/drivers/profile', {
                fullName: formData.fullName,
                phone: formData.phone,
                licenseNumber: formData.licenseNumber,
                profilePictureUrl: formData.profilePictureUrl
            });
            toast.success(t('driver.updateSuccess') || "Profile updated successfully");
            // Update auth context user data
            if (user && response.driver) {
                setUser({ 
                    ...user, 
                    fullName: response.driver.fullName,
                    phone: response.driver.phone,
                    profilePictureUrl: response.driver.profilePictureUrl
                });
            }
        } catch (error) {
            console.error('Profile update failed:', error);
            toast.error(error.message || t('driver.updateError'));
        } finally {
            setUpdating(false);
        }
    };

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        const data = new FormData();
        data.append('document', file);

        try {
            const res = await api.upload('/upload/document', data);
            setFormData(prev => ({ ...prev, profilePictureUrl: res.url }));
            toast.success(t('employee.imageUploaded', 'Photo uploaded successfully. Click Save to apply.'));
        } catch (error) {
            toast.error(error.message || t('driver.updateError', 'Failed to upload photo'));
        } finally {
            setUploading(false);
        }
    };

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            toast.error(t('driver.passwordMismatch') || "New passwords do not match");
            return;
        }

        try {
            setChangingPassword(true);
            await api.put('/drivers/change-password', {
                currentPassword: passwordData.currentPassword,
                newPassword: passwordData.newPassword
            });
            toast.success(t('driver.passwordSuccess') || "Password changed successfully");
            setPasswordData({
                currentPassword: '',
                newPassword: '',
                confirmPassword: ''
            });
        } catch (error) {
            console.error('Password change failed:', error);
            toast.error(error.message || t('driver.passwordError'));
        } finally {
            setChangingPassword(false);
        }
    };

    if (profileLoading) {
        return (
            <DriverLayout>
                <div className="flex flex-col items-center justify-center py-32 space-y-4">
                    <Loader2 className="animate-spin text-primary" size={64} />
                    <p className="text-xl font-bold text-muted-foreground">{t('driver.loading')}</p>
                </div>
            </DriverLayout>
        );
    }

    return (
        <DriverLayout>
            <div className="max-w-4xl mx-auto space-y-8 py-6">
                <div className="space-y-1">
                    <h1 className="text-4xl font-black tracking-tight text-foreground">{t('driver.myAccount')}</h1>
                    <p className="text-lg text-muted-foreground font-medium">{t('driver.profileDesc')}</p>
                </div>

                <Tabs defaultValue="profile" className="space-y-6">
                    <TabsList className="bg-muted/50 p-1 rounded-2xl border border-border/40 inline-flex">
                        <TabsTrigger value="profile" className="rounded-xl px-8 py-2.5 font-bold data-[state=active]:bg-card data-[state=active]:shadow-lg data-[state=active]:text-primary transition-all">
                            <User size={16} className="mr-2" /> {t('driver.myProfile', 'Profile')}
                        </TabsTrigger>
                        <TabsTrigger value="security" className="rounded-xl px-8 py-2.5 font-bold data-[state=active]:bg-card data-[state=active]:shadow-lg data-[state=active]:text-primary transition-all">
                            <Lock size={16} className="mr-2" /> {t('driver.security', 'Security')}
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="profile" className="space-y-6 outline-none">
                        <Card className="border-none shadow-xl bg-card rounded-3xl overflow-hidden">
                            <CardHeader className="bg-primary/5 border-b border-primary/10 p-8">
                                <CardTitle className="text-2xl font-bold flex items-center gap-3">
                                    <User className="text-primary" size={24} />
                                    {t('driver.personalInfo')}
                                </CardTitle>
                                <CardDescription className="text-base font-medium">{t('driver.updateInfo')}</CardDescription>
                            </CardHeader>
                            <CardContent className="p-8">
                                <form onSubmit={handleProfileUpdate} className="space-y-8">
                                    <div className="flex flex-col md:flex-row items-center gap-8 mb-4">
                                        <div className="relative group">
                                            <Avatar className="w-32 h-32 border-4 border-primary/20 shadow-xl">
                                                <AvatarImage src={api.getImageUrl(formData.profilePictureUrl)} className="object-cover" />
                                                <AvatarFallback className="bg-primary/10 text-primary text-5xl font-black rounded-3xl">
                                                    {formData.fullName?.[0] || 'D'}
                                                </AvatarFallback>
                                            </Avatar>
                                            <label className="absolute -bottom-2 -right-2 w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center shadow-lg border-2 border-card cursor-pointer group-hover:scale-110 transition-transform">
                                                {uploading ? <Loader2 size={18} className="animate-spin" /> : <Camera size={18} />}
                                                <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} disabled={uploading} />
                                            </label>
                                        </div>
                                        <div className="space-y-1 text-center md:text-left">
                                            <h3 className="text-2xl font-bold">{formData.fullName}</h3>
                                            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 px-3 py-1 rounded-full font-bold">
                                                    <ShieldCheck size={12} className="mr-1.5" /> {t('driver.verifiedDriver')}
                                                </Badge>
                                                <span className="text-muted-foreground text-sm font-medium">{t('driver.memberSince')} {format(new Date(user?.createdAt || Date.now()), 'MMMM yyyy')}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <Separator className="bg-border/60" />

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-3">
                                            <Label htmlFor="fullName" className="text-sm font-black uppercase tracking-widest text-muted-foreground">{t('driver.firstName')} / {t('driver.lastName')}</Label>
                                            <div className="relative">
                                                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                                                <Input 
                                                    id="fullName" 
                                                    className="pl-12 h-12 bg-muted/30 border-border/60 rounded-xl font-medium focus:ring-primary/20" 
                                                    value={formData.fullName}
                                                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                                    required
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-3">
                                            <Label htmlFor="phone" className="text-sm font-black uppercase tracking-widest text-muted-foreground">{t('driver.phone')}</Label>
                                            <div className="relative">
                                                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                                                <Input 
                                                    id="phone" 
                                                    className="pl-12 h-12 bg-muted/30 border-border/60 rounded-xl font-medium focus:ring-primary/20" 
                                                    value={formData.phone}
                                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                                    required
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-3 md:col-span-2">
                                            <Label htmlFor="licenseNumber" className="text-sm font-black uppercase tracking-widest text-muted-foreground">{t('driver.driverLicense')}</Label>
                                            <div className="relative">
                                                <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                                                <Input 
                                                    id="licenseNumber" 
                                                    className="pl-12 h-12 bg-muted/30 border-border/60 rounded-xl font-medium focus:ring-primary/20 uppercase" 
                                                    value={formData.licenseNumber}
                                                    onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                                                    placeholder="Enter your driver's license number"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-3 md:col-span-2">
                                            <Label htmlFor="email" className="text-sm font-black uppercase tracking-widest text-muted-foreground">{t('driver.email')}</Label>
                                            <div className="relative opacity-60">
                                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                                                <Input 
                                                    id="email" 
                                                    className="pl-12 h-12 bg-muted/30 border-border/60 rounded-xl font-medium" 
                                                    value={formData.email}
                                                    disabled
                                                />
                                            </div>
                                            <p className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium">
                                                <AlertCircle size={12} /> {t('driver.contactAdminEmail')}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="pt-4">
                                        <Button type="submit" size="lg" className="h-12 px-8 rounded-xl font-bold shadow-lg shadow-primary/20" disabled={updating}>
                                            {updating ? <Loader2 className="animate-spin mr-2" size={18} /> : <Save size={18} className="mr-2" />}
                                            {t('driver.saveChanges')}
                                        </Button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="security" className="space-y-6 outline-none">
                        <Card className="border-none shadow-xl bg-card rounded-3xl overflow-hidden">
                            <CardHeader className="bg-red-500/5 border-b border-red-500/10 p-8">
                                <CardTitle className="text-2xl font-bold flex items-center gap-3 text-red-700">
                                    <KeyRound size={24} />
                                    {t('driver.changePassword')}
                                </CardTitle>
                                <CardDescription className="text-base font-medium">{t('driver.updatePassword')}</CardDescription>
                            </CardHeader>
                            <CardContent className="p-8">
                                <form onSubmit={handlePasswordChange} className="space-y-8 max-w-md">
                                    <div className="space-y-6">
                                        <div className="space-y-3">
                                            <Label htmlFor="currentPassword" className="text-sm font-black uppercase tracking-widest text-muted-foreground">{t('driver.currentPassword')}</Label>
                                            <div className="relative">
                                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                                                <Input 
                                                    id="currentPassword" 
                                                    type="password"
                                                    className="pl-12 h-12 bg-muted/30 border-border/60 rounded-xl font-medium focus:ring-primary/20" 
                                                    value={passwordData.currentPassword}
                                                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                                                    required
                                                />
                                            </div>
                                        </div>
                                        
                                        <Separator className="bg-border/60" />

                                        <div className="space-y-3">
                                            <Label htmlFor="newPassword" className="text-sm font-black uppercase tracking-widest text-muted-foreground">{t('driver.newPassword')}</Label>
                                            <div className="relative">
                                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                                                <Input 
                                                    id="newPassword" 
                                                    type="password"
                                                    className="pl-12 h-12 bg-muted/30 border-border/60 rounded-xl font-medium focus:ring-primary/20" 
                                                    value={passwordData.newPassword}
                                                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                                    required
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-3">
                                            <Label htmlFor="confirmPassword" className="text-sm font-black uppercase tracking-widest text-muted-foreground">{t('driver.confirmPassword')}</Label>
                                            <div className="relative">
                                                <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                                                <Input 
                                                    id="confirmPassword" 
                                                    type="password"
                                                    className="pl-12 h-12 bg-muted/30 border-border/60 rounded-xl font-medium focus:ring-primary/20" 
                                                    value={passwordData.confirmPassword}
                                                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                                    required
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-4">
                                        <Button type="submit" size="lg" className="h-12 px-8 rounded-xl font-bold bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-500/20" disabled={changingPassword}>
                                            {changingPassword ? <Loader2 className="animate-spin mr-2" size={18} /> : <CheckCircle2 size={18} className="mr-2" />}
                                            {t('driver.changePassword')}
                                        </Button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </DriverLayout>
    );
};

export default DriverProfile;
