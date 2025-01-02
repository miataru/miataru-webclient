// Karte initialisieren
const map = L.map('map').setView([51.1657, 10.4515], 6); // Zentrum von Deutschland

// OpenStreetMap Layer hinzufügen
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

let currentMarker = null;
let intervalId = null;
let defaultIntervalId = null;  // Neuer Timer für Default Device
let currentDeviceToSave = null;
let deviceToDelete = null;

// Neue globale Variable für den Auto-Center Status
let autoCenterEnabled = true;

// Konstanten
const DEFAULT_DEVICE_ID = 'BF0160F5-4138-402C-A5F0-DEB1AA1F4216';

// Konstanten und Hilfsfunktionen für Device-Management
const STORED_DEVICES_KEY = 'miataruDevices';

// Konstanten für Tooltip-Stile
const TOOLTIP_STYLE_KEY = 'miataruTooltipStyle';
const TOOLTIP_STYLE = {
    SIMPLE: 'simple',
    FULL: 'full'
};

// Globale Variable für den Genauigkeitskreis
let accuracyCircle = null;

// Funktion zum Laden der gespeicherten Devices
function loadStoredDevices() {
    const stored = localStorage.getItem(STORED_DEVICES_KEY);
    return stored ? JSON.parse(stored) : {};
}

// Funktion zum Speichern eines Devices
function saveDevice(deviceId, name) {
    const devices = loadStoredDevices();
    devices[deviceId] = name;
    localStorage.setItem(STORED_DEVICES_KEY, JSON.stringify(devices));
    updateDevicesDropdown();
}

// Funktion zum Aktualisieren des Dropdowns
function updateDevicesDropdown() {
    const select = document.getElementById('savedDevices');
    const devices = loadStoredDevices();
    
    // Dropdown leeren bis auf den ersten Eintrag
    while (select.options.length > 1) {
        select.remove(1);
    }
    
    // Gespeicherte Devices hinzufügen
    Object.entries(devices).forEach(([deviceId, name]) => {
        const option = new Option(`${name} (${deviceId})`, deviceId);
        select.add(option);
    });
}

// Benutzerdefiniertes Pin-Icon erstellen
const pinIcon = L.divIcon({
    className: 'custom-pin',
    html: `<svg width="24" height="36" viewBox="0 0 24 36" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 0C5.383 0 0 5.383 0 12c0 9 12 24 12 24s12-15 12-24c0-6.617-5.383-12-12-12zm0 18c-3.314 0-6-2.686-6-6s2.686-6 6-6 6 2.686 6 6-2.686 6-6 6z"
        fill="#007bff" 
        stroke="#ffffff"
        stroke-width="1"/>
    </svg>`,
    iconSize: [24, 36],
    iconAnchor: [12, 36],
    popupAnchor: [0, -36]
});

// Funktion zum Löschen eines Devices
function deleteDevice(deviceId) {
    const devices = loadStoredDevices();
    delete devices[deviceId];
    localStorage.setItem(STORED_DEVICES_KEY, JSON.stringify(devices));
    updateDevicesDropdown();
    
    // Pin und Popup aktualisieren
    if (currentMarker) {
        fetchDeviceLocation(deviceId);
    }
}

// Funktion für relative Zeitangaben
function getRelativeTimeString(timestamp) {
    const now = new Date().getTime();
    const diff = now - timestamp;
    
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
        return `${days} ${days === 1 ? 'day' : 'days'} ago`;
    } else if (hours > 0) {
        return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
    } else if (minutes > 0) {
        return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
    } else {
        return `${seconds} ${seconds === 1 ? 'second' : 'seconds'} ago`;
    }
}

