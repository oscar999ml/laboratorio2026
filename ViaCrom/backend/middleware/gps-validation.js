const { haversine } = require('../utils/distancia');

function gpsValidation(maxDistanceMeters) {
    return (req, res, next) => {
        const { latitude, longitude } = req.body;

        if (!latitude || !longitude) {
            return res.status(400).json({ error: 'Coordenadas GPS requeridas' });
        }

        const lat = parseFloat(latitude);
        const lng = parseFloat(longitude);

        if (isNaN(lat) || isNaN(lng)) {
            return res.status(400).json({ error: 'Coordenadas GPS inválidas' });
        }

        if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
            return res.status(400).json({ error: 'Coordenadas fuera de rango' });
        }

        if (lat === 0 && lng === 0) {
            return res.status(400).json({ error: 'GPS sin señal - coordenadas (0,0)' });
        }

        req.validatedCoords = { latitude: lat, longitude: lng };

        if (req.body.report_latitude && req.body.report_longitude) {
            const distance = haversine(
                lat, lng,
                parseFloat(req.body.report_latitude),
                parseFloat(req.body.report_longitude)
            );
            const maxDist = maxDistanceMeters || parseInt(process.env.MAX_REPORT_DISTANCE || '200');
            if (distance > maxDist) {
                return res.status(403).json({
                    error: `Debes estar a menos de ${maxDist}m del evento para reportarlo`,
                    distance: Math.round(distance)
                });
            }
        }

        next();
    };
}

module.exports = gpsValidation;
