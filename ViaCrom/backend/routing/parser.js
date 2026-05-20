const { EventEmitter } = require('events')
const https = require('https')
const http = require('http')
const fs = require('fs')
const path = require('path')
const RoutingGraph = require('./graph')

// Parse OSM XML string into a RoutingGraph
function parseOSM(xmlString) {
  const graph = new RoutingGraph()

  // Extract nodes <node id="..." lat="..." lon="..." />
  const nodeRegex = /<node\s+id="(\d+)"\s+lat="([-\d.]+)"\s+lon="([-\d.]+)"/g
  let match
  while ((match = nodeRegex.exec(xmlString)) !== null) {
    graph.addNode(match[1], parseFloat(match[2]), parseFloat(match[3]))
  }

  // Extract ways — collect all <way> blocks
  const wayRegex = /<way\s+id="(\d+)"[^>]*>([\s\S]*?)<\/way>/g
  while ((match = wayRegex.exec(xmlString)) !== null) {
    const wayId = match[1]
    const wayContent = match[2]

    // Get tags
    const tags = {}
    const tagRegex = /<tag\s+k="([^"]*)"\s+v="([^"]*)"/g
    let tagMatch
    while ((tagMatch = tagRegex.exec(wayContent)) !== null) {
      tags[tagMatch[1]] = tagMatch[2]
    }

    // Only process highway ways
    if (!tags.highway) continue
    if (tags.highway === 'proposed' || tags.highway === 'construction' || tags.highway === 'abandoned') continue

    // Get node references
    const nds = []
    const ndRegex = /<nd\s+ref="(\d+)"/g
    let ndMatch
    while ((ndMatch = ndRegex.exec(wayContent)) !== null) {
      nds.push(ndMatch[1])
    }

    if (nds.length < 2) continue

    const oneway = tags.oneway || (tags.highway === 'motorway' ? 'yes' : 'no')
    const name = tags.name || ''
    const maxspeed = tags.maxspeed || ''

    for (let i = 0; i < nds.length - 1; i++) {
      graph.addEdge(nds[i], nds[i + 1], tags.highway, name, oneway, maxspeed)
    }
  }

  return graph
}

// Download OSM data from Overpass API for a bounding box
function downloadOSM(minLat, minLng, maxLat, maxLng, timeout = 15000) {
  return new Promise((resolve, reject) => {
    const query = `[out:xml][timeout:15];(way[highway](${minLat},${minLng},${maxLat},${maxLng});>;);out;`
    const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`

    const req = https.get(url, { timeout, headers: { 'User-Agent': 'ViaCrom/1.0', 'Accept': 'application/xml' } }, (res) => {
      let data = ''
      res.on('data', (chunk) => data += chunk)
      res.on('end', () => resolve(data))
    })
    req.on('error', reject)
    req.on('timeout', () => { req.destroy(); reject(new Error('Overpass timeout')) })
  })
}

// Download OSM for a city by name (uses nominatim to get bbox)
async function downloadCity(cityName, dataDir) {
  const geoRes = await new Promise((resolve, reject) => {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cityName)}&limit=1`
    https.get(url, { headers: { 'User-Agent': 'ViaCrom/1.0' } }, (res) => {
      let d = ''
      res.on('data', c => d += c)
      res.on('end', () => resolve(JSON.parse(d)))
    }).on('error', reject)
  })

  if (!geoRes || geoRes.length === 0) throw new Error(`City ${cityName} not found`)

  const { boundingbox } = geoRes[0]
  const [minLat, maxLat, minLng, maxLng] = boundingbox.map(parseFloat)

  console.log(`Downloading OSM for ${cityName}: ${minLat},${minLng} → ${maxLat},${maxLng}`)
  const xml = await downloadOSM(minLat, minLng, maxLat, maxLng)

  const filePath = path.join(dataDir, `${cityName.toLowerCase().replace(/\s+/g, '_')}.osm`)
  fs.writeFileSync(filePath, xml, 'utf-8')
  console.log(`Saved to ${filePath} (${(xml.length / 1024 / 1024).toFixed(1)}MB)`)

  return xml
}

// Load graph from OSM file (download if not exists)
async function loadGraph(cityName, dataDir) {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true })

  const filePath = path.join(dataDir, `${cityName.toLowerCase().replace(/\s+/g, '_')}.osm`)
  let xml

  if (fs.existsSync(filePath)) {
    xml = fs.readFileSync(filePath, 'utf-8')
    console.log(`Loaded ${filePath} from cache (${(xml.length / 1024 / 1024).toFixed(1)}MB)`)
  } else {
    xml = await downloadCity(cityName, dataDir)
  }

  const graph = parseOSM(xml)
  console.log(`Graph: ${graph.nodeCount()} nodes, ${graph.edgeCount()} edges`)
  return graph
}

module.exports = { parseOSM, downloadOSM, downloadCity, loadGraph }
