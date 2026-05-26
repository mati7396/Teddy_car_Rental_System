import React, { useEffect, useRef, useState } from 'react';
import { api } from '@/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const SimulationControl = () => {
    const [vehicleId, setVehicleId] = useState('veh-1');
    const [lat, setLat] = useState(9.0);
    const [lng, setLng] = useState(38.7);
    const [speed, setSpeed] = useState(30);
    const [running, setRunning] = useState(false);
    const [lastUpdate, setLastUpdate] = useState(null);
    const intervalRef = useRef(null);
    const evtSourceRef = useRef(null);

    const sendUpdate = async (payload) => {
        try {
            await api.post('/tracking/simulate', payload);
            setLastUpdate(payload);
        } catch (err) {
            console.error('Failed to send simulated GPS', err);
        }
    };

    const start = () => {
        if (running) return;
        setRunning(true);
        intervalRef.current = setInterval(() => {
            // small random walk
            setLat((p) => {
                const nl = Number((p + (Math.random() - 0.5) * 0.0005).toFixed(6));
                return nl;
            });
            setLng((p) => {
                const nl = Number((p + (Math.random() - 0.5) * 0.0005).toFixed(6));
                return nl;
            });
        }, 2000);
    };

    const stop = () => {
        setRunning(false);
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = null;
    };

    // whenever lat/lng change and running, send update
    useEffect(() => {
        if (!running) return;
        const payload = { vehicleId, lat, lng, speed, timestamp: Date.now() };
        sendUpdate(payload);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [lat, lng]);

    // cleanup
    useEffect(() => {
        return () => stop();
    }, []);

    // optional: connect to SSE to receive live updates
    useEffect(() => {
        try {
            const url = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api') + '/tracking/stream';
            const es = new EventSource(url);
            es.addEventListener('update', (e) => {
                try {
                    const data = JSON.parse(e.data);
                    // if the stream contains this vehicle update, show it
                    if (data.vehicleId === vehicleId) setLastUpdate(data);
                } catch (err) { /* ignore */ }
            });
            evtSourceRef.current = es;
            return () => {
                es.close();
            };
        } catch (err) {
            console.warn('SSE not available', err);
        }
    }, [vehicleId]);

    return (
        <div className="flex items-center gap-2">
            <Input value={vehicleId} onChange={(e) => setVehicleId(e.target.value)} className="w-28" />
            <Input value={lat} onChange={(e) => setLat(Number(e.target.value))} className="w-28" />
            <Input value={lng} onChange={(e) => setLng(Number(e.target.value))} className="w-28" />
            <Input value={speed} onChange={(e) => setSpeed(Number(e.target.value))} className="w-20" />
            {!running ? (
                <Button size="sm" onClick={start}>Start</Button>
            ) : (
                <Button size="sm" variant="destructive" onClick={stop}>Stop</Button>
            )}
            <Button size="sm" onClick={() => sendUpdate({ vehicleId, lat, lng, speed, timestamp: Date.now() })}>Send</Button>
            {lastUpdate && (
                <div className="ml-3 text-xs text-muted-foreground">{`(${lastUpdate.lat.toFixed(5)}, ${lastUpdate.lng.toFixed(5)})`}</div>
            )}
        </div>
    );
};

export default SimulationControl;
