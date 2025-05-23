#!/usr/bin/env node

const axios = require('axios') // Use 'http' for non-secure connections
const geolib = require('geolib')
const fs = require('node:fs');
const { parseArgs } = require('node:util');

const remoteHostDefault = 'localhost'
const remotePortDefault = 80
const tickIntervalMilisecondsDefault = 15000
function getUsageText() {
  return "Usage: ride-faker.js [--help] --beacon-hash beacon_hash --routekey routeKeyStr [--tick-interval miliseconds] routeFile"
}

function getHelpText() {
  return getUsageText() + `

A development utility to post coordinates to a route's beacon page, which
will simulate a bike bus moving along the route.

 Options:
    --beacon-hash|-b    Required. The \`beacon_hash\` value to use when
                        POSTing. If not supplied, will use the Environment
                        variable \`beacon_hash\`, if it exists and is set
    --help|-h           show this text and exit
    --routekey|-k       Required. The routeKey to be used when POSTing
                        locations to the API
    --tick-interval|-t  Time, in miliseconds, to wait between POSTing the
                        next coordinates along the route. Default: ${tickIntervalMilisecondsDefault}
    --remote-host|-s    Address of the web server where we will POST to.
                        Default: ${remoteHostDefault}
    --remote-port|-p    TCP port on the remote host. Default: ${remotePortDefault}
                        If the ENV var 'PORT' is set, and '--remote-port'
                        is not specified as part of the cli invocation, the
                        value from the ENV var will be used instead of ${remotePortDefault}

 routeFile:
    path to a route file, though the file need not neccessarily be a route
    route file. The only thing that the JSON file needs to have is an array
    with a key named \`stop\` underneath a key that matches the values supplied
    to --routekey
`
}

function exitWithUsage(errorString) {
  console.error(`Error: ${errorString}`)
  console.error(getUsageText())
  process.exit(1)
}

const allowPositionals = true
const options = {
    routekey: {
      type: 'string',
      short: 'k',
    },
    'beacon-hash': {
      type: 'string',
      short: 'b',
      default: process.env['beacon_hash']
    },
    'tick-interval': {
      type: 'string',
      short: 't',
      default: `${tickIntervalMilisecondsDefault}`
    },
    'remote-host': {
      type: 'string',
      short: 's',
      default: remoteHostDefault
    },
    'remote-port': {
      type: 'string',
      short: 'p',
      default: ''
    },
    help: {
      type: 'boolean',
      short: 'h',
    },
}

const {values, positionals} = parseArgs({allowPositionals: true, options: options});

if (values.help) {
  console.log(getHelpText())
  process.exit(0)
}

if (!values.routekey) {
  exitWithUsage('routeKey is required')
}

if (!values['beacon-hash']) {
  exitWithUsage('`--beacon-hash` not supplied or found in the Environment as `beacon_hash`')
}

if (positionals.length != 1) {
  exitWithUsage('you must supply exactly 1 JSON file')
}

let tickIntervalAsInt = parseInt(values['tick-interval'])
if (tickIntervalAsInt === NaN || tickIntervalAsInt < 1) {
  exitWithUsage(`--tick-interval must be a non-zero positive integer; got: '${values['tick-interval']}'`)
}

const remoteHost = values['remote-host']
const remotePort = values['remote-port'] || process.env.PORT || remotePortDefault

const tickIntervalMiliseconds = tickIntervalAsInt
const jsonFilePath = positionals[0]
const jsonFromFile = fs.readFileSync(jsonFilePath, 'utf8')
const parsedJSON = JSON.parse(jsonFromFile)
const routeKey = Object.keys(parsedJSON).find((key) => key == values.routekey)
if (!routeKey) {
  exitWithUsage(`the specified routeKey, '${values.routekey}', was not found in the supplied JSON, '${jsonFilePath}'`)
}
const beaconHash = values['beacon-hash']
const stopsArray = parsedJSON[routeKey].stops

function geolibCoordsToGeojson(coord) {
  return [coord.latitude, coord.longitude]
}

function geojsonToGeolibCoords(coord) {
  return { latitude: coord[0], longitude: coord[1] }
}

function calculateWaypoints(start, end, segmentLength = 150) {
  let distance = geolib.getDistance(start, end);
  // easy case of being close enough
  if (distance < segmentLength * 1.5) {
    return []
  }
  
  // convert to "native" GeoLibCoordinates objects
  // The [documentation for computeDestinationPoint](https://github.com/manuelbieh/geolib?tab=readme-ov-file#computedestinationpointpoint-distance-bearing-radius--earthradius)
  // says that it will return the same input it is given, but in my
  // experience it does not return GeoJSON, if given GeoJSON. So I've added the conversion steps
  // to be on the safe side
  const start_converted = geojsonToGeolibCoords(start)
  const end_converted = geojsonToGeolibCoords(end)

  const bearing = geolib.getRhumbLineBearing(start_converted, end_converted)
  const waypointCount = Math.floor(distance / segmentLength)
  let midpoints = [geolib.computeDestinationPoint(start_converted, segmentLength, bearing)]
  for(let i = 1; i < waypointCount; i++) {
    midpoints[i] = geolib.computeDestinationPoint(midpoints[i-1], segmentLength, bearing)
  }

  return midpoints.map((coord) => geolibCoordsToGeojson(coord))
}

async function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function move_to_stop(stop) {
  const data = JSON.stringify(geojsonToGeolibCoords(stop.coordinates));
  try {
    const response = await axios.post(`http://${remoteHost}:${remotePort}/route/${routeKey}/location/${beaconHash}`, data, {
      headers: {
        'Content-Type': 'application/json', // Set appropriate content type
      },
    })
    console.log(`statusCode: ${response.status}`)
  } catch (error) {
    console.error(error);
    throw error;
  }
}

const doTheThing = async () => {
  let stopsWithInfilledWaypoints = [stopsArray[0]]
  for (let i = 1; i < stopsArray.length; i++) {
    let infilledWaypoints = calculateWaypoints(stopsArray[i - 1].coordinates, stopsArray[i].coordinates).map((val) => ({ name: 'calculated Waypoint', coordinates: val }) )
    console.log("adding these waypoints: " + infilledWaypoints)
    infilledWaypoints.push(stopsArray[i])
    stopsWithInfilledWaypoints = stopsWithInfilledWaypoints.concat(infilledWaypoints)
  }

  for (const stop of stopsWithInfilledWaypoints) {
    await move_to_stop(stop)
    console.log("Moved to: " + stop.name)
    await sleep(tickIntervalMiliseconds)
  }

  console.log("Done");
};

console.log('about to do the thing')
doTheThing()
