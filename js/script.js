// Karte initialisieren
const map = L.map('map').setView([51.1657, 10.4515], 6); // Zentrum von Deutschland

// OpenStreetMap Layer hinzufügen
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

let currentMarker = null;
let intervalId = null;
let defaultIntervalId = null;  // Neuer Timer für Default Device

// Konstanten
const DEFAULT_DEVICE_ID = 'BF0160F5-4138-402C-A5F0-DEB1AA1F4216';

// Funktion zum Abrufen der Position
async function fetchDeviceLocation(deviceId) {
    try {
        const response = await fetch(`https://service.miataru.com/v1/GetLocationGeoJSON/${deviceId}`);
        const data = await response.json();
        
        if (data && data.geometry && data.geometry.coordinates) {
            const coordinates = data.geometry.coordinates;
            const longitude = coordinates[0];  // 10.891091
            const latitude = coordinates[1];   // 49.869953
            const name = data.properties?.name || deviceId;
            
            console.log('Position erhalten:', latitude, longitude); // Debug-Ausgabe
            
            // Bestehenden Marker entfernen, falls vorhanden
            if (currentMarker) {
                map.removeLayer(currentMarker);
            }
            
            // Neuen Marker mit Icon und Label erstellen
            const markerIcon = L.divIcon({
                html: `<div style="
                    background-color: white;
                    border: 2px solid #007bff;
                    border-radius: 3px;
                    padding: 2px 5px;
                    font-size: 12px;
                    white-space: nowrap;
                ">${name}</div>`,
                className: 'device-marker',
                iconAnchor: [15, 0]
            });
            
            // Marker mit Icon setzen und zur Karte hinzufügen
            currentMarker = L.marker([latitude, longitude], {
                icon: markerIcon
            });
            currentMarker.addTo(map);
            
            // Popup mit zusätzlichen Informationen
            currentMarker.bindPopup(`
                <strong>DeviceID:</strong> ${name}<br>
                <strong>Koordinaten:</strong> ${latitude.toFixed(6)}, ${longitude.toFixed(6)}<br>
                <strong>Letzte Aktualisierung:</strong> ${new Date().toLocaleTimeString()}
            `).openPopup();
            
            // Karte auf neue Position zentrieren mit Animation
            map.flyTo([latitude, longitude], 13, {
                duration: 1.5
            });
            
            console.log('Marker gesetzt und Karte zentriert'); // Debug-Ausgabe
        } else {
            console.log('Keine gültigen Daten in der GeoJSON-Antwort'); // Debug-Ausgabe
        }
    } catch (error) {
        console.error('Fehler beim Abrufen der Position:', error);
    }
}

// Funktion zum Starten der Aktualisierung
function startTracking(deviceId, isDefault = false) {
    // Bestehende Timer stoppen
    if (intervalId) clearInterval(intervalId);
    if (defaultIntervalId) clearInterval(defaultIntervalId);
    
    // Sofort erste Abfrage durchführen
    fetchDeviceLocation(deviceId);
    
    // Timer für regelmäßige Aktualisierung setzen
    const newInterval = setInterval(() => {
        fetchDeviceLocation(deviceId);
    }, 5000);
    
    // Timer im entsprechenden Intervall-Handler speichern
    if (isDefault) {
        defaultIntervalId = newInterval;
    } else {
        intervalId = newInterval;
    }
}

// Event-Listener für den Such-Button
document.getElementById('searchButton').addEventListener('click', () => {
    const inputDeviceId = document.getElementById('searchInput').value.trim();
    
    if (inputDeviceId) {
        // Wenn eine DeviceID eingegeben wurde, nur diese tracken
        startTracking(inputDeviceId, false);
    } else {
        // Wenn keine DeviceID eingegeben wurde, zurück zum Default
        startTracking(DEFAULT_DEVICE_ID, true);
    }
});

// Initial die Default-DeviceID laden und tracken
startTracking(DEFAULT_DEVICE_ID, true); 