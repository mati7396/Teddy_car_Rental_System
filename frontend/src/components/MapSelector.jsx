import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Navigation, Info, Maximize2, Minimize2, Crosshair, Loader2 } from 'lucide-react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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

// Company Office Location (Central Addis Ababa)
const OFFICE_LOCATION = [9.0227, 38.7460];
const DELIVERY_RADIUS = 500; // meters

const MapSelector = ({ onLocationChange, initialLocation = null, isReadOnly = false }) => {
    const [position, setPosition] = useState(initialLocation);
    const [isDelivery, setIsDelivery] = useState(false);
    const [address, setAddress] = useState('Determining location...');
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isLocating, setIsLocating] = useState(!initialLocation && !isReadOnly);
    const initializationRef = React.useRef(false);

    // Initial Geolocation - Run only on mount or if initialLocation changes from NULL to VALUE
    useEffect(() => {
        if (initializationRef.current) {
            // If already initialized and we have a new initialLocation, update the position
            if (initialLocation && initialLocation !== position) {
                handleLocationUpdate(initialLocation);
            }
            return;
        }

        if (!initialLocation && !isReadOnly && navigator.geolocation) {
            setIsLocating(true);
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    const userPos = [pos.coords.latitude, pos.coords.longitude];
                    handleLocationUpdate(userPos);
                    setIsLocating(false);
                    initializationRef.current = true;
                },
                (err) => {
                    console.warn("Geolocation denied or failed:", err);
                    handleLocationUpdate(OFFICE_LOCATION);
                    setIsLocating(false);
                    initializationRef.current = true;
                },
                { enableHighAccuracy: true, timeout: 5000 }
            );
        } else if (initialLocation) {
            handleLocationUpdate(initialLocation);
            setIsLocating(false);
            initializationRef.current = true;
        }
    }, [isReadOnly, initialLocation]); // Only run once on mount for initialization

    // Calculate distance from office
    const calculateDistance = (pos1, pos2) => {
        const pin = L.latLng(pos1[0], pos1[1]);
        const office = L.latLng(pos2[0], pos2[1]);
        return pin.distanceTo(office); // returns distance in meters
    };

    const handleLocationUpdate = async (newPos) => {
        setPosition(newPos);
        const distance = calculateDistance(newPos, OFFICE_LOCATION);
        const deliveryStatus = distance > DELIVERY_RADIUS;
        setIsDelivery(deliveryStatus);

        // Reverse Geocoding (Nominatim - Free)
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${newPos[0]}&lon=${newPos[1]}`);
            const data = await res.json();
            const addr = data.display_name || `Lat: ${newPos[0].toFixed(4)}, Lng: ${newPos[1].toFixed(4)}`;
            setAddress(addr);

            if (onLocationChange) {
                onLocationChange({
                    lat: newPos[0],
                    lng: newPos[1],
                    isDelivery: deliveryStatus,
                    address: addr
                });
            }
        } catch (error) {
            console.error("Geocoding error:", error);
            const fallbackAddr = `Lat: ${newPos[0].toFixed(4)}, Lng: ${newPos[1].toFixed(4)}`;
            setAddress(fallbackAddr);
            if (onLocationChange) {
                onLocationChange({
                    lat: newPos[0],
                    lng: newPos[1],
                    isDelivery: deliveryStatus,
                    address: fallbackAddr
                });
            }
        }
    };

    const toggleFullscreen = (e) => {
        if (e) e.preventDefault();
        setIsFullscreen(!isFullscreen);
    };

    const handleLocateMe = (e) => {
        if (e) e.preventDefault();
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition((pos) => {
                handleLocationUpdate([pos.coords.latitude, pos.coords.longitude]);
            });
        }
    };

    // Component to handle clicks on the map
    const LocationPicker = () => {
        useMapEvents({
            click(e) {
                if (!isReadOnly) {
                    handleLocationUpdate([e.latlng.lat, e.latlng.lng]);
                }
            },
        });
        return null;
    };

    // Center map on position changes
    const RecenterMap = ({ pos }) => {
        const map = useMap();
        useEffect(() => {
            map.invalidateSize(); // Critical for fullscreen toggle
            map.setView(pos);
        }, [pos, map, isFullscreen]);
        return null;
    };

    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;

        setIsSearching(true);
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`);
            const data = await res.json();
            if (data && data.length > 0) {
                const newPos = [parseFloat(data[0].lat), parseFloat(data[0].lon)];
                handleLocationUpdate(newPos);
            } else {
                alert("Location not found. Please try a different search term.");
            }
        } catch (error) {
            console.error("Search error:", error);
        } finally {
            setIsSearching(false);
        }
    };

    const mapContent = (
        <Card className={`overflow-hidden border-2 border-border/50 shadow-lg transition-all duration-300 ${isFullscreen ? 'fixed inset-4 z-[9999] bg-white' : 'relative'}`}>
            <div className="p-4 bg-muted/30 border-b flex flex-col gap-3">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2 min-w-0">
                        <MapPin className="text-primary shrink-0" size={20} />
                        <div className="min-w-0">
                            <h4 className="font-bold text-sm">Pickup / Delivery Location</h4>
                            <p className="text-xs text-muted-foreground truncate max-w-[150px] md:max-w-[400px]">{address}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {!isReadOnly && (
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8 text-primary"
                                title="Locate Me"
                                onClick={handleLocateMe}
                            >
                                <Crosshair size={16} />
                            </Button>
                        )}
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={toggleFullscreen}
                            title={isFullscreen ? "Exit Fullscreen" : "Maximize Map"}
                        >
                            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                        </Button>
                        <div className="hidden sm:flex ml-2">
                            {isDelivery ? (
                                <Badge className="bg-orange-100 text-orange-800 border-orange-200">
                                    Delivery
                                </Badge>
                            ) : (
                                <Badge className="bg-green-100 text-green-800 border-green-200">
                                    Office
                                </Badge>
                            )}
                        </div>
                    </div>
                </div>

                {!isReadOnly && (
                    <form onSubmit={handleSearch} className="flex gap-2">
                        <div className="relative flex-1">
                            <Input
                                placeholder="Search location (e.g. Bole, Addis Ababa)..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="h-9 pr-8 text-sm"
                            />
                            {isSearching && (
                                <Loader2 className="absolute right-2 top-2 animate-spin text-muted-foreground" size={18} />
                            )}
                        </div>
                        <Button type="submit" size="sm" className="h-9 px-3">
                            Search
                        </Button>
                    </form>
                )}
            </div>

            <div className={`relative ${isFullscreen ? 'h-[calc(100%-110px)]' : 'h-[300px]'} w-full z-0`}>
                {isLocating ? (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-muted/20 backdrop-blur-[2px]">
                        <Loader2 className="text-primary animate-spin mb-2" size={32} />
                        <p className="text-sm font-medium text-muted-foreground">Finding your location...</p>
                    </div>
                ) : position ? (
                    <MapContainer
                        center={position}
                        zoom={15}
                        scrollWheelZoom={true}
                        className="h-full w-full"
                    >
                        <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />

                        <Circle
                            center={OFFICE_LOCATION}
                            radius={DELIVERY_RADIUS}
                            pathOptions={{ color: '#30D5C8', fillColor: '#30D5C8', fillOpacity: 0.1 }}
                        />

                        <Marker position={position} />
                        <Marker position={OFFICE_LOCATION} opacity={0.4} icon={new L.Icon({
                            iconUrl: markerIcon,
                            shadowUrl: markerShadow,
                            iconSize: [15, 25],
                            iconAnchor: [7, 25]
                        })} />

                        <LocationPicker />
                        <RecenterMap pos={position} />
                    </MapContainer>
                ) : (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-muted/20">
                        <Info className="text-muted-foreground mb-2" size={32} />
                        <p className="text-sm font-medium text-muted-foreground">Please select a location on the map.</p>
                    </div>
                )}
            </div>

            <div className="p-3 bg-white border-t flex items-center justify-between text-[10px] text-muted-foreground">
                <div className="flex items-center gap-2">
                    <Info size={14} className="text-primary" />
                    <span>{isReadOnly ? "Static backup location view" : "Drag or click map to set location. Delivery required outside circle."}</span>
                </div>
                {isFullscreen && (
                    <Button variant="outline" size="sm" onClick={toggleFullscreen} className="h-7 px-3">
                        Close Map
                    </Button>
                )}
            </div>
        </Card>
    );

    return (
        <>
            {isFullscreen && <div className="fixed inset-0 bg-black/50 z-[9998] backdrop-blur-sm" onClick={toggleFullscreen} />}
            {mapContent}
        </>
    );
};

export default MapSelector;
