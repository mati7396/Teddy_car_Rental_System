import React from 'react';
import { 
    Navigation, Package, User, Clock, ArrowRight, Bell, Calendar, MapPin
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from "@/context/AuthContext";
import { useTranslation } from 'react-i18next';

// Shadcn Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import DriverLayout from "@/components/driver-layout";

const DriverDashboard = () => {
    const { user } = useAuth();
    const { t } = useTranslation();

    return (
        <DriverLayout>
            <div className="max-w-6xl mx-auto space-y-8 py-8">
                {/* Clean, Modern Hero Section */}
                <div className="bg-card border border-border/60 rounded-3xl p-8 md:p-12 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-primary/50 to-transparent"></div>
                    <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
                        <div className="space-y-4 max-w-2xl">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-muted text-muted-foreground text-sm font-semibold">
                                <Clock size={14} />
                                <span>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
                            </div>
                            
                            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-foreground leading-tight">
                                {t('driver.readyNext')}, <span className="text-primary">{user?.fullName?.split(' ')[0] || 'Driver'}</span>?
                            </h1>
                            <p className="text-lg text-muted-foreground font-medium max-w-lg">
                                {t('driver.welcomeDesc')}
                            </p>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-4 shrink-0">
                            <Link to="/driver/deliveries" className="inline-flex items-center justify-center whitespace-nowrap bg-primary text-primary-foreground h-14 px-8 rounded-2xl font-bold shadow-lg shadow-primary/20 text-md transition-all hover:scale-105 active:scale-95 gap-2">
                                <Navigation size={20} />
                                {t('driver.viewAll')}
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Minimalist Action Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Link to="/driver/deliveries" className="group">
                        <Card className="h-full border border-border/40 shadow-sm bg-card hover:border-primary/30 hover:shadow-md transition-all duration-300 rounded-2xl overflow-hidden cursor-pointer flex flex-col">
                            <CardHeader className="p-6 pb-4">
                                <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                                    <MapPin size={24} />
                                </div>
                                <CardTitle className="text-xl font-bold">{t('driver.activeDeliveries')}</CardTitle>
                                <CardDescription className="text-sm font-medium mt-1">
                                    {t('driver.activeDesc')}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="p-6 pt-0 mt-auto flex items-center text-blue-600 font-bold group-hover:gap-2 transition-all">
                                <span>{t('driver.openMap')}</span>
                                <ArrowRight size={16} className="ml-1 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
                            </CardContent>
                        </Card>
                    </Link>

                    <Link to="/driver/history" className="group">
                        <Card className="h-full border border-border/40 shadow-sm bg-card hover:border-green-500/30 hover:shadow-md transition-all duration-300 rounded-2xl overflow-hidden cursor-pointer flex flex-col">
                            <CardHeader className="p-6 pb-4">
                                <div className="w-12 h-12 rounded-xl bg-green-50 text-green-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                                    <Package size={24} />
                                </div>
                                <CardTitle className="text-xl font-bold">{t('driver.historyTitle')}</CardTitle>
                                <CardDescription className="text-sm font-medium mt-1">
                                    {t('driver.historyDesc')}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="p-6 pt-0 mt-auto flex items-center text-green-600 font-bold group-hover:gap-2 transition-all">
                                <span>{t('driver.viewRecords')}</span>
                                <ArrowRight size={16} className="ml-1 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
                            </CardContent>
                        </Card>
                    </Link>

                    <Link to="/driver/profile" className="group">
                        <Card className="h-full border border-border/40 shadow-sm bg-card hover:border-primary/30 hover:shadow-md transition-all duration-300 rounded-2xl overflow-hidden cursor-pointer flex flex-col">
                            <CardHeader className="p-6 pb-4">
                                <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                                    <User size={24} />
                                </div>
                                <CardTitle className="text-xl font-bold">{t('driver.profileTitle')}</CardTitle>
                                <CardDescription className="text-sm font-medium mt-1">
                                    {t('driver.profileDesc')}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="p-6 pt-0 mt-auto flex items-center text-primary font-bold group-hover:gap-2 transition-all">
                                <span>{t('driver.manageProfile')}</span>
                                <ArrowRight size={16} className="ml-1 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
                            </CardContent>
                        </Card>
                    </Link>
                </div>

                {/* System Notice */}
                <div className="bg-muted/30 rounded-2xl p-6 border border-border/40 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-card flex items-center justify-center shadow-sm border border-border/60">
                            <Bell className="text-muted-foreground" size={18} />
                        </div>
                        <p className="text-sm font-medium text-muted-foreground">{t('driver.stableConnection')}</p>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-card rounded-lg border border-border/60 shadow-sm">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-xs font-bold text-muted-foreground">{t('driver.systemOnline')}</span>
                    </div>
                </div>
            </div>
        </DriverLayout>
    );
};

export default DriverDashboard;
