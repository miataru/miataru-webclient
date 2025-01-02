// Karte initialisieren
const map = L.map('map').setView([51.1657, 10.4515], 6); // Zentrum von Deutschland

// OpenStreetMap Layer hinzufügen
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

// Suchfunktion implementieren
document.getElementById('searchButton').addEventListener('click', async () => {
    const searchInput = document.getElementById('searchInput').value;
    
    try {
        // Nominatim API für Geocoding verwenden
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchInput)}`);
        const data = await response.json();
        
        if (data.length > 0) {
            const { lat, lon } = data[0];
            map.setView([lat, lon], 13);
            
            // Marker auf der gefundenen Position setzen
            L.marker([lat, lon]).addTo(map)
                .bindPopup(searchInput)
                .openPopup();
        } else {
            alert('Ort nicht gefunden');
        }
    } catch (error) {
        console.error('Fehler bei der Suche:', error);
        alert('Fehler bei der Suche');
    }
}); 