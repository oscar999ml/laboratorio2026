const { loadGraph } = require('./parser')
const { findPath } = require('./astar')
const { haversine } = require('../utils/distancia')

let cityGraph = null
let graphLoaded = false
let graphLoading = false
let loadPromise = null
const reportBlockages = new Map()
const LINE_TYPES = ['bloqueo', 'bloqueo_total', 'bloqueo_parcial', 'marcha', 'ruta_cerrada', 'cierre_calle', 'manifestacion']

// Initialize the graph for a city (called once at startup)
async function initGraph(cityName, dataDir) {
  if (graphLoading) return loadPromise
  graphLoading = true

  loadPromise = (async () => {
    try {
      cityGraph = await loadGraph(cityName, dataDir)
      graphLoaded = true
      console.log(`Routing graph ready: ${cityGraph.nodeCount()} nodes, ${cityGraph.edgeCount()} edges`)
    } catch (err) {
      console.error('Failed to load graph:', err.message)
      graphLoaded = false
    }
    return graphLoaded
  })()

  return loadPromise
}

function isReady() {
  return graphLoaded && cityGraph !== null && cityGraph.nodeCount() > 0
}

function getBlockRadius(r) {
  const isLine = LINE_TYPES.includes(r.type)
  return r.radius_meters > 0 ? Math.min(r.radius_meters, isLine ? 40 : 30) : (isLine ? 20 : 15)
}

// Apply blockages from active reports (full rebuild)
function applyBlockages(reports) {
  if (!cityGraph) return { blocked: 0 }
  reportBlockages.clear()
  let count = 0
  for (const r of reports) {
    const radius = getBlockRadius(r)
    const affected = cityGraph.blockNearbyEdges(r.latitude, r.longitude, radius)
    if (affected.length > 0) {
      reportBlockages.set(r.id, new Set(affected))
    }
    count += affected.length
  }
  return { blocked: count }
}

// Apply a single report's blockage incrementally
function blockReport(report) {
  if (!cityGraph) return { blocked: 0 }
  const radius = getBlockRadius(report)
  const affected = cityGraph.blockNearbyEdges(report.latitude, report.longitude, radius)
  if (affected.length > 0) {
    reportBlockages.set(report.id, new Set(affected))
  }
  return { blocked: affected.length }
}

// Remove a single report's blockages
function unblockReport(reportId) {
  if (!cityGraph) return { unblocked: 0 }
  const edges = reportBlockages.get(reportId)
  if (!edges) return { unblocked: 0 }
  for (const edgeIdx of edges) {
    let stillNeeded = false
    for (const [otherId, otherEdges] of reportBlockages) {
      if (otherId !== reportId && otherEdges.has(edgeIdx)) {
        stillNeeded = true
        break
      }
    }
    if (!stillNeeded) {
      cityGraph.unblockEdge(edgeIdx)
    }
  }
  reportBlockages.delete(reportId)
  return { unblocked: edges.size }
}

// Calculate route using our graph
function calculateRoute(fromLat, fromLng, toLat, toLng, options = {}) {
  if (!cityGraph) return { error: 'Grafo no cargado' }

  const maxNodes = options.maxNodes || 50000

  // Find nearest nodes to origin and destination
  const fromNode = cityGraph.findNearestNode(fromLat, fromLng)
  const toNode = cityGraph.findNearestNode(toLat, toLng)

  if (!fromNode || !toNode) {
    return { error: 'No se encontraron nodos cercanos en el grafo' }
  }

  const distFrom = haversine(fromLat, fromLng, fromNode.latitude, fromNode.longitude)
  const distTo = haversine(toLat, toLng, toNode.latitude, toNode.longitude)

  if (distFrom > 5000 || distTo > 5000) {
    return { error: 'Origen o destino muy lejos del área cargada' }
  }

  const result = findPath(cityGraph, fromLat, fromLng, toLat, toLng, { maxNodes })

  if (result && result.error) {
    return { error: result.error }
  }

  if (!result || !result.geometry || result.geometry.length < 2) {
    return { error: 'No se encontró ruta' }
  }

  // Check blockages on route
  const blockagesOnRoute = []
  for (const edge of (result.edges_used || [])) {
    if (edge.blocked) {
      blockagesOnRoute.push(edge)
    }
  }

  let geometry = result.geometry.map(p => ({ latitude: p.latitude, longitude: p.longitude }))

  // Ensure route reaches exact destination point
  const lastPt = geometry[geometry.length - 1]
  const distToDest = haversine(lastPt.latitude, lastPt.longitude, toLat, toLng)
  if (distToDest > 5) {
    geometry.push({ latitude: toLat, longitude: toLng })
  }

  return {
    geometry,
    distance: result.distance + Math.round(distToDest),
    duration: result.duration + Math.round(distToDest / 5),
    blockages_on_route: blockagesOnRoute,
    from_node_distance: Math.round(distFrom),
    to_node_distance: Math.round(distTo),
  }
}

// Reset graph (clear blockages)
function resetBlockages() {
  if (!cityGraph) return
  for (const edge of cityGraph.edges) {
    edge.blocked = false
  }
  cityGraph.blockedEdges.clear()
  reportBlockages.clear()
}

module.exports = { initGraph, isReady, applyBlockages, calculateRoute, resetBlockages, blockReport, unblockReport }