// Funktion zum Erstellen und Hinzufügen des Auto-Center Buttons
function addAutoCenterButton() {
    // Erstelle einen benutzerdefinierten Leaflet Control
    const AutoCenterControl = L.Control.extend({
        options: {
            position: 'topleft'
        },

        onAdd: function() {
            const button = L.DomUtil.create('button', 'auto-center-button');
            button.innerHTML = '🎯';
            button.title = 'Toggle Auto-Center';
            button.type = 'button';
            
            // Initial aktiv
            button.classList.add('active');
            
            L.DomEvent.disableClickPropagation(button);
            
            button.addEventListener('click', () => {
                autoCenterEnabled = !autoCenterEnabled;
                button.classList.toggle('active');
            });
            
            return button;
        }
    });

    // Füge den Control zur Karte hinzu
    map.addControl(new AutoCenterControl());
}

// Button nach der Karten-Initialisierung hinzufügen
addAutoCenterButton();
addTooltipStyleControl();  // Tooltip Style Control hinzufügen

// Funktion zum Laden des Tooltip-Stils
function getTooltipStyle() {
    return localStorage.getItem(TOOLTIP_STYLE_KEY) || TOOLTIP_STYLE.FULL;
}

// Funktion zum Speichern des Tooltip-Stils
function setTooltipStyle(style) {
    localStorage.setItem(TOOLTIP_STYLE_KEY, style);
}

// Tooltip Control für die Karte
function addTooltipStyleControl() {
    const TooltipControl = L.Control.extend({
        options: {
            position: 'topleft'
        },

        onAdd: function() {
            const button = L.DomUtil.create('button', 'tooltip-style-button');
            button.innerHTML = '💬';
            button.title = 'Toggle Tooltip Style';
            button.type = 'button';
            
            // Initial Style setzen
            if (getTooltipStyle() === TOOLTIP_STYLE.SIMPLE) {
                button.classList.add('simple');
            }
            
            L.DomEvent.disableClickPropagation(button);
            
            button.addEventListener('click', () => {
                const currentStyle = getTooltipStyle();
                const newStyle = currentStyle === TOOLTIP_STYLE.FULL ? TOOLTIP_STYLE.SIMPLE : TOOLTIP_STYLE.FULL;
                setTooltipStyle(newStyle);
                button.classList.toggle('simple');
                
                // Aktuellen Marker aktualisieren, falls vorhanden
                if (currentMarker) {
                    currentMarker.getPopup().setContent(createPopupContent(
                        currentDeviceId,
                        currentDeviceName,
                        currentLocation
                    ));
                }
            });
            
            return button;
        }
    });

    map.addControl(new TooltipControl());
}

// Funktion zum Erstellen des Popup-Inhalts
function createPopupContent(deviceId, storedName, location) {
    const displayName = storedName ? `${storedName} (${deviceId})` : deviceId;
    const simpleName = storedName || deviceId;  // Nur Name oder ID für Simple-Modus
    const timestamp = new Date(parseFloat(location.Timestamp) * 1000);
    
    // Buttons basierend auf Speicherstatus
    let actionButtons;
    if (storedName) {
        actionButtons = `
            <div class="popup-buttons">
                <button onclick="showSaveDeviceModal('${deviceId}', '${storedName}')" class="rename-btn">Rename</button>
                <button onclick="showDeleteDeviceModal('${deviceId}')" class="delete-btn">×</button>
            </div>`;
    } else {
        actionButtons = `
            <button onclick="showSaveDeviceModal('${deviceId}')" class="save-device-btn">Save Device</button>`;
    }
    
    // Popup-Inhalt basierend auf Stil
    if (getTooltipStyle() === TOOLTIP_STYLE.SIMPLE) {
        return `
            <strong>${simpleName}</strong><br>
            ${getRelativeTimeString(timestamp)}
        `;
    } else {
        return `
            <strong>DeviceID:</strong> ${displayName}<br>
            <strong>Coordinates:</strong> ${parseFloat(location.Latitude).toFixed(6)}, ${parseFloat(location.Longitude).toFixed(6)}<br>
            <strong>Accuracy:</strong> ${parseFloat(location.HorizontalAccuracy).toFixed(1)}m<br>
            <strong>Last Update:</strong> ${getRelativeTimeString(timestamp)} (${timestamp.toLocaleString()})<br>
            ${actionButtons}
        `;
    }
}

