import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Navigation, Car, AlertCircle, Loader2, Maximize2, Minimize2, Map as MapIcon, Info, MapPin } from 'lucide-react';

// Shadcn Components
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import AdminLayout from "@/components/admin-layout";
import EmployeeLayout from "@/components/employee-layout";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/api";

// Fix Leaflet default icon issues
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconUrl: markerIcon,
    iconRetinaUrl: markerIcon2x,
    shadowUrl: markerShadow,
});

// Teddy Car Rental Office Garage coordinates (Bole, Addis Ababa)
const OFFICE_GARAGE_COORDS = [9.0035, 38.7825];
const OFFICE_GARAGE_NAME = "Teddy Car Rental Office Garage (Bole, Addis Ababa)";

// Custom Leaflet Icons using DivIcon
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

const RecenterMap = ({ positions }) => {
    const map = useMap();
    useEffect(() => {
        if (positions.length > 0) {
            const bounds = L.latLngBounds(positions.map(p => [p.lat, p.lng]));
            map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
        }
    }, [positions, map]);
    return null;
};

const RouteRecenterMap = ({ pickup, delivery, current }) => {
    const map = useMap();
    useEffect(() => {
        if (pickup && delivery) {
            const locations = [pickup, delivery];
            if (current) {
                locations.push(current);
            }
            const bounds = L.latLngBounds(locations);
            map.fitBounds(bounds, { padding: [60, 60] });
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

const AdminTracking = () => {
    const { user } = useAuth();
    const LayoutComponent = user?.role === 'EMPLOYEE' ? EmployeeLayout : AdminLayout;

    const [vehicles, setVehicles] = useState({});
    const [selectedVehicle, setSelectedVehicle] = useState(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [activeRouteIndex, setActiveRouteIndex] = useState(1); // Default to shortcut!
    const evtSourceRef = useRef(null);

    useEffect(() => {
        const fetchActiveVehicles = async () => {
            try {
                const res = await api.get('/tracking/active-vehicles');
                if (res && res.data && res.data.length > 0) {
                    const initialVehicles = {};
                    res.data.forEach(v => {
                        initialVehicles[v.vehicleId] = {
                            ...v,
                            lat: 9.0035, // default to office garage coordinates
                            lng: 38.7825,
                            speed: 0,
                            lastUpdate: 'No signal yet'
                        };
                    });
                    setVehicles(initialVehicles);
                    // Automatically select the first vehicle so we display the detailed simulation map by default!
                    const firstVehicle = res.data[0];
                    setSelectedVehicle({
                        ...firstVehicle,
                        lat: 9.0035,
                        lng: 38.7825,
                        speed: 0,
                        lastUpdate: 'No signal yet'
                    });
                }
            } catch (err) {
                console.error('Failed to fetch active vehicles:', err);
            }
        };

        fetchActiveVehicles();

        const connectSSE = () => {
            try {
                const url = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api') + '/tracking/stream';
                console.log('Connecting to Tracking Stream:', url);
                
                const es = new EventSource(url);
                
                es.onopen = () => {
                    setIsConnected(true);
                    console.log('Tracking Stream Connected');
                };

                es.addEventListener('update', (e) => {
                    try {
                        const data = JSON.parse(e.data);
                        setVehicles(prev => {
                            const existing = prev[data.vehicleId] || {};
                            return {
                                ...prev,
                                [data.vehicleId]: {
                                    ...existing,
                                    ...data,
                                    lastUpdate: new Date().toLocaleTimeString()
                                }
                            };
                        });
                        // Update currently selected vehicle reference in real time
                        setSelectedVehicle(prev => {
                            if (prev && prev.vehicleId === data.vehicleId) {
                                const existing = prev || {};
                                return {
                                    ...existing,
                                    ...data,
                                    lastUpdate: new Date().toLocaleTimeString()
                                };
                            }
                            return prev;
                        });
                    } catch (err) {
                        console.error('Failed to parse tracking data', err);
                    }
                });

                es.onerror = (err) => {
                    console.error('Tracking Stream Error:', err);
                    setIsConnected(false);
                    es.close();
                    // Reconnect after 5 seconds
                    setTimeout(connectSSE, 5000);
                };

                evtSourceRef.current = es;
            } catch (err) {
                console.error('SSE Connection failed', err);
            }
        };

        connectSSE();

        return () => {
            if (evtSourceRef.current) {
                evtSourceRef.current.close();
            }
        };
    }, []);

    const vehicleList = Object.values(vehicles);
    const center = [9.0227, 38.7460]; // Default Addis Ababa center

    return (
        <LayoutComponent>
            <div className="flex flex-col h-[calc(100vh-140px)] gap-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Live Fleet Tracking</h1>
                        <p className="text-muted-foreground flex items-center gap-2">
                            Real-time GPS monitoring of all active rentals
                            {isConnected ? (
                                <Badge className="bg-green-500/10 text-green-500 border-green-500/20 ml-2 animate-pulse">
                                    Live
                                </Badge>
                            ) : (
                                <Badge variant="destructive" className="ml-2">
                                    Disconnected
                                </Badge>
                            )}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => setIsFullscreen(!isFullscreen)}>
                            {isFullscreen ? <Minimize2 size={16} className="mr-2" /> : <Maximize2 size={16} className="mr-2" />}
                            {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Map'}
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1 overflow-hidden">
                    {/* Vehicle List */}
                    <Card className="lg:col-span-1 flex flex-col border-border/60 shadow-sm">
                        <CardHeader className="pb-3 border-b bg-muted/30">
                            <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                <Car size={16} className="text-primary" />
                                Active Vehicles ({vehicleList.length})
                            </CardTitle>
                        </CardHeader>
                        <ScrollArea className="flex-1">
                            <div className="p-2 space-y-1">
                                {vehicleList.length === 0 ? (
                                    <div className="p-8 text-center flex flex-col items-center justify-center opacity-40">
                                        <Loader2 className="animate-spin mb-2" />
                                        <p className="text-xs">Waiting for GPS signals...</p>
                                    </div>
                                ) : (
                                    vehicleList.map(v => (
                                        <button
                                            key={v.vehicleId}
                                            onClick={() => setSelectedVehicle(v)}
                                            className={`w-full p-3 rounded-lg text-left transition-all border ${
                                                selectedVehicle?.vehicleId === v.vehicleId 
                                                ? 'bg-primary/10 border-primary/30 ring-1 ring-primary/20' 
                                                : 'hover:bg-muted border-transparent'
                                            }`}
                                        >
                                            <div className="flex justify-between items-start mb-1">
                                                <span className="font-bold text-sm truncate">{v.vehicleId}</span>
                                                <Badge variant="outline" className="text-[10px] h-4 px-1 shrink-0">
                                                    {v.speed} km/h
                                                </Badge>
                                            </div>
                                            <div className="flex justify-between items-center text-[10px] text-muted-foreground">
                                                <div className="flex items-center gap-1">
                                                    <Navigation size={10} className="rotate-45 text-primary" />
                                                    <span>{v.lat.toFixed(4)}, {v.lng.toFixed(4)}</span>
                                                </div>
                                                {v.isDelivery && (
                                                    <Badge variant="secondary" className="text-[8px] h-3.5 px-1 bg-amber-500/10 text-amber-600 border-none shrink-0 font-bold">
                                                        Delivery
                                                    </Badge>
                                                )}
                                            </div>
                                            <p className="text-[10px] text-muted-foreground mt-1">Last update: {v.lastUpdate}</p>
                                        </button>
                                    ))
                                )}
                            </div>
                        </ScrollArea>
                    </Card>

                    {/* Map Display */}
                    <Card className={`lg:col-span-3 overflow-hidden border-border/60 shadow-lg relative ${isFullscreen ? 'fixed inset-4 z-[100] bg-background' : ''}`}>
                        <div className="absolute top-4 left-4 z-[50] flex flex-col gap-2">
                            <Badge className="bg-background/80 backdrop-blur-md border shadow-lg text-foreground px-3 py-1 flex items-center gap-2">
                                <MapIcon size={14} className="text-primary" />
                                {selectedVehicle?.isDelivery && selectedVehicle?.deliveryStatus !== 'DELIVERED' ? 'Live Delivery Route Simulation Map' : 'Interactive Tracking Map'}
                            </Badge>
                        </div>

                        {isFullscreen && (
                            <Button 
                                variant="outline" 
                                size="icon" 
                                className="absolute top-4 right-4 z-[50] bg-background/80 backdrop-blur-md"
                                onClick={() => setIsFullscreen(false)}
                            >
                                <Minimize2 size={20} />
                            </Button>
                        )}

                        {selectedVehicle && selectedVehicle.isDelivery && selectedVehicle.deliveryStatus !== 'DELIVERED' ? (
                            <div className="flex flex-col md:flex-row h-full w-full bg-card">
                                {/* Map Container */}
                                <div className="flex-1 h-full relative z-0">
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
                                        {parseLocation(selectedVehicle.deliveryLocation, 0.005) && (
                                            <Marker position={parseLocation(selectedVehicle.deliveryLocation, 0.005)} icon={deliveryIcon}>
                                                <Popup>
                                                    <div className="p-1">
                                                        <p className="font-bold text-xs text-red-600">Delivery Address</p>
                                                        <p className="text-[10px] text-muted-foreground font-medium">{selectedVehicle.deliveryLocation}</p>
                                                    </div>
                                                </Popup>
                                            </Marker>
                                        )}

                                        {/* All active moving vehicles with Clickable Popups showing driver name and plate number */}
                                        {vehicleList.map(v => (
                                            <Marker 
                                                key={v.vehicleId} 
                                                position={[v.lat, v.lng]} 
                                                icon={carIcon}
                                                eventHandlers={{
                                                    click: () => {
                                                        setSelectedVehicle(v);
                                                    }
                                                }}
                                            >
                                                <Popup>
                                                    <div className="p-2 space-y-1.5 min-w-[140px]">
                                                        <p className="font-bold text-xs text-primary border-b border-primary/20 pb-1">
                                                            Plate: {v.vehicleId}
                                                        </p>
                                                        <p className="text-[10px] font-bold text-foreground leading-tight">
                                                            {v.isDelivery && v.deliveryStatus === 'DELIVERED' ? 'Renter' : 'Driver'}: <span className="text-indigo-600 font-black">{v.assignedDriver}</span>
                                                        </p>
                                                        <p className="text-[9px] font-semibold text-muted-foreground">
                                                            Speed: {v.speed} km/h
                                                        </p>
                                                        {v.isDelivery && (
                                                            <div className={`text-[8px] font-black px-1 py-0.5 rounded w-max mt-1 ${
                                                                v.deliveryStatus === 'DELIVERED'
                                                                ? 'text-blue-600 bg-blue-500/10 border border-blue-500/20'
                                                                : 'text-green-600 bg-green-500/10 border border-green-500/20 animate-pulse'
                                                            }`}>
                                                                {v.deliveryStatus === 'DELIVERED' ? 'DELIVERED TO CUSTOMER' : 'DELIVERY ACTIVE'}
                                                            </div>
                                                        )}
                                                    </div>
                                                </Popup>
                                            </Marker>
                                        ))}

                                        {/* Render Routes */}
                                        {generateRoutes(
                                            OFFICE_GARAGE_COORDS,
                                            parseLocation(selectedVehicle.deliveryLocation, 0.005)
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

                                        {parseLocation(selectedVehicle.deliveryLocation, 0.005) && (
                                            <RouteRecenterMap 
                                                pickup={OFFICE_GARAGE_COORDS} 
                                                delivery={parseLocation(selectedVehicle.deliveryLocation, 0.005)} 
                                                current={[selectedVehicle.lat, selectedVehicle.lng]}
                                            />
                                        )}
                                    </MapContainer>
                                </div>

                                {/* Smart Navigation Panel for selected Delivery car */}
                                <div className="w-full md:w-80 border-l border-border bg-card p-6 flex flex-col justify-between overflow-y-auto max-h-full">
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center">
                                            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Smart Route & Telemetry</p>
                                            <Button variant="ghost" size="sm" className="text-xs h-6 px-2 text-muted-foreground" onClick={() => setSelectedVehicle(null)}>
                                                Clear View
                                            </Button>
                                        </div>
                                        
                                        <div className="p-3 bg-primary/5 border border-primary/20 rounded-xl space-y-1.5">
                                            <div className="flex justify-between items-center text-[10px]">
                                                <span className="font-bold text-primary">LIVE SPEED</span>
                                                <span className="font-bold text-indigo-600">{selectedVehicle.speed} km/h</span>
                                            </div>
                                            <div className="text-[9px] text-muted-foreground flex justify-between">
                                                <span>Lat: {selectedVehicle.lat.toFixed(5)}</span>
                                                <span>Lng: {selectedVehicle.lng.toFixed(5)}</span>
                                            </div>
                                            <div className="border-t pt-1.5 text-[9px] text-muted-foreground font-medium">
                                                {selectedVehicle.isDelivery && selectedVehicle.deliveryStatus === 'DELIVERED' ? 'Renter' : 'Driver'}: <span className="font-bold text-foreground">{selectedVehicle.assignedDriver}</span>
                                            </div>
                                            <div className="text-[9px] text-muted-foreground truncate">
                                                Dest: <span className="font-bold text-foreground">{selectedVehicle.deliveryLocation}</span>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            {generateRoutes(
                                                OFFICE_GARAGE_COORDS,
                                                parseLocation(selectedVehicle.deliveryLocation, 0.005)
                                            ).map((r, i) => (
                                                <button
                                                    key={i}
                                                    onClick={() => setActiveRouteIndex(i)}
                                                    className={`w-full p-2.5 rounded-xl border text-left transition-all ${
                                                        activeRouteIndex === i
                                                        ? 'bg-primary/5 border-primary shadow-sm ring-1 ring-primary/10'
                                                        : 'hover:bg-muted/50 border-border/60 bg-transparent'
                                                    }`}
                                                >
                                                    <div className="flex justify-between items-center mb-0.5">
                                                        <span className="font-bold text-[11px]">{r.label}</span>
                                                        <Badge 
                                                            variant="outline" 
                                                            className={`text-[8px] px-1 h-4 font-bold ${
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
                                                    <p className="text-[9px] text-muted-foreground font-semibold">
                                                        {i === 0 ? '8.4 km • 18 mins' : i === 1 ? '6.2 km • 12 mins' : '9.1 km • 15 mins'}
                                                    </p>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="p-3 mt-4 rounded-xl bg-muted/30 border border-border/60 space-y-1.5">
                                        <div className="flex items-center gap-1.5 text-[10px] font-bold">
                                            <Info size={12} className="text-primary shrink-0" />
                                            Route Guidance
                                        </div>
                                        <p className="text-[9px] text-muted-foreground font-medium leading-relaxed">
                                            {activeRouteIndex === 1 
                                                ? 'Shortcut via Ring Road bypasses central construction and saves up to 6 minutes.'
                                                : activeRouteIndex === 2 
                                                ? 'Alternative: Slightly longer, but utilizes wider lanes with lighter traffic density.'
                                                : 'Standard: Main thoroughfare. Prone to central bottlenecks during peak commute hours.'
                                            }
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="h-full w-full bg-muted/10">
                                <MapContainer 
                                    center={center} 
                                    zoom={13} 
                                    className="h-full w-full z-0"
                                >
                                    <TileLayer
                                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                    />
                                    
                                    {vehicleList.map(v => (
                                        <Marker 
                                            key={v.vehicleId} 
                                            position={[v.lat, v.lng]} 
                                            icon={carIcon}
                                            eventHandlers={{
                                                click: () => setSelectedVehicle(v)
                                            }}
                                        >
                                            <Popup className="custom-popup">
                                                <div className="p-1 space-y-2">
                                                    <div className="flex items-center gap-2 border-b pb-1">
                                                        <Car size={14} className="text-primary" />
                                                        <span className="font-bold">{v.vehicleId}</span>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px]">
                                                        <span className="text-muted-foreground text-primary font-bold">
                                                            {v.isDelivery && v.deliveryStatus === 'DELIVERED' ? 'Renter:' : 'Driver:'}
                                                        </span>
                                                        <span className="font-semibold text-indigo-600 truncate">{v.assignedDriver || 'N/A'}</span>
                                                        <span className="text-muted-foreground">Speed:</span>
                                                        <span className="font-semibold text-primary">{v.speed} km/h</span>
                                                        <span className="text-muted-foreground">Latitude:</span>
                                                        <span>{v.lat.toFixed(5)}</span>
                                                        <span className="text-muted-foreground">Longitude:</span>
                                                        <span>{v.lng.toFixed(5)}</span>
                                                    </div>
                                                    <p className="text-[10px] text-muted-foreground border-t pt-1 mt-1 italic">
                                                        Updating in real-time...
                                                    </p>
                                                </div>
                                            </Popup>
                                        </Marker>
                                    ))}

                                    {selectedVehicle && (
                                        <RecenterMap positions={[selectedVehicle]} />
                                    )}
                                    {!selectedVehicle && vehicleList.length > 0 && (
                                        <RecenterMap positions={vehicleList} />
                                    )}
                                </MapContainer>
                            </div>
                        )}

                        {/* Map Legend/Status Overlay */}
                        {!selectedVehicle?.isDelivery && (
                            <div className="absolute bottom-4 left-4 z-[50] bg-background/80 backdrop-blur-md p-3 rounded-lg border shadow-lg max-w-xs animate-in slide-in-from-left-4">
                                <div className="flex items-center gap-2 mb-2 text-xs font-bold border-b pb-2">
                                    <Info size={14} className="text-primary" />
                                    Simulation Insights
                                </div>
                                <p className="text-[10px] text-muted-foreground leading-relaxed">
                                    This view displays live data received from the GPS simulation script. Markers update automatically as new coordinates arrive.
                                </p>
                            </div>
                        )}
                    </Card>
                </div>
            </div>
        </LayoutComponent>
    );
};

export default AdminTracking;
