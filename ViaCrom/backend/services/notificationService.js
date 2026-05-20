function sendProximityWarning(io, userId, warnings) {
    io.emit(`notification:${userId}`, {
        type: 'proximity_warning',
        title: 'Bloqueo cercano',
        body: `Hay ${warnings.length} evento(s) a menos de 500m`,
        data: warnings
    });
}

function sendRouteUpdate(io, tripId, newRoute) {
    io.to(`trip:${tripId}`).emit('route-recalculated', {
        type: 'route_update',
        title: 'Ruta recalculada',
        body: 'Se ha encontrado una ruta alternativa evitando bloqueos',
        route: newRoute
    });
}

function sendReportBroadcast(io, report) {
    io.emit('new-report', {
        type: 'new_report',
        title: 'Nuevo reporte',
        body: `Se reportó un ${report.type} en la zona`,
        data: report
    });
}

module.exports = { sendProximityWarning, sendRouteUpdate, sendReportBroadcast };
