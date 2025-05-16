#!/usr/bin/env node

const https = require('http') // Use 'http' for non-secure connections
const geolib = require('geolib')
const fs = require('node:fs');
const { parseArgs } = require('node:util');

function getUsageText() {
  return "Usage: ride-faker.js [--help] --beacon-hash beacon_hash --routekey routeKeyStr routeFile"
}

function getHelpText() {
  let helpText = ''
  helpText += getUsageText() + "\n"
  helpText += "\n"
  helpText += "A development utility to post coordinates to a route's beacon page, which\n"
  helpText += "will simulate a bike bus moving along the route.\n"
  helpText += "\n" 
  helpText += " Options:\n"
  helpText += "    --beacon-hash|-b  Required. The `beacon_hash` value to use when POSTing,\n"
  helpText += "                      if not supplied, will use the Envoronment variable\n"
  helpText += "                      named `beacon_hash`, if it exists and is set\n"
  helpText += "    --help|-h         show this text and exit\n"
  helpText += "    --routekey|-k     Required. The routeKey to be used when POSTing\n"
  helpText += "                      locations to the API\n"
  helpText += "\n"
  helpText += " routeFile:\n"
  helpText += "    path to a route file, though the file need not neccessarily be a route\n"
  helpText += "    route file. The only thing that the JSON file needs to have is an array\n"
  helpText += "    with a key named `stop` underneath a key that matches the values supplied\n"
  helpText += "    to --routekey\n"

  return helpText
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
  const options = {
    hostname: 'localhost',
    port: 61015,
    path: `/route/${routeKey}/location/${beaconHash}`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json', // Set appropriate content type
    },
  };
    
  const data = JSON.stringify(geojsonToGeolibCoords(stop.coordinates));
  const req = https.request(options, (res) => {
    console.log(`statusCode: ${res.statusCode}`);
  
    res.on('data', (d) => {
      process.stdout.write(d);
    });
  });
  
  req.on('error', (error) => {
    console.error(error);
  });
  
  req.write(data);
  req.end();
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
    await sleep(15000)
  }

  console.log("Done");
};

console.log('about to do the thing')
doTheThing()
