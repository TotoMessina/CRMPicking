/**
 * Servicio para interactuar con la API de Google Maps Geocoding.
 */

const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

/**
 * Convierte una dirección de texto en coordenadas geográficas.
 * @param {string} address - La dirección completa a geocodificar.
 * @returns {Promise<{lat: number, lng: number} | null>} Coordenadas o null si falla.
 */
export async function geocodeAddress(address) {
    if (!address || !GOOGLE_API_KEY) {
        console.warn('Geocoding: Falta dirección o API Key.');
        return null;
    }

    try {
        const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GOOGLE_API_KEY}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.status === 'OK' && data.results.length > 0) {
            const { lat, lng } = data.results[0].geometry.location;
            return { lat, lng };
        } else {
            console.error('Geocoding error:', data.status, data.error_message);
            return null;
        }
    } catch (error) {
        console.error('Error al llamar a la API de Geocoding:', error);
        return null;
    }
}
