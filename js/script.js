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

// Konstanten
const DEFAULT_DEVICE_ID = 'BF0160F5-4138-402C-A5F0-DEB1AA1F4216';

// Konstanten und Hilfsfunktionen für Device-Management
const STORED_DEVICES_KEY = 'miataruDevices';

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

// Funktion zum Abrufen der Position
async function fetchDeviceLocation(deviceId) {
    try {
        // POST Request mit Device ID
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
            const longitude = parseFloat(location.Longitude);
            const latitude = parseFloat(location.Latitude);
            const timestamp = new Date(parseFloat(location.Timestamp) * 1000);
            
            // Gespeicherten Namen abrufen, falls vorhanden
            const storedDevices = loadStoredDevices();
            const storedName = storedDevices[deviceId];
            const displayName = storedName ? `${storedName} (${deviceId})` : deviceId;
            
            if (currentMarker) {
                map.removeLayer(currentMarker);
            }
            
            // Marker mit erweitertem Popup erstellen
            currentMarker = L.marker([latitude, longitude], {
                icon: pinIcon,
                title: displayName
            });
            currentMarker.addTo(map);
            
            // Buttons basierend auf Speicherstatus
            let actionButtons;
            if (storedName) {
                actionButtons = `
                    <div class="popup-buttons">
                        <button onclick="showSaveDeviceModal('${deviceId}', '${storedName}')" class="rename-btn">Umbenennen</button>
                        <button onclick="showDeleteDeviceModal('${deviceId}')" class="delete-btn">×</button>
                    </div>`;
            } else {
                actionButtons = `
                    <button onclick="showSaveDeviceModal('${deviceId}')" class="save-device-btn">Device speichern</button>`;
            }
            
            // Erweitertes Popup mit dynamischen Buttons
            const popupContent = `
                <strong>DeviceID:</strong> ${displayName}<br>
                <strong>Koordinaten:</strong> ${latitude.toFixed(6)}, ${longitude.toFixed(6)}<br>
                <strong>Genauigkeit:</strong> ${parseFloat(location.HorizontalAccuracy).toFixed(1)}m<br>
                <strong>Letzte Aktualisierung:</strong> ${timestamp.toLocaleString()}<br>
                ${actionButtons}
            `;
            
            currentMarker.bindPopup(popupContent).openPopup();
            
            map.flyTo([latitude, longitude], 13, {
                duration: 1.5
            });
        }
    } catch (error) {
        console.error('Fehler beim Abrufen der Position:', error);
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
        title.textContent = 'Device umbenennen';
        saveButton.textContent = 'Umbenennen';
        input.value = existingName;
    } else {
        title.textContent = 'Device speichern';
        saveButton.textContent = 'Speichern';
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