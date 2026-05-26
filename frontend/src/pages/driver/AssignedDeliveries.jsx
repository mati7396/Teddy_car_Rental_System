import React, { useState, useEffect } from 'react';
import { 
    Navigation, User, Phone, MapPin, Car as CarIcon, 
    CheckCircle2, Clock, Truck, Eye, Loader2, ArrowRight, Search, Filter, Package
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from "sonner";
import { format } from "date-fns";

// Shadcn Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import DriverLayout from "@/components/driver-layout";
import { api } from "@/api";

const AssignedDeliveries = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [deliveries, setDeliveries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    const fetchDeliveries = async () => {
        try {
            setLoading(true);
            const data = await api.get('/drivers/deliveries');
            // Filter to show only active deliveries
            setDeliveries(data.filter(d => ['ASSIGNED', 'ACCEPTED', 'ON_THE_WAY'].includes(d.status)));
        } catch (error) {
            console.error('Failed to fetch deliveries:', error);
            toast.error("Could not load assignments");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDeliveries();
    }, []);

    const filteredDeliveries = deliveries.filter(d => 
        d.bookingId.toString().includes(searchQuery) || 
        d.booking?.user?.customerProfile?.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.booking?.user?.customerProfile?.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.deliveryLocation?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getStatusBadge = (status) => {
        switch (status) {
            case 'ASSIGNED': 
                return (
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 px-3 py-1 rounded-full font-bold flex items-center gap-1.5 animate-pulse">
                        <Clock size={12} /> Assigned
                    </Badge>
                );
            case 'ACCEPTED': 
                return (
                    <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 px-3 py-1 rounded-full font-bold flex items-center gap-1.5 animate-pulse">
                        <CheckCircle2 size={12} /> Accepted
                    </Badge>
                );
            case 'ON_THE_WAY': 
                return (
                    <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 px-3 py-1 rounded-full font-bold flex items-center gap-1.5">
                        <Truck size={12} className="animate-bounce" /> On The Way
                    </Badge>
                );
            default: return <Badge variant="secondary" className="rounded-full">{status}</Badge>;
        }
    };

    return (
        <DriverLayout>
            <div className="max-w-6xl mx-auto space-y-8 py-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-1">
                        <h1 className="text-4xl font-black tracking-tight text-foreground">{t('driver.assignedDeliveries')}</h1>
                        <p className="text-lg text-muted-foreground font-medium">{t('driver.pendingDesc')}</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="relative w-full md:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                            <Input 
                                placeholder={t('driver.searchRef')} 
                                className="pl-10 h-11 bg-card border-border/60 rounded-xl focus:ring-primary/20"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <Button variant="outline" size="icon" className="h-11 w-11 rounded-xl border-border/60 bg-card">
                            <Filter size={18} />
                        </Button>
                    </div>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-32 space-y-4">
                        <div className="relative w-20 h-20">
                            <Loader2 className="animate-spin text-primary absolute inset-0" size={80} strokeWidth={1.5} />
                            <Navigation className="text-primary/40 absolute inset-0 m-auto" size={32} />
                        </div>
                        <p className="text-xl font-bold text-muted-foreground animate-pulse">{t('driver.loading')}</p>
                    </div>
                ) : filteredDeliveries.length === 0 ? (
                    <Card className="border-dashed border-2 border-border/60 bg-muted/20 rounded-3xl py-24">
                        <CardContent className="flex flex-col items-center justify-center text-center space-y-6">
                            <div className="w-24 h-24 rounded-full bg-card flex items-center justify-center shadow-inner">
                                <Package className="text-muted-foreground/30" size={48} />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-2xl font-bold">{t('driver.noAssigned')}</h3>
                                <p className="text-muted-foreground max-w-sm">{t('driver.noAssignedDesc')}</p>
                            </div>
                            <Button variant="outline" className="rounded-xl font-bold" onClick={fetchDeliveries}>
                                {t('driver.refresh')}
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredDeliveries.map((delivery) => (
                            <Card key={delivery.id} className="group border-none shadow-xl bg-card hover:shadow-2xl transition-all duration-300 rounded-3xl overflow-hidden flex flex-col">
                                <div className="p-6 space-y-6 flex-1">
                                    <div className="flex justify-between items-start">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-black uppercase tracking-widest text-primary/60">{t('driver.bookingRef')}</span>
                                                <span className="font-mono font-bold text-foreground">#{delivery.bookingId}</span>
                                            </div>
                                            <h3 className="text-xl font-bold truncate max-w-[180px]">
                                                {delivery.booking?.user?.customerProfile?.firstName} {delivery.booking?.user?.customerProfile?.lastName}
                                            </h3>
                                        </div>
                                        {getStatusBadge(delivery.status)}
                                    </div>

                                    <div className="space-y-4">
                                        <div className="flex items-center gap-3 p-3 rounded-2xl bg-muted/50 border border-border/40">
                                            <div className="w-10 h-10 rounded-xl bg-white dark:bg-card flex items-center justify-center shadow-sm">
                                                <CarIcon size={20} className="text-primary" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold truncate">
                                                    {delivery.booking?.car ? `${delivery.booking.car.make} ${delivery.booking.car.model}` : delivery.booking?.package?.name}
                                                </p>
                                                <p className="text-xs text-muted-foreground font-medium uppercase tracking-tighter">
                                                    {delivery.booking?.car?.plateNumber || t('driver.packageRental')}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="space-y-3 px-1">
                                            <div className="flex items-start gap-3">
                                                <div className="w-5 h-5 rounded-full bg-red-500/10 flex items-center justify-center shrink-0 mt-0.5">
                                                    <MapPin size={12} className="text-red-500" />
                                                </div>
                                                <p className="text-sm font-medium text-muted-foreground line-clamp-2">
                                                    {delivery.deliveryLocation}
                                                </p>
                                            </div>
                                            <div className="flex items-start gap-3">
                                                <div className="w-5 h-5 rounded-full bg-green-500/10 flex items-center justify-center shrink-0 mt-0.5">
                                                    <Phone size={12} className="text-green-500" />
                                                </div>
                                                <p className="text-sm font-bold text-foreground">
                                                    {delivery.booking?.user?.customerProfile?.phoneNumber}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-6 pt-0 mt-auto">
                                    <Button 
                                        className="w-full h-12 rounded-2xl font-bold bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 group/btn"
                                        onClick={() => navigate(`/driver/deliveries/${delivery.id}`)}
                                    >
                                        {t('driver.details')} 
                                        <ArrowRight size={18} className="ml-2 group-hover/btn:translate-x-1 transition-transform" />
                                    </Button>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </DriverLayout>
    );
};

export default AssignedDeliveries;
