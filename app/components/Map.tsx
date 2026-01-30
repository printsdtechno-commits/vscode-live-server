"use client";
import { MapContainer, TileLayer, Marker, Popup, ZoomControl, Polyline, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect } from "react";

// Fix for default marker icon in leaflet with webpack
const icon = L.icon({
    iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
    iconRetinaUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
    shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
});

interface MapProps {
    pickup?: string;
    drop?: string;
}

import { getCoordinates } from "@/lib/utils";

// Helper to auto-fit markers

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

export default function MapComponent({ pickup, drop }: MapProps) {
    const pickupCoords = pickup ? getCoordinates(pickup) : null;
    const dropCoords = drop ? getCoordinates(drop) : null;

    // Create icons with colors
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
        <div className="absolute inset-0 z-0">
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
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {pickupCoords && (
                    <Marker position={pickupCoords} icon={pickupIcon}>
                        <Popup>ஏறுமிடம்: {pickup}</Popup>
                    </Marker>
                )}

                {dropCoords && (
                    <Marker position={dropCoords} icon={dropIcon}>
                        <Popup>இறங்குமிடம்: {drop}</Popup>
                    </Marker>
                )}

                {pickupCoords && dropCoords && (
                    <Polyline
                        positions={[pickupCoords, dropCoords]}
                        pathOptions={{ color: '#10b981', weight: 4, dashArray: '10, 10', opacity: 0.6 }}
                    />
                )}
            </MapContainer>
        </div>
    );
}