// Globale Variablen für aktuelle Marker-Informationen
let currentDeviceId = null;
let currentDeviceName = null;
let currentLocation = null;

// Funktion zum Abrufen der Position anpassen
async function fetchDeviceLocation(deviceId) {
    try {
        const response = await fetch('https://service.miataru.com/v1/GetLocation', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                "MiataruGetLocation": [
                    {
                        "Device": deviceId
                    }
                ]
            })
        });
        
        const data = await response.json();
        
        if (data && data.MiataruLocation && data.MiataruLocation[0]) {
            const location = data.MiataruLocation[0];
            const storedDevices = loadStoredDevices();
            const storedName = storedDevices[deviceId];
            
            // Aktuelle Informationen speichern
            currentDeviceId = deviceId;
            currentDeviceName = storedName;
            currentLocation = location;
            
            const latitude = parseFloat(location.Latitude);
            const longitude = parseFloat(location.Longitude);
            const accuracy = parseFloat(location.HorizontalAccuracy);
            
            // Bestehenden Marker und Kreis entfernen
            if (currentMarker) {
                map.removeLayer(currentMarker);
            }
            if (accuracyCircle) {
                map.removeLayer(accuracyCircle);
            }
            
            // Genauigkeitskreis hinzufügen
            accuracyCircle = L.circle([latitude, longitude], {
                radius: accuracy,
                color: '#007bff',
                fillColor: '#007bff',
                fillOpacity: 0.1,
                weight: 1
            }).addTo(map);
            
            // Marker erstellen und hinzufügen
            currentMarker = L.marker([latitude, longitude], {
                icon: pinIcon,
                title: storedName || deviceId
            });
            
            currentMarker.addTo(map);
            
            const popupContent = createPopupContent(deviceId, storedName, location);
            currentMarker.bindPopup(popupContent);
            
            if (autoCenterEnabled) {
                currentMarker.openPopup();
                // Zoom-Level basierend auf Genauigkeit anpassen
                const zoomLevel = Math.min(
                    18, // maximales Zoom-Level
                    Math.max(
                        13, // minimales Zoom-Level
                        19 - Math.log2(accuracy / 10) // Zoom basierend auf Genauigkeit
                    )
                );
                map.flyTo([latitude, longitude], zoomLevel, {
                    duration: 1.5
                });
            }
        }
    } catch (error) {
        console.error('Error fetching position:', error);
    }
}

// Modal-Funktionen anpassen
function showSaveDeviceModal(deviceId, existingName = '') {
    currentDeviceToSave = deviceId;
    const modal = document.getElementById('saveDeviceModal');
    const input = document.getElementById('deviceNameInput');
    const title = document.querySelector('#saveDeviceModal h3');
    const saveButton = document.getElementById('saveDeviceButton');
    
    // UI an Aktion anpassen
    if (existingName) {
        title.textContent = 'Rename Device';
        saveButton.textContent = 'Rename';
        input.value = existingName;
    } else {
        title.textContent = 'Save Device';
        saveButton.textContent = 'Save';
        input.value = '';
    }
    
    modal.style.display = 'flex';
    input.focus();
}

function hideSaveDeviceModal() {
    const modal = document.getElementById('saveDeviceModal');
    modal.style.display = 'none';
    currentDeviceToSave = null;
}

// Event-Listener für Modal-Buttons
document.getElementById('saveDeviceButton').addEventListener('click', () => {
    const name = document.getElementById('deviceNameInput').value.trim();
    if (name && currentDeviceToSave) {
        saveDevice(currentDeviceToSave, name);
        hideSaveDeviceModal();
    }
});

document.getElementById('cancelSaveButton').addEventListener('click', hideSaveDeviceModal);

// Schließen mit Escape-Taste
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        hideSaveDeviceModal();
    }
});

// Klick außerhalb des Modals schließt es
document.getElementById('saveDeviceModal').addEventListener('click', (e) => {
    if (e.target.id === 'saveDeviceModal') {
        hideSaveDeviceModal();
    }
});

