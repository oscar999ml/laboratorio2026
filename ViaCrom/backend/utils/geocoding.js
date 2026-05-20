const https = require('https');

const NOMINATIM_URL = process.env.NOMINATIM_URL || 'https://nominatim.openstreetmap.org';

function nominatimRequest(path) {
    return new Promise((resolve, reject) => {
        const url = `${NOMINATIM_URL}${path}`;
        https.get(url, { headers: { 'User-Agent': 'ViaCrom/1.0' } }, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try { resolve(JSON.parse(data)); }
                catch (e) { reject(new Error('Error parsing Nominatim response')); }
            });
        }).on('error', reject);
    });
}

async function reverseGeocode(lat, lon) {
    const data = await nominatimRequest(`/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1`);
    return data.display_name || null;
}

async function searchLocation(query) {
    const data = await nominatimRequest(`/search?format=json&q=${encodeURIComponent(query)}&limit=5`);
    return data.map(item => ({
        label: item.display_name,
        latitude: parseFloat(item.lat),
        longitude: parseFloat(item.lon)
    }));
}

module.exports = { reverseGeocode, searchLocation };
