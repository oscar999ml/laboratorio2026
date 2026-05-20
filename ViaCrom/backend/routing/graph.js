const { getEdgeWeight } = require('./weights')
const { haversine } = require('../utils/distancia')

class RoutingGraph {
  constructor() {
    this.nodes = new Map()
    this.edges = []
    this.adj = new Map()
    this.blockedEdges = new Set()
    this.nodeCoords = new Map()
  }

  addNode(id, lat, lng) {
    if (!this.nodes.has(id)) {
      this.nodes.set(id, { id, lat, lng })
      this.adj.set(id, [])
      this.nodeCoords.set(id, { lat, lng })
    }
  }

  addEdge(fromId, toId, highway, name, oneway, maxspeed) {
    const from = this.nodeCoords.get(fromId)
    const to = this.nodeCoords.get(toId)
    if (!from || !to) return null

    const distance = haversine(from.lat, from.lng, to.lat, to.lng)
    const weight = getEdgeWeight(distance, maxspeed || highway)

    const edgeIdx = this.edges.length
    const edge = {
      idx: edgeIdx,
      from: fromId,
      to: toId,
      highway: highway || 'road',
      name: name || '',
      distance,
      weight,
      oneway: oneway === 'yes' || oneway === 'true' || oneway === '1',
      maxspeed: maxspeed || null,
      blocked: false,
    }

    this.edges.push(edge)
    this.adj.get(fromId).push({ node: toId, edge: edgeIdx })

    if (!edge.oneway) {
      this.adj.get(toId).push({ node: fromId, edge: edgeIdx })
    }

    return edge
  }

  blockEdge(edgeIdx) {
    if (edgeIdx >= 0 && edgeIdx < this.edges.length) {
      this.edges[edgeIdx].blocked = true
      this.blockedEdges.add(edgeIdx)
    }
  }

  unblockEdge(edgeIdx) {
    if (edgeIdx >= 0 && edgeIdx < this.edges.length) {
      this.edges[edgeIdx].blocked = false
      this.blockedEdges.delete(edgeIdx)
    }
  }

  distToSegment(px, py, ax, ay, bx, by) {
    const dx = bx - ax, dy = by - ay
    const len2 = dx * dx + dy * dy
    if (len2 === 0) return haversine(px, py, ax, ay)
    let t = ((px - ax) * dx + (py - ay) * dy) / len2
    t = Math.max(0, Math.min(1, t))
    const ix = ax + t * dx, iy = ay + t * dy
    return haversine(px, py, ix, iy)
  }

  blockNearbyEdges(lat, lng, radiusMeters) {
    const affected = []
    const r = radiusMeters / 111320
    for (const edge of this.edges) {
      const from = this.nodeCoords.get(edge.from)
      const to = this.nodeCoords.get(edge.to)
      if (!from || !to) continue
      const minLat = Math.min(from.lat, to.lat) - r
      const maxLat = Math.max(from.lat, to.lat) + r
      const minLng = Math.min(from.lng, to.lng) - r
      const maxLng = Math.max(from.lng, to.lng) + r
      if (lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng) {
        const d = this.distToSegment(lat, lng, from.lat, from.lng, to.lat, to.lng)
        if (d <= radiusMeters) {
          this.blockEdge(edge.idx)
          affected.push(edge.idx)
        }
      }
    }
    return affected
  }

  getNeighbors(nodeId) {
    const result = []
    const neighbors = this.adj.get(nodeId)
    if (!neighbors) return result
    for (const { node, edge: edgeIdx } of neighbors) {
      if (this.edges[edgeIdx]?.blocked) continue
      result.push({ node, edge: this.edges[edgeIdx] })
    }
    return result
  }

  findNearestNode(lat, lng) {
    let bestId = null, bestDist = Infinity
    for (const [id, coord] of this.nodeCoords) {
      const d = haversine(coord.lat, coord.lng, lat, lng)
      if (d < bestDist) { bestDist = d; bestId = id }
    }
    return bestId ? { id: bestId, ...this.nodeCoords.get(bestId), distance: bestDist } : null
  }

  nodeCount() { return this.nodes.size }
  edgeCount() { return this.edges.length }
}

module.exports = RoutingGraph
