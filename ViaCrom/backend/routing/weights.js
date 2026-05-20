// Speed in km/h per OSM highway tag
const HIGHWAY_SPEEDS = {
  motorway: 100,
  motorway_link: 60,
  trunk: 80,
  trunk_link: 50,
  primary: 60,
  primary_link: 40,
  secondary: 50,
  secondary_link: 35,
  tertiary: 40,
  tertiary_link: 30,
  residential: 25,
  living_street: 15,
  service: 15,
  track: 10,
  path: 5,
  footway: 5,
  pedestrian: 5,
  cycleway: 10,
  road: 20,
  unclassified: 30,
}

const DEFAULT_SPEED = 30

// Priority cost multiplier (lower = more preferred)
const HIGHWAY_PRIORITY = {
  motorway: 0.7,
  motorway_link: 0.8,
  trunk: 0.75,
  trunk_link: 0.85,
  primary: 0.85,
  primary_link: 0.9,
  secondary: 0.9,
  secondary_link: 0.95,
  tertiary: 1.0,
  tertiary_link: 1.05,
  residential: 1.2,
  living_street: 1.5,
  service: 1.5,
  track: 3.0,
  path: 5.0,
  footway: 5.0,
  pedestrian: 5.0,
  cycleway: 4.0,
  road: 1.3,
  unclassified: 1.1,
}

function getSpeed(highway) {
  const type = (highway || 'road').split(';')[0].split('|')[0].trim()
  return HIGHWAY_SPEEDS[type] || DEFAULT_SPEED
}

function getPriority(highway) {
  const type = (highway || 'road').split(';')[0].split('|')[0].trim()
  return HIGHWAY_PRIORITY[type] || 1.3
}

function getEdgeWeight(distanceMeters, highway) {
  const speedKmh = getSpeed(highway)
  const priority = getPriority(highway)
  const speedMps = speedKmh / 3.6
  const timeSeconds = distanceMeters / speedMps
  return timeSeconds * priority
}

module.exports = { getSpeed, getPriority, getEdgeWeight, HIGHWAY_SPEEDS }
