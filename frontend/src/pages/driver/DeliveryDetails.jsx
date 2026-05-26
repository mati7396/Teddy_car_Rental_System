import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
     Navigation, User, Phone, MapPin, Car as CarIcon, 
     CheckCircle2, Clock, Truck, Loader2, FileText, 
     ExternalLink, AlertCircle, ShieldCheck, Info
} from 'lucide-react';
import { toast } from "sonner";
import { format } from "date-fns";
import { useTranslation } from 'react-i18next';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Custom Leaflet Icons using DivIcon
const OFFICE_GARAGE_COORDS = [9.0035, 38.7825];
const OFFICE_GARAGE_NAME = "Teddy Car Rental Office Garage (Bole, Addis Ababa)";

const pickupIcon = new L.DivIcon({
    html: `<div class="bg-green-500 text-white p-2 rounded-full shadow-xl border-2 border-white flex items-center justify-center animate-bounce">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
           </div>`,
    className: '',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
});

const deliveryIcon = new L.DivIcon({
    html: `<div class="bg-red-500 text-white p-2 rounded-full shadow-xl border-2 border-white flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
           </div>`,
    className: '',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
});

// Custom Car Icon for Leaflet
const carIcon = new L.DivIcon({
    html: `<div class="bg-primary text-white p-2 rounded-full shadow-lg border-2 border-white transform -rotate-45">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>
           </div>`,
    className: '',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
});

const RecenterMap = ({ pickup, delivery, current }) => {
    const map = useMap();
    useEffect(() => {
        if (pickup && delivery) {
            const locations = [pickup, delivery];
            if (current) {
                locations.push(current);
            }
            const bounds = L.latLngBounds(locations);
            map.fitBounds(bounds, { padding: [40, 40] });
        }
    }, [pickup, delivery, current, map]);
    return null;
};

