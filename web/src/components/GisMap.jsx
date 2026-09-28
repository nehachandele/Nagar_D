import React, { useEffect, useRef } from 'react';
import L from 'leaflet';

export default function GisMap({ complaints = [], onSelectComplaint }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // Initialize map centered at Pune Municipal Corporation
      const map = L.map(mapContainerRef.current, {
        center: [18.5204, 73.8567],
        zoom: 13,
      });

      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19,
      }).addTo(map);

      markersLayerRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
    }

    return () => {
      // Keep instance intact across renders
    };
  }, []);

  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current) return;

    markersLayerRef.current.clearLayers();

    const validPoints = complaints.filter(
      (c) => c && typeof c.latitude === 'number' && typeof c.longitude === 'number'
    );

    if (validPoints.length === 0) return;

    const bounds = L.latLngBounds();

    validPoints.forEach((c) => {
      const latLng = [c.latitude, c.longitude];
      bounds.extend(latLng);

      const color =
        c.status === 'resolved'
          ? '#10b981'
          : c.severity === 'critical' || c.priority_score >= 80
          ? '#ef4444'
          : c.severity === 'high' || c.priority_score >= 60
          ? '#f59e0b'
          : '#3b82f6';

      const circle = L.circleMarker(latLng, {
        radius: c.priority_score ? Math.max(8, c.priority_score / 8) : 9,
        fillColor: color,
        color: '#ffffff',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.85,
      });

      const popupContent = `
        <div style="font-family: sans-serif; min-width: 180px; padding: 4px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
            <span style="font-weight: 800; font-size: 11px; color: ${color}; text-transform: uppercase;">
              #${c.id} ${c.category}
            </span>
            <span style="font-size: 10px; background: #e5e7eb; padding: 2px 6px; border-radius: 4px; font-weight: 700;">
              ${c.status}
            </span>
          </div>
          <div style="font-size: 13px; font-weight: 700; color: #111827; margin-bottom: 4px;">
            ${c.title}
          </div>
          <div style="font-size: 11px; color: #6b7280; margin-bottom: 6px;">
            📍 ${c.address || `${c.latitude.toFixed(4)}, ${c.longitude.toFixed(4)}`}
          </div>
          <div style="font-size: 11px; color: #374151; font-weight: 600;">
            Priority Score: <b>${c.priority_score || 50}/100</b>
          </div>
        </div>
      `;

      circle.bindPopup(popupContent);
      circle.on('click', () => {
        if (onSelectComplaint) onSelectComplaint(c);
      });

      markersLayerRef.current.addLayer(circle);
    });

    if (validPoints.length > 0 && mapInstanceRef.current) {
      mapInstanceRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    }
  }, [complaints]);

  return (
    <div
      ref={mapContainerRef}
      style={{
        width: '100%',
        height: '520px',
        borderRadius: '16px',
        overflow: 'hidden',
        border: '1px solid #1f2937',
        zIndex: 1,
      }}
    />
  );
}
