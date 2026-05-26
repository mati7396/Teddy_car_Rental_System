import React, { useState, useEffect } from 'react';
import { 
    Navigation, Package, User, Phone, MapPin, Car as CarIcon, 
    CheckCircle2, Clock, Truck, Eye, Loader2, ArrowRight, Search, Calendar
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from "sonner";
import { format } from "date-fns";

// Shadcn Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import DriverLayout from "@/components/driver-layout";
import { api } from "@/api";

const DeliveryHistory = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [deliveries, setDeliveries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    const fetchDeliveries = async () => {
        try {
            setLoading(true);
            const data = await api.get('/drivers/deliveries');
            setDeliveries(data.filter(d => d.status === 'DELIVERED'));
        } catch (error) {
            console.error('Failed to fetch delivery history:', error);
            toast.error("Could not load delivery history");
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

    return (
        <DriverLayout>
            <div className="max-w-6xl mx-auto space-y-8 py-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-1">
                        <h1 className="text-4xl font-black tracking-tight text-foreground">{t('driver.historyTitle')}</h1>
                        <p className="text-lg text-muted-foreground font-medium">{t('driver.historyDesc')}</p>
                    </div>
                    <div className="relative w-full md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                        <Input 
                            placeholder={t('driver.searchRef')} 
                            className="pl-10 h-11 bg-card border-border/60 rounded-xl focus:ring-primary/20"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <Card className="border-none shadow-xl bg-card rounded-3xl overflow-hidden">
                    <ScrollArea className="h-[600px]">
                        <Table>
                            <TableHeader className="bg-muted/30 sticky top-0 z-10">
                                <TableRow className="border-none hover:bg-transparent">
                                    <TableHead className="py-6 px-8 font-black uppercase tracking-widest text-xs">{t('driver.bookingRef')}</TableHead>
                                    <TableHead className="py-6 px-8 font-black uppercase tracking-widest text-xs">{t('driver.customer')}</TableHead>
                                    <TableHead className="py-6 px-8 font-black uppercase tracking-widest text-xs">{t('driver.vehicleInfo')}</TableHead>
                                    <TableHead className="py-6 px-8 font-black uppercase tracking-widest text-xs">{t('driver.date')}</TableHead>
                                    <TableHead className="py-6 px-8 font-black uppercase tracking-widest text-xs text-right">{t('driver.action')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="py-32 text-center">
                                            <div className="flex flex-col items-center gap-4">
                                                <Loader2 className="animate-spin text-primary" size={48} />
                                                <p className="text-lg font-bold text-muted-foreground">{t('driver.loading')}</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : filteredDeliveries.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="py-32 text-center">
                                            <div className="flex flex-col items-center gap-4 text-muted-foreground/40">
                                                <Calendar size={64} />
                                                <p className="text-xl font-bold">{t('driver.noRecent')}</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredDeliveries.map((delivery) => (
                                        <TableRow key={delivery.id} className="border-b border-border/40 hover:bg-muted/20 transition-colors">
                                            <TableCell className="py-6 px-8">
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-xs font-black text-primary uppercase tracking-tighter">{t('driver.bookingRef')}</span>
                                                    <span className="font-mono font-bold text-lg">#{delivery.bookingId}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-6 px-8">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                                                        {delivery.booking?.user?.customerProfile?.firstName?.[0]}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold">{delivery.booking?.user?.customerProfile?.firstName} {delivery.booking?.user?.customerProfile?.lastName}</p>
                                                        <p className="text-xs text-muted-foreground font-medium">{delivery.booking?.user?.customerProfile?.phoneNumber}</p>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-6 px-8">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                                                        <CarIcon size={20} className="text-muted-foreground" />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold">{delivery.booking?.car ? `${delivery.booking.car.make} ${delivery.booking.car.model}` : delivery.booking?.package?.name}</p>
                                                        <p className="text-xs font-mono text-muted-foreground uppercase">{delivery.booking?.car?.plateNumber || 'Package'}</p>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-6 px-8">
                                                <div className="flex items-center gap-2 text-green-600 font-bold">
                                                    <CheckCircle2 size={16} />
                                                    {delivery.deliveredAt ? format(new Date(delivery.deliveredAt), 'MMM dd, yyyy HH:mm') : 'N/A'}
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-6 px-8 text-right">
                                                <Button 
                                                    variant="ghost" 
                                                    size="sm" 
                                                    className="rounded-xl font-bold hover:bg-primary/10 hover:text-primary"
                                                    onClick={() => navigate(`/driver/deliveries/${delivery.id}`)}
                                                >
                                                    <Eye size={18} className="mr-2" /> {t('driver.details')}
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                </Card>
            </div>
        </DriverLayout>
    );
};

export default DeliveryHistory;