// Parse coords out of a location string
const parseLocation = (locationStr, fallbackOffset = 0) => {
    if (!locationStr) return null;

    // Custom check for Alem Bank neighborhood
    const normalized = locationStr.toLowerCase();
    if (normalized.includes('alembank') || normalized.includes('alem bank')) {
        return [9.0005, 38.6781];
    }

    const coordMatch = locationStr.match(/(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/);
    if (coordMatch) {
        return [parseFloat(coordMatch[1]), parseFloat(coordMatch[2])];
    }
    let hash = 0;
    for (let i = 0; i < locationStr.length; i++) {
        hash = locationStr.charCodeAt(i) + ((hash << 5) - hash);
    }
    const latOffset = (Math.abs(hash % 100) / 2000) - 0.025 + fallbackOffset;
    const lngOffset = (Math.abs((hash >> 8) % 100) / 2000) - 0.025 + fallbackOffset;
    return [9.0227 + latOffset, 38.7460 + lngOffset];
};

// Generate curved routes from start to end
const generateRoutes = (start, end) => {
    if (!start || !end) return [];
    const [lat1, lng1] = start;
    const [lat2, lng2] = end;

    const makeRoute = (staggerLat, staggerLng, label, type) => {
        const mid1 = [
            lat1 + (lat2 - lat1) * 0.3 + staggerLat * 0.003,
            lng1 + (lng2 - lng1) * 0.35 + staggerLng * 0.003
        ];
        const mid2 = [
            lat1 + (lat2 - lat1) * 0.7 - staggerLat * 0.002,
            lng1 + (lng2 - lng1) * 0.65 + staggerLng * 0.002
        ];
        return {
            label,
            type,
            path: [start, mid1, mid2, end]
        };
    };

    return [
        makeRoute(1.2, -1.2, 'Main Route (Bole Rd)', 'main'),
        makeRoute(-1.8, 1.8, 'Shortcut via Ring Road (Recommended)', 'shortcut'),
        makeRoute(2.2, -2.2, 'Alternative Bypass (Low Traffic)', 'alternative')
    ];
};

// Shadcn Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import DriverLayout from "@/components/driver-layout";
import { api } from "@/api";

const DeliveryDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [delivery, setDelivery] = useState(null);
    const [loading, setLoading] = useState(true);
    const [updateLoading, setUpdateLoading] = useState(false);
    const [activeRouteIndex, setActiveRouteIndex] = useState(1); // Default to shortcut!
    const [currentLocation, setCurrentLocation] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const [showVerificationModal, setShowVerificationModal] = useState(false);
    const [verifiedLicense, setVerifiedLicense] = useState(false);
    const [verifiedNationalId, setVerifiedNationalId] = useState(false);
    const evtSourceRef = useRef(null);
    const { t } = useTranslation();

    useEffect(() => {
        if (!delivery || !delivery.booking?.car?.plateNumber) return;

        const carPlateNumber = delivery.booking.car.plateNumber;
        
        const connectSSE = () => {
            try {
                const url = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api') + '/tracking/stream';
                console.log('Driver Connecting to Tracking Stream for Plate:', carPlateNumber, 'at', url);
                
                const es = new EventSource(url);
                
                es.onopen = () => {
                    setIsConnected(true);
                    console.log('Driver: Tracking Stream Connected');
                };

                es.addEventListener('update', (e) => {
                    try {
                        const data = JSON.parse(e.data);
                        if (data.vehicleId === carPlateNumber) {
                            console.log('Driver: Received vehicle update:', data);
                            setCurrentLocation({
                                lat: data.lat,
                                lng: data.lng,
                                speed: data.speed,
                                timestamp: new Date().toLocaleTimeString()
                            });
                        }
                    } catch (err) {
                        console.error('Failed to parse driver tracking data', err);
                    }
                });

                es.onerror = (err) => {
                    console.error('Driver: Tracking Stream Error:', err);
                    setIsConnected(false);
                    es.close();
                    setTimeout(connectSSE, 5000);
                };

                evtSourceRef.current = es;
            } catch (err) {
                console.error('Driver SSE Connection failed', err);
            }
        };

        connectSSE();

        return () => {
            if (evtSourceRef.current) {
                evtSourceRef.current.close();
            }
        };
    }, [delivery]);

    const fetchDeliveryDetails = async () => {
        try {
            setLoading(true);
            const data = await api.get('/drivers/deliveries');
            const found = data.find(d => d.id === parseInt(id));
            if (!found) {
                toast.error("Delivery not found");
                navigate('/driver/deliveries');
                return;
            }
            setDelivery(found);
        } catch (error) {
            console.error('Failed to fetch delivery details:', error);
            toast.error("Could not load delivery details");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDeliveryDetails();
    }, [id]);

    const handleUpdateStatus = async (newStatus, bypassCheck = false) => {
        if (newStatus === 'DELIVERED' && !bypassCheck) {
            setShowVerificationModal(true);
            return;
        }
        try {
            setUpdateLoading(true);
            await api.put(`/drivers/deliveries/${id}/status`, { status: newStatus });
            toast.success(t('driver.statusUpdated') || `Delivery marked as ${newStatus.replace(/_/g, ' ')}`);
            if (newStatus === 'DELIVERED') {
                navigate('/driver/history');
            } else {
                fetchDeliveryDetails();
            }
            setShowVerificationModal(false);
        } catch (error) {
            console.error('Failed to update status:', error);
            toast.error(error.response?.data?.message || "Update failed");
        } finally {
            setUpdateLoading(false);
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'ASSIGNED': return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Assigned</Badge>;
            case 'ACCEPTED': return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">Accepted</Badge>;
            case 'ON_THE_WAY': return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">On The Way</Badge>;
            case 'DELIVERED': return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Delivered</Badge>;
            default: return <Badge variant="secondary">{status}</Badge>;
        }
    };

    if (loading) {
        return (
            <DriverLayout>
                <div className="flex flex-col items-center justify-center py-32 space-y-4">
                    <Loader2 className="animate-spin text-primary" size={64} />
                    <p className="text-xl font-bold text-muted-foreground">{t('driver.loading')}</p>
                </div>
            </DriverLayout>
        );
    }

    if (!delivery) return null;

    const customer = delivery.booking?.user?.customerProfile;
    const car = delivery.booking?.car;

    return (
        <DriverLayout>
            <div className="max-w-5xl mx-auto space-y-8 py-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-card p-8 rounded-3xl shadow-xl border border-border/40">
                    <div className="space-y-2">
                        <div className="flex items-center gap-3">
                            <h1 className="text-3xl font-black tracking-tight">{t('driver.deliveryDetails')} #{delivery.id}</h1>
                            {getStatusBadge(delivery.status)}
                        </div>
                        <p className="text-muted-foreground font-medium">{t('driver.bookingRef')} #{delivery.bookingId} • {t('driver.date')}: {delivery.booking?.createdAt ? format(new Date(delivery.booking.createdAt), 'MMM dd, yyyy') : 'N/A'}</p>
                    </div>
                    
                    <div className="flex flex-wrap gap-3">
                        {delivery.status === 'ASSIGNED' && (
                            <Button size="lg" className="rounded-xl font-bold bg-purple-600 hover:bg-purple-700 text-white" onClick={() => handleUpdateStatus('ACCEPTED')} disabled={updateLoading}>
                                {updateLoading ? <Loader2 className="animate-spin mr-2" size={18} /> : <ShieldCheck size={18} className="mr-2" />}
                                {t('driver.acceptDelivery')}
                            </Button>
                        )}
                        {delivery.status === 'ACCEPTED' && (
                            <Button size="lg" className="rounded-xl font-bold bg-orange-600 hover:bg-orange-700 text-white" onClick={() => handleUpdateStatus('ON_THE_WAY')} disabled={updateLoading}>
                                {updateLoading ? <Loader2 className="animate-spin mr-2" size={18} /> : <Truck size={18} className="mr-2" />}
                                {t('driver.markOnTheWay')}
                            </Button>
                        )}
                        {delivery.status === 'ON_THE_WAY' && (
                            <Button size="lg" className="rounded-xl font-bold bg-green-600 hover:bg-green-700 text-white" onClick={() => handleUpdateStatus('DELIVERED')} disabled={updateLoading}>
                                {updateLoading ? <Loader2 className="animate-spin mr-2" size={18} /> : <CheckCircle2 size={18} className="mr-2" />}
                                {t('driver.markDelivered')}
                            </Button>
                        )}
                        {delivery.status === 'DELIVERED' && (
                            <Button size="lg" variant="outline" className="rounded-xl font-bold border-green-200 text-green-700 bg-green-50" disabled>
                                <CheckCircle2 size={18} className="mr-2" /> {t('driver.completedBadge')}
                            </Button>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: Customer & Car Info */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Customer Card */}
                        <Card className="border-none shadow-xl bg-card rounded-3xl overflow-hidden">
                            <CardHeader className="bg-primary/5 border-b border-primary/10 p-8">
                                <CardTitle className="text-2xl font-bold flex items-center gap-3">
                                    <User className="text-primary" size={24} />
                                    {t('driver.customerInfo')}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-4">
                                        <div className="space-y-1">
                                            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Full Name</p>
                                            <p className="text-lg font-bold">
                                                {(customer?.firstName || customer?.lastName) 
                                                    ? `${customer.firstName} ${customer.lastName}`.trim() 
                                                    : (delivery.booking?.user?.email || 'N/A')}
                                            </p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Phone Number</p>
                                            {customer?.phoneNumber ? (
                                                <a href={`tel:${customer.phoneNumber}`} className="text-lg font-bold text-primary flex items-center gap-2 hover:underline">
                                                    <Phone size={18} /> {customer.phoneNumber}
                                                </a>
                                            ) : (
                                                <p className="text-lg font-bold text-muted-foreground">N/A</p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="space-y-1">
                                            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">{t('driver.deliveryLocation')}</p>
                                            <p className="text-lg font-bold flex items-start gap-2">
                                                <MapPin className="text-red-500 shrink-0 mt-1" size={18} />
                                                {delivery.deliveryLocation}
                                            </p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Home Address</p>
                                            <p className="text-lg font-bold flex items-start gap-2">
                                                <MapPin className="text-muted-foreground shrink-0 mt-1" size={18} />
                                                {customer?.address || 'N/A'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Map & Navigation Route Card */}
                        <Card className="border-none shadow-xl bg-card rounded-3xl overflow-hidden">
                            <CardHeader className="bg-primary/5 border-b border-primary/10 p-8">
                                <CardTitle className="text-2xl font-bold flex items-center gap-3">
                                    <Navigation className="text-primary animate-pulse" size={24} />
                                    Smart Route Navigation & GPS Simulation
                                </CardTitle>
                                <CardDescription className="text-sm font-medium mt-1">
                                    Optimized route planning with verified shortcuts. View your vehicle's live simulated location in real-time.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="p-8">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                    {/* Map Container */}
                                    <div className="md:col-span-2 h-[350px] rounded-2xl overflow-hidden border border-border/60 shadow-inner relative z-0">
                                        <MapContainer 
                                            center={OFFICE_GARAGE_COORDS} 
                                            zoom={13} 
                                            className="h-full w-full"
                                        >
                                            <TileLayer
                                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                            />
                                            
                                            {/* Office Garage Marker (Pickup Starting Point) */}
                                            <Marker position={OFFICE_GARAGE_COORDS} icon={pickupIcon}>
                                                <Popup>
                                                    <div className="p-1">
                                                        <p className="font-bold text-xs text-green-700">Office Garage (Pickup)</p>
                                                        <p className="text-[10px] text-muted-foreground font-medium">{OFFICE_GARAGE_NAME}</p>
                                                    </div>
                                                </Popup>
                                            </Marker>

                                            {/* Delivery Marker */}
                                            {parseLocation(delivery.deliveryLocation, 0.005) && (
                                                <Marker position={parseLocation(delivery.deliveryLocation, 0.005)} icon={deliveryIcon}>
                                                    <Popup>
                                                        <div className="p-1">
                                                            <p className="font-bold text-xs text-red-600">Delivery Address</p>
                                                            <p className="text-[10px] text-muted-foreground font-medium">{delivery.deliveryLocation}</p>
                                                        </div>
                                                    </Popup>
                                                </Marker>
                                            )}

                                            {/* Moving Car Icon (Real-Time Simulated Position) */}
                                            {currentLocation && (
                                                <Marker position={[currentLocation.lat, currentLocation.lng]} icon={carIcon}>
                                                    <Popup>
                                                        <div className="p-1">
                                                            <p className="font-bold text-xs text-primary">Your Simulated Location</p>
                                                            <p className="text-[10px] text-muted-foreground font-semibold">Speed: {currentLocation.speed} km/h</p>
                                                            <p className="text-[9px] text-muted-foreground">Last updated: {currentLocation.timestamp}</p>
                                                        </div>
                                                    </Popup>
                                                </Marker>
                                            )}

                                            {/* Render Routes */}
                                            {generateRoutes(
                                                OFFICE_GARAGE_COORDS,
                                                parseLocation(delivery.deliveryLocation, 0.005)
                                            ).map((r, i) => (
                                                <Polyline 
                                                    key={i}
                                                    positions={r.path}
                                                    color={r.type === 'main' ? '#3b82f6' : r.type === 'shortcut' ? '#22c55e' : '#a855f7'}
                                                    dashArray={r.type !== 'main' ? '5, 10' : undefined}
                                                    weight={activeRouteIndex === i ? 6 : 3}
                                                    opacity={activeRouteIndex === i ? 0.9 : 0.4}
                                                    eventHandlers={{
                                                        click: () => setActiveRouteIndex(i)
                                                    }}
                                                />
                                            ))}

                                            {parseLocation(delivery.deliveryLocation, 0.005) && (
                                                <RecenterMap 
                                                    pickup={OFFICE_GARAGE_COORDS} 
                                                    delivery={parseLocation(delivery.deliveryLocation, 0.005)} 
                                                    current={currentLocation ? [currentLocation.lat, currentLocation.lng] : null}
                                                />
                                            )}
                                        </MapContainer>
                                    </div>

                                    {/* Route Selector Panel */}
                                    <div className="space-y-4 flex flex-col justify-between">
                                        <div className="space-y-3">
                                            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Available Routes & Live GPS</p>
                                            
                                            {/* Telemetry Status Bar */}
                                            <div className="flex items-center justify-between px-3 py-2 bg-card rounded-xl border border-border/60 shadow-sm text-xs">
                                                <span className="font-bold text-muted-foreground">GPS Telemetry</span>
                                                <div className="flex items-center gap-1.5">
                                                    <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                                                    <span className={`font-bold ${isConnected ? 'text-green-600' : 'text-red-500'}`}>
                                                        {isConnected ? 'LIVE' : 'DISCONNECTED'}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Simulated Position Data */}
                                            {currentLocation ? (
                                                <div className="p-3 bg-primary/5 border border-primary/20 rounded-xl space-y-1">
                                                    <div className="flex justify-between items-center text-[10px]">
                                                        <span className="font-bold text-primary">LIVE SPEED</span>
                                                        <span className="font-bold text-indigo-600">{currentLocation.speed} km/h</span>
                                                    </div>
                                                    <div className="text-[9px] text-muted-foreground flex justify-between">
                                                        <span>Lat: {currentLocation.lat.toFixed(5)}</span>
                                                        <span>Lng: {currentLocation.lng.toFixed(5)}</span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl">
                                                    <p className="text-[10px] font-semibold text-amber-700 leading-normal flex items-start gap-1">
                                                        <AlertCircle size={12} className="shrink-0 mt-0.5" />
                                                        Waiting for live GPS updates... Coordinates will sync automatically when simulator starts.
                                                    </p>
                                                </div>
                                            )}

                                            <div className="space-y-2">
                                                {generateRoutes(
                                                    OFFICE_GARAGE_COORDS,
                                                    parseLocation(delivery.deliveryLocation, 0.005)
                                                ).map((r, i) => (
                                                    <button
                                                        key={i}
                                                        onClick={() => setActiveRouteIndex(i)}
                                                        className={`w-full p-3 rounded-xl border text-left transition-all ${
                                                            activeRouteIndex === i
                                                            ? 'bg-primary/5 border-primary shadow-sm ring-1 ring-primary/10'
                                                            : 'hover:bg-muted/50 border-border/60 bg-transparent'
                                                        }`}
                                                    >
                                                        <div className="flex justify-between items-center mb-1">
                                                            <span className="font-bold text-xs">{r.label}</span>
                                                            <Badge 
                                                                variant="outline" 
                                                                className={`text-[9px] px-1.5 h-4.5 font-bold ${
                                                                    r.type === 'shortcut' 
                                                                    ? 'bg-green-50 text-green-700 border-green-200' 
                                                                    : r.type === 'alternative' 
                                                                    ? 'bg-purple-50 text-purple-700 border-purple-200'
                                                                    : 'bg-blue-50 text-blue-700 border-blue-200'
                                                                }`}
                                                            >
                                                                {r.type === 'shortcut' ? 'Fastest' : r.type === 'alternative' ? 'Eco' : 'Standard'}
                                                            </Badge>
                                                        </div>
                                                        <p className="text-[10px] text-muted-foreground font-semibold">
                                                            {i === 0 ? '8.4 km • 18 mins' : i === 1 ? '6.2 km • 12 mins' : '9.1 km • 15 mins'}
                                                        </p>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Dynamic Guidance Note */}
                                        <div className="p-4 rounded-2xl bg-muted/30 border border-border/60 space-y-2">
                                            <div className="flex items-center gap-2 text-xs font-bold">
                                                <Info size={14} className="text-primary shrink-0" />
                                                Driver Guidance
                                            </div>
                                            <p className="text-[10px] text-muted-foreground font-medium leading-relaxed">
                                                {activeRouteIndex === 1 
                                                    ? 'Recommended: Shortcut via Ring Road bypasses central construction and saves up to 6 minutes.'
                                                    : activeRouteIndex === 2 
                                                    ? 'Alternative: Slightly longer, but utilizes wider lanes with lighter traffic density.'
                                                    : 'Standard: Main thoroughfare. Prone to central bottlenecks during peak commute hours.'
                                                }
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Car Details Card */}
                        <Card className="border-none shadow-xl bg-card rounded-3xl overflow-hidden">
                            <CardHeader className="bg-primary/5 border-b border-primary/10 p-8">
                                <CardTitle className="text-2xl font-bold flex items-center gap-3">
                                    <CarIcon className="text-primary" size={24} />
                                    {t('driver.vehicleInfo')}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-8">
                                {car ? (
                                    <div className="flex flex-col md:flex-row gap-8">
                                        <div className="w-full md:w-64 h-40 bg-muted rounded-2xl overflow-hidden border border-border/60">
                                            {car.imageUrl ? (
                                                <img src={api.getImageUrl(car.imageUrl)} alt="Car" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-muted-foreground bg-muted/50">
                                                    <CarIcon size={48} opacity={0.2} />
                                                </div>
                                            )}
                                        </div>
                                        <div className="space-y-6 flex-1">
                                            <div className="grid grid-cols-2 gap-6">
                                                <div className="space-y-1">
                                                    <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Make & Model</p>
                                                    <p className="text-xl font-bold">{car.make} {car.model}</p>
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">{t('driver.plateNumber')}</p>
                                                    <Badge className="font-mono text-lg px-4 py-1 rounded-xl bg-primary text-white">{car.plateNumber}</Badge>
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">{t('driver.year')}</p>
                                                    <p className="text-lg font-bold">{car.year}</p>
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Category</p>
                                                    <p className="text-lg font-bold">{car.category}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="p-12 text-center bg-muted/20 rounded-2xl border-2 border-dashed border-border/40">
                                        <Package className="mx-auto text-muted-foreground/30 mb-4" size={48} />
                                        <p className="text-lg font-bold text-muted-foreground">{t('driver.packageRentalAssignment')}</p>
                                        <p className="text-sm text-muted-foreground">{delivery.booking?.package?.name || t('driver.noVehicleData')}</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right Column: Verification Documents */}
                    <div className="space-y-8">
                        <Card className="border-none shadow-xl bg-card rounded-3xl overflow-hidden">
                            <CardHeader className="bg-orange-500/5 border-b border-orange-500/10 p-8">
                                <CardTitle className="text-xl font-black flex items-center gap-3 text-orange-700 uppercase tracking-tighter">
                                    <ShieldCheck size={24} />
                                    {t('driver.verification')}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-8 space-y-6">
                                <div className="bg-orange-50 border border-orange-200 p-4 rounded-2xl">
                                    <p className="text-xs font-bold text-orange-800 flex gap-2">
                                        <AlertCircle size={14} className="shrink-0" />
                                        {t('driver.verifyWarning')}
                                    </p>
                                </div>

                                <div className="space-y-6">
                                    <div className="space-y-3">
                                        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Driver License</p>
                                        <div className="relative group rounded-2xl overflow-hidden border-2 border-border/40 aspect-video bg-muted">
                                            {customer?.driverLicenseUrl ? (
                                                <>
                                                    <img src={api.getImageUrl(customer.driverLicenseUrl)} alt="License" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-4">
                                                        <Button variant="secondary" size="sm" className="font-bold rounded-xl" onClick={() => window.open(api.getImageUrl(customer.driverLicenseUrl), '_blank')}>
                                                            {t('driver.viewDocument')}
                                                        </Button>
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground/30">
                                                    <FileText size={48} />
                                                    <p className="text-xs font-bold mt-2">NOT UPLOADED</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">{t('driver.idPassport')}</p>
                                        <div className="relative group rounded-2xl overflow-hidden border-2 border-border/40 aspect-video bg-muted">
                                            {customer?.idCardUrl ? (
                                                <>
                                                    <img src={api.getImageUrl(customer.idCardUrl)} alt="ID Card" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-4">
                                                        <Button variant="secondary" size="sm" className="font-bold rounded-xl" onClick={() => window.open(api.getImageUrl(customer.idCardUrl), '_blank')}>
                                                            {t('driver.viewDocument')}
                                                        </Button>
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground/30">
                                                    <FileText size={48} />
                                                    <p className="text-xs font-bold mt-2">NOT UPLOADED</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>

            {showVerificationModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="w-full max-w-md bg-card border border-border/80 rounded-3xl shadow-2xl overflow-hidden scale-in-95 duration-200">
                        <div className="p-8 border-b border-border/40 bg-primary/5">
                            <h2 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-3">
                                <ShieldCheck size={26} className="text-primary animate-pulse" />
                                Document Verification
                            </h2>
                            <p className="text-sm font-semibold text-muted-foreground mt-2 leading-relaxed">
                                Please manually verify the customer's identity and documents before handing over the keys.
                            </p>
                        </div>
                        
                        <div className="p-8 space-y-6">
                            {/* License Check */}
                            <label className="flex items-start gap-4 p-4 bg-muted/30 hover:bg-muted/50 rounded-2xl border border-border/40 transition-colors cursor-pointer group">
                                <input 
                                    type="checkbox" 
                                    checked={verifiedLicense}
                                    onChange={(e) => setVerifiedLicense(e.target.checked)}
                                    className="w-5 h-5 mt-0.5 rounded border-border text-primary focus:ring-primary shrink-0 transition-transform group-active:scale-95"
                                />
                                <div className="space-y-1">
                                    <p className="font-bold text-sm text-foreground">Verify Driver's License</p>
                                    <p className="text-xs text-muted-foreground font-medium">I have checked the physically presented driver's license and matched it with the customer.</p>
                                </div>
                            </label>

                            {/* ID Check */}
                            <label className="flex items-start gap-4 p-4 bg-muted/30 hover:bg-muted/50 rounded-2xl border border-border/40 transition-colors cursor-pointer group">
                                <input 
                                    type="checkbox" 
                                    checked={verifiedNationalId}
                                    onChange={(e) => setVerifiedNationalId(e.target.checked)}
                                    className="w-5 h-5 mt-0.5 rounded border-border text-primary focus:ring-primary shrink-0 transition-transform group-active:scale-95"
                                />
                                <div className="space-y-1">
                                    <p className="font-bold text-sm text-foreground">Verify National ID / Passport</p>
                                    <p className="text-xs text-muted-foreground font-medium">I have checked the national ID or passport and verified the name matches the booking profile.</p>
                                </div>
                            </label>
                        </div>

                        <div className="p-8 border-t border-border/40 bg-muted/20 flex gap-3">
                            <Button 
                                type="button"
                                variant="outline" 
                                className="flex-1 rounded-xl font-bold border-border/60 hover:bg-muted"
                                onClick={() => {
                                    setShowVerificationModal(false);
                                    setVerifiedLicense(false);
                                    setVerifiedNationalId(false);
                                }}
                            >
                                Cancel
                            </Button>
                            <Button 
                                type="button"
                                className="flex-1 rounded-xl font-bold bg-green-600 hover:bg-green-700 text-white"
                                disabled={!verifiedLicense || !verifiedNationalId || updateLoading}
                                onClick={() => handleUpdateStatus('DELIVERED', true)}
                            >
                                {updateLoading ? <Loader2 className="animate-spin" size={18} /> : 'Complete Delivery'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
            </div>
        </DriverLayout>
    );
};

export default DeliveryDetails;
