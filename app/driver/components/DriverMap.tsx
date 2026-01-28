"use client";

import { MapContainer, TileLayer, Marker, Popup, ZoomControl, Polyline, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect } from "react";

const icon = L.icon({
    iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
    iconRetinaUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
    shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
});

interface DriverMapProps {
    pickup?: string;
    drop?: string;
}

// Coordinate Database for Simulation
const COORDS: Record<string, [number, number]> = {
    'adirampattinam': [10.3409, 79.3789],
    'pattukottai': [10.4287, 79.3175],
    'muthupettai': [10.4000, 79.4833],
    'thanjavur': [10.7870, 79.1378],
    'mallipattinam': [10.2742, 79.3175],
    'peravurani': [10.3000, 79.1667],
    'chennai': [13.0827, 80.2707],
};

const getCoords = (name: string): [number, number] => {
    const lower = name.toLowerCase();
    const key = Object.keys(COORDS).find(k => lower.includes(k));
    if (key) return COORDS[key];
    const offset = (name.length % 10) * 0.002;
    return [10.3409 + offset, 79.3789 + offset];
};

// Helper to auto-fit markers
function MapRecenter({ pickup, drop }: { pickup: [number, number] | null, drop: [number, number] | null }) {
    const map = useMap();

    useEffect(() => {
        if (pickup && drop) {
            const bounds = L.latLngBounds([pickup, drop]);
            map.fitBounds(bounds, { padding: [100, 100], animate: true });
        } else if (pickup) {
            map.setView(pickup, 14, { animate: true });
        } else if (drop) {
            map.setView(drop, 14, { animate: true });
        }
    }, [pickup, drop, map]);

    return null;
}

export default function DriverMap({ pickup, drop }: DriverMapProps) {
    const pickupCoords = pickup ? getCoords(pickup) : null;
    const dropCoords = drop ? getCoords(drop) : null;

    const pickupIcon = L.divIcon({
        html: `<div class="w-4 h-4 bg-emerald-500 rounded-full ring-4 ring-white shadow-lg"></div>`,
        className: 'custom-div-icon',
        iconSize: [20, 20],
        iconAnchor: [10, 10]
    });

    const dropIcon = L.divIcon({
        html: `<div class="w-4 h-4 bg-red-500 rounded-full ring-4 ring-white shadow-lg"></div>`,
        className: 'custom-div-icon',
        iconSize: [20, 20],
        iconAnchor: [10, 10]
    });

    return (
        <div className="fixed inset-0 z-0">
            <MapContainer
                center={[10.3409, 79.3789]}
                zoom={14}
                scrollWheelZoom={true}
                className="h-full w-full"
                zoomControl={false}
            >
                <ZoomControl position="topright" />
                <MapRecenter pickup={pickupCoords} drop={dropCoords} />
                <TileLayer
                    attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
                    url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png"
                />

                {pickupCoords && (
                    <Marker position={pickupCoords} icon={pickupIcon}>
                        <Popup>Pickup: {pickup}</Popup>
                    </Marker>
                )}

                {dropCoords && (
                    <Marker position={dropCoords} icon={dropIcon}>
                        <Popup>Drop: {drop}</Popup>
                    </Marker>
                )}

                {pickupCoords && dropCoords && (
                    <Polyline
                        positions={[pickupCoords, dropCoords]}
                        pathOptions={{ color: '#10b981', weight: 4, dashArray: '10, 10', opacity: 0.6 }}
                    />
                )}

                {!pickupCoords && !dropCoords && (
                    <Marker position={[10.3409, 79.3789]} icon={pickupIcon}>
                        <Popup>You are here</Popup>
                    </Marker>
                )}
            </MapContainer>
        </div>
    );
}