// Event-Listener für das Dropdown
document.getElementById('savedDevices').addEventListener('change', (e) => {
    const selectedDeviceId = e.target.value;
    if (selectedDeviceId) {
        document.getElementById('searchInput').value = selectedDeviceId;
        startTracking(selectedDeviceId, false);
    }
});

// Initial die gespeicherten Devices laden
updateDevicesDropdown();

// Funktion zum Setzen der DeviceID in der URL
function setDeviceIdInUrl(deviceId) {
    window.location.hash = deviceId;
}

// Funktion zum Lesen der DeviceID aus der URL
function getDeviceIdFromUrl() {
    return window.location.hash.slice(1) || DEFAULT_DEVICE_ID;
}

// Funktion zum Starten der Aktualisierung anpassen
function startTracking(deviceId, isDefault = false) {
    // Bestehende Timer stoppen
    if (intervalId) clearInterval(intervalId);
    if (defaultIntervalId) clearInterval(defaultIntervalId);
    
    // DeviceID in URL setzen
    setDeviceIdInUrl(deviceId);
    
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

// Event-Listener für URL-Änderungen
window.addEventListener('hashchange', () => {
    const deviceId = getDeviceIdFromUrl();
    document.getElementById('searchInput').value = deviceId;
    startTracking(deviceId, deviceId === DEFAULT_DEVICE_ID);
});

// Initialisierung anpassen - URL-Parameter berücksichtigen
const initialDeviceId = getDeviceIdFromUrl();
if (initialDeviceId !== DEFAULT_DEVICE_ID) {
    document.getElementById('searchInput').value = initialDeviceId;
}
startTracking(initialDeviceId, initialDeviceId === DEFAULT_DEVICE_ID);

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

// Funktion zum Anzeigen des Lösch-Dialogs
function showDeleteDeviceModal(deviceId) {
    deviceToDelete = deviceId;
    const modal = document.getElementById('deleteDeviceModal');
    modal.style.display = 'flex';
}

// Funktion zum Ausblenden des Lösch-Dialogs
function hideDeleteDeviceModal() {
    const modal = document.getElementById('deleteDeviceModal');
    modal.style.display = 'none';
    deviceToDelete = null;
}

// Event-Listener für Lösch-Dialog
document.getElementById('confirmDeleteButton').addEventListener('click', () => {
    if (deviceToDelete) {
        deleteDevice(deviceToDelete);
        hideDeleteDeviceModal();
    }
});

document.getElementById('cancelDeleteButton').addEventListener('click', hideDeleteDeviceModal);

// Klick außerhalb des Lösch-Modals schließt es
document.getElementById('deleteDeviceModal').addEventListener('click', (e) => {
    if (e.target.id === 'deleteDeviceModal') {
        hideDeleteDeviceModal();
    }
});

// Escape-Taste schließt auch den Lösch-Dialog
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        hideDeleteDeviceModal();
        hideSaveDeviceModal();
    }
});

// Help Modal Funktionen
function showHelpModal() {
    const modal = document.getElementById('helpModal');
    modal.style.display = 'flex';
}

function hideHelpModal() {
    const modal = document.getElementById('helpModal');
    modal.style.display = 'none';
}

// Event Listener für Help Button
document.getElementById('helpButton').addEventListener('click', showHelpModal);
document.getElementById('closeHelpButton').addEventListener('click', hideHelpModal);

// Klick außerhalb des Help-Modals schließt es
document.getElementById('helpModal').addEventListener('click', (e) => {
    if (e.target.id === 'helpModal') {
        hideHelpModal();
    }
});

// Escape-Taste schließt auch das Help-Modal
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        hideHelpModal();
        hideDeleteDeviceModal();
        hideSaveDeviceModal();
    }
});

// Demo-Link Handler
document.querySelector('.demo-link')?.addEventListener('click', (e) => {
    e.preventDefault();
    const demoDeviceId = 'BF0160F5-4138-402C-A5F0-DEB1AA1F4216';
    document.getElementById('searchInput').value = demoDeviceId;
    startTracking(demoDeviceId, false);
    hideHelpModal();
}); 