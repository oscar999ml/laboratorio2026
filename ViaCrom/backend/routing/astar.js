const { haversine } = require('../utils/distancia')

// A* pathfinding on a RoutingGraph
function aStar(graph, startNodeId, endNodeId, options = {}) {
  const { maxNodes = 50000, heuristicWeight = 1.0 } = options

  if (!graph.nodes.has(startNodeId) || !graph.nodes.has(endNodeId)) {
    return null
  }

  const startCoord = graph.nodeCoords.get(startNodeId)
  const endCoord = graph.nodeCoords.get(endNodeId)

  if (!startCoord || !endCoord) return null

  // Priority queue using simple array + sort (fast enough for <50k nodes)
  const open = [{ node: startNodeId, g: 0, f: heuristic(startCoord, endCoord), parent: null, edgeIdx: -1 }]
  const gScore = new Map()
  const parent = new Map()
  const edgeUsed = new Map()

  gScore.set(startNodeId, 0)
  parent.set(startNodeId, null)
  edgeUsed.set(startNodeId, -1)

  let visitedCount = 0

  while (open.length > 0) {
    // Sort by f-score (ascending)
    open.sort((a, b) => a.f - b.f)
    const current = open.shift()

    if (current.node === endNodeId) {
      return reconstructPath(graph, parent, edgeUsed, endNodeId)
    }

    visitedCount++
    if (visitedCount > maxNodes) break

    const neighbors = graph.getNeighbors(current.node)
    for (const { node, edge } of neighbors) {
      if (edge.blocked) continue

      const tentativeG = current.g + edge.weight

      if (!gScore.has(node) || tentativeG < gScore.get(node)) {
        gScore.set(node, tentativeG)
        parent.set(node, current.node)
        edgeUsed.set(node, edge.idx)

        const h = heuristic(graph.nodeCoords.get(node), endCoord)
        open.push({ node, g: tentativeG, f: tentativeG + h * heuristicWeight })
      }
    }
  }

  return null // No path found
}

// Heuristic: haversine distance / max speed (converted to time)
function heuristic(from, to) {
  if (!from || !to) return 0
  const distKm = haversine(from.lat, from.lng, to.lat, to.lng) / 1000
  const maxSpeedKmh = 100 // optimistic max speed
  return (distKm / maxSpeedKmh) * 3600 // seconds
}

function reconstructPath(graph, parent, edgeUsed, endNodeId) {
  const path = []
  let current = endNodeId

  while (current !== null) {
    const coord = graph.nodeCoords.get(current)
    if (!coord) break
    path.unshift({ latitude: coord.lat, longitude: coord.lng, nodeId: current })
    current = parent.get(current)
  }

  // Calculate total distance and duration
  let totalDistance = 0
  let totalDuration = 0
  const edgesUsed = []

  for (let i = 0; i < path.length - 1; i++) {
    const edgeIdx = edgeUsed.get(path[i + 1]?.nodeId || endNodeId)
    if (edgeIdx >= 0) {
      const edge = graph.edges[edgeIdx]
      if (edge) {
        totalDistance += edge.distance
        totalDuration += edge.weight
        edgesUsed.push(edge)
      }
    }
  }

  return {
    geometry: path,
    distance: Math.round(totalDistance),
    duration: Math.round(totalDuration * 10) / 10,
    edges_used: edgesUsed,
  }
}

// Find path between two lat/lng coordinates
function findPath(graph, fromLat, fromLng, toLat, toLng, options = {}) {
  const fromNode = graph.findNearestNode(fromLat, fromLng)
  const toNode = graph.findNearestNode(toLat, toLng)

  if (!fromNode || !toNode) {
    return { error: 'No se encontraron nodos cercanos', from: fromNode, to: toNode }
  }

  // If origin and dest are very close, return direct line
  const directDist = haversine(fromLat, fromLng, toLat, toLng)
  if (directDist < 20) {
    return {
      geometry: [{ latitude: fromLat, longitude: fromLng }, { latitude: toLat, longitude: toLng }],
      distance: Math.round(directDist),
      duration: Math.round(directDist / 5),
    }
  }

  const result = aStar(graph, fromNode.id, toNode.id, options)

  if (!result) {
    return { error: 'No se encontró una ruta disponible' }
  }

  return result
}

module.exports = { aStar, findPath, heuristic }
