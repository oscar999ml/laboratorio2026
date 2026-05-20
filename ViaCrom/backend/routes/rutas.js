const express = require('express');
const https = require('https');
const authMiddleware = require('../middleware/auth');
const gpsValidation = require('../middleware/gps-validation');
const { v4: uuidv4 } = require('uuid');
const routingRouter = require('../routing/router');
const router = express.Router();

const OSRM_URL = process.env.OSRM_BASE_URL || 'https://router.project-osrm.org';

function osrmRequest(path) {
    return new Promise((resolve, reject) => {
        const url = `${OSRM_URL}${path}`;
        const req = https.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try { resolve(JSON.parse(data)); }
                catch (e) { reject(new Error('Error parsing OSRM response')); }
            });
        });
        req.on('error', reject);
        req.setTimeout(8000, () => { req.destroy(); reject(new Error('OSRM timeout')); });
    });
}

router.post('/calcular', authMiddleware, async (req, res) => {
    const { origin_lat, origin_lng, dest_lat, dest_lng, avoid_coords, mode } = req.body;

    if (!origin_lat || !origin_lng || !dest_lat || !dest_lng) {
        return res.status(400).json({ error: 'Origen y destino requeridos' });
    }

    try {
        const allReports = req.db.prepare(
            "SELECT id, type, latitude, longitude, radius_meters, description FROM reports WHERE status IN ('active','confirmed')"
        ).all();

        const { haversine } = require('../utils/distancia');
        const LINE_TYPES = ['bloqueo', 'bloqueo_total', 'bloqueo_parcial', 'marcha', 'ruta_cerrada', 'cierre_calle', 'manifestacion'];

        function getAvoidRadius(report) {
            if (report.radius_meters > 0) return Math.min(report.radius_meters, 40);
            return LINE_TYPES.includes(report.type) ? 20 : 15;
        }

        function distToSegment(px, py, ax, ay, bx, by) {
            const dx = bx - ax, dy = by - ay;
            const len2 = dx * dx + dy * dy;
            if (len2 === 0) return Math.hypot(px - ax, py - ay);
            let t = ((px - ax) * dx + (py - ay) * dy) / len2;
            t = Math.max(0, Math.min(1, t));
            return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
        }

        function findBlockages(coordsArr) {
            const found = [];
            for (const b of allReports) {
                const radius = getAvoidRadius(b);
                for (let i = 0; i < coordsArr.length - 1; i++) {
                    if (distToSegment(b.latitude, b.longitude, coordsArr[i].latitude, coordsArr[i].longitude, coordsArr[i + 1].latitude, coordsArr[i + 1].longitude) < radius) {
                        found.push(b);
                        break;
                    }
                }
            }
            return found;
        }

        // Try local routing engine first
        routingRouter.resetBlockages();
        if (allReports.length > 0) {
            routingRouter.applyBlockages(allReports);
        }

        if (routingRouter.isReady()) {
            const result = routingRouter.calculateRoute(
                parseFloat(origin_lat), parseFloat(origin_lng),
                parseFloat(dest_lat), parseFloat(dest_lng)
            );

            if (!result.error) {
                console.log(`[RUTAS] Local OK: ${result.distance}m, ${result.duration}s, ${result.geometry.length} pts`);
                return res.json({
                    routes: [{
                        index: 0,
                        distance: result.distance,
                        duration: result.duration,
                        geometry: result.geometry,
                        blockages_on_route: result.blockages_on_route || [],
                        source: 'local',
                    }],
                    total: 1,
                });
            }
        }

        // Fallback to OSRM with blockage detection
        console.log(`[RUTAS] Fallback OSRM: ${origin_lat},${origin_lng} -> ${dest_lat},${dest_lng}`);
        const coords = `${origin_lng},${origin_lat};${dest_lng},${dest_lat}`;
        const profile = mode === 'walking' ? 'foot' : 'driving';
        const data = await osrmRequest(`/route/v1/${profile}/${coords}?overview=full&geometries=geojson&alternatives=true`);

        if (!data || data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
            return res.status(400).json({ error: 'No se pudo calcular la ruta' });
        }

        const bestRoute = data.routes[0];
        const baseCoords = bestRoute.geometry.coordinates.map(c => ({ latitude: c[1], longitude: c[0] }));
        let bestBlockages = findBlockages(baseCoords);
        let bestCoords = baseCoords;

        function getOffsetPoint(lat, lng, dirLat, dirLng, meters) {
            const deg = meters / 111320;
            return { latitude: lat + -dirLng * deg, longitude: lng + dirLat * deg };
        }

        function getDirAt(routePts, idx) {
            if (idx < routePts.length - 1) return { lat: routePts[idx + 1].latitude - routePts[idx].latitude, lng: routePts[idx + 1].longitude - routePts[idx].longitude };
            if (idx > 0) return { lat: routePts[idx].latitude - routePts[idx - 1].latitude, lng: routePts[idx].longitude - routePts[idx - 1].longitude };
            return { lat: 0, lng: 1 };
        }

        function normalize(d) {
            const len = Math.hypot(d.lat, d.lng);
            if (len > 0) return { lat: d.lat / len, lng: d.lng / len };
            return d;
        }

        function findClosestRouteIdx(blockage, routePts) {
            let idx = 0, minDist = Infinity;
            for (let i = 0; i < routePts.length; i++) {
                const d = haversine(routePts[i].latitude, routePts[i].longitude, blockage.latitude, blockage.longitude);
                if (d < minDist) { minDist = d; idx = i; }
            }
            return idx;
        }

        // Try progressive detours around blockages
        if (bestBlockages.length > 0 && avoid_coords && avoid_coords.length > 0) {
            for (const blockage of bestBlockages) {
                const idx = findClosestRouteIdx(blockage, baseCoords);
                const dir = normalize(getDirAt(baseCoords, idx));
                const offsets = [100, 200, 350, 500];
                for (const meters of offsets) {
                    for (const side of [1, -1]) {
                        const wp = getOffsetPoint(blockage.latitude, blockage.longitude, dir.lat * side, dir.lng * side, meters);
                        const detourUrl = `/route/v1/${profile}/${origin_lng},${origin_lat};${wp.longitude},${wp.latitude};${dest_lng},${dest_lat}?overview=full&geometries=geojson&continue_straight=false`;
                        try {
                            const detourData = await osrmRequest(detourUrl);
                            if (detourData && detourData.code === 'Ok' && detourData.routes.length > 0) {
                                const dc = detourData.routes[0].geometry.coordinates.map(c => ({ latitude: c[1], longitude: c[0] }));
                                const db = findBlockages(dc);
                                if (db.length < bestBlockages.length) {
                                    bestCoords = dc;
                                    bestBlockages = db;
                                    break;
                                }
                            }
                        } catch (e) {}
                    }
                    if (bestBlockages.length === 0) break;
                }
                if (bestBlockages.length === 0) break;
            }
        }

        res.json({
            routes: [{
                index: 0,
                distance: bestRoute.distance,
                duration: bestRoute.duration,
                geometry: bestCoords,
                blockages_on_route: bestBlockages,
                source: 'osrm',
            }],
            total: 1,
        });
    } catch (err) {
        console.error('Error calculando ruta:', err.message);
        res.status(500).json({ error: 'Error al calcular ruta' });
    }
});

