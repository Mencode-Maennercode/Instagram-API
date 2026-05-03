# Instagram API Integration

Dieses Repository synchronisiert Instagram-Daten für statische Webseiten mit automatischer Token-Erneuerung.

## Setup

### 1. Facebook Developer App
- Instagram Basic Display API hinzufügen
- Redirect URI: `https://mencode-maennercode.github.io/Instagram-API/instagram-callback.html`
- Website-URL: `https://mencode-maennercode.github.io/Instagram-API/`

### 2. GitHub Secrets konfigurieren
Repository → Settings → Secrets and variables → Actions:
- `INSTAGRAM_CLIENT_ID` - Deine Facebook App ID
- `INSTAGRAM_CLIENT_SECRET` - Dein Facebook App Secret
- `INSTAGRAM_ACCESS_TOKEN` - Nach erster Authentifizierung

### 3. GitHub Pages aktivieren
Settings → Pages → Source: Deploy from branch → Branch: main → /root

### 4. Erste Authentifizierung
1. GitHub Action manuell starten (workflow_dispatch)
2. Authentifizierungs-URL aus Workflow Log kopieren
3. Mit Instagram Account einloggen
4. Access Token aus Log kopieren
5. Als `INSTAGRAM_ACCESS_TOKEN` Secret speichern

## Automatisierung
- **Alle 6 Stunden**: Instagram Daten werden automatisch aktualisiert
- **Token-Erneuerung**: Long-lived tokens (60 Tage) werden automatisch erneuert
- **Fehlerbehandlung**: Bei Problemen wird der Workflow gestoppt

## Datenzugriff

### Für deine statische Website:
```javascript
fetch('https://mencode-maennercode.github.io/Instagram-API/data/instagram.json')
  .then(response => response.json())
  .then(data => {
    // Instagram Feed anzeigen
    data.media.forEach(post => {
      console.log(post.caption, post.media_url, post.permalink);
    });
  });
```

### Datenstruktur:
```json
{
  "last_updated": "2024-01-01T12:00:00.000Z",
  "total_count": 10,
  "media": [
    {
      "id": "1234567890",
      "caption": "Post caption",
      "media_type": "IMAGE|VIDEO|CAROUSEL_ALBUM",
      "media_url": "https://...",
      "permalink": "https://instagram.com/p/...",
      "timestamp": "2024-01-01T10:00:00.000Z",
      "thumbnail_url": "https://...",
      "children": { ... } // für Carousel Posts
    }
  ]
}
```

## Features
✅ Automatische Token-Erneuerung  
✅ Alle Instagram Post-Typen (Bild, Video, Carousel)  
✅ Keine Third-Party Anbieter  
✅ Vollständig statisch  
✅ CDN durch GitHub Pages  
✅ Fehlerbehandlung und Logging  

## Troubleshooting
- **Token abgelaufen**: Neue Authentifizierung durchführen
- **Fehler im Log**: GitHub Action Logs prüfen
- **Keine Daten**: Instagram Account prüfen und Rechte erteilen