router.post('/iniciar-viaje', authMiddleware, gpsValidation(), (req, res) => {
    const { dest_lat, dest_lng, route_geometry } = req.body;
    const tripId = uuidv4();
    const db = req.db;

    db.prepare(`
        INSERT INTO trips (id, user_id, origin_lat, origin_lng, dest_lat, dest_lng, route_geometry)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
        tripId, req.user.id,
        req.validatedCoords.latitude, req.validatedCoords.longitude,
        parseFloat(dest_lat), parseFloat(dest_lng),
        route_geometry || null
    );

    res.status(201).json({ trip: { id: tripId } });
});

router.post('/finalizar-viaje/:id', authMiddleware, (req, res) => {
    const db = req.db;
    const trip = db.prepare('SELECT * FROM trips WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!trip) return res.status(404).json({ error: 'Viaje no encontrado' });

    db.prepare("UPDATE trips SET status = 'completed', ended_at = datetime('now') WHERE id = ?").run(req.params.id);
    res.json({ message: 'Viaje finalizado' });
});

router.get('/historial', authMiddleware, (req, res) => {
    const db = req.db;
    const trips = db.prepare('SELECT * FROM trips WHERE user_id = ? ORDER BY started_at DESC LIMIT 50').all(req.user.id);
    res.json({ trips });
});

// GET /api/rutas/test - Quick routing comparison test (no auth required)
router.get('/test', (req, res) => {
    const { origin_lat, origin_lng, dest_lat, dest_lng, report_lat, report_lng, report_type } = req.query;
    if (!origin_lat || !origin_lng || !dest_lat || !dest_lng) {
        return res.status(400).json({ error: 'origin_lat, origin_lng, dest_lat, dest_lng required' });
    }

    const oLat = parseFloat(origin_lat), oLng = parseFloat(origin_lng);
    const dLat = parseFloat(dest_lat), dLng = parseFloat(dest_lng);

    // Test 1: without blockages
    routingRouter.resetBlockages();
    const r1 = routingRouter.calculateRoute(oLat, oLng, dLat, dLng);

    // Test 2: with blockages
    routingRouter.resetBlockages();
    let reportBlocked = 0;
    if (report_lat && report_lng) {
        const report = {
            id: 'test-report',
            type: report_type || 'bloqueo',
            latitude: parseFloat(report_lat),
            longitude: parseFloat(report_lng),
            radius_meters: 0
        };
        routingRouter.blockReport(report);
        reportBlocked = routingRouter.isReady() ? 1 : 0;
    }

    const r2 = routingRouter.calculateRoute(oLat, oLng, dLat, dLng);

    res.json({
        without_blockages: r1.error ? { error: r1.error } : {
            distance: r1.distance,
            duration: r1.duration,
            points: r1.geometry.length,
            geometry: r1.geometry
        },
        with_blockages: r2.error ? { error: r2.error } : {
            distance: r2.distance,
            duration: r2.duration,
            points: r2.geometry.length,
            geometry: r2.geometry
        },
        graph_ready: routingRouter.isReady(),
        reports_applied: reportBlocked,
        source: routingRouter.isReady() ? 'local' : 'osrm'
    });
});

module.exports = router;
