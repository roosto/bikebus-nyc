#!/usr/bin/env node

const https = require('http') // Use 'http' for non-secure connections
const geolib = require('geolib')

const input_js = {
    "stops": [
        {
            "name": "Mt Morris Park W @ 120th St",
            "time": "7:45",
            "coordinates": [40.803902, -73.946153]
        },
        {
            "waypointOnly": true,
            "name": "Right turn onto 5th Ave",
            "coordinates": [40.803243, -73.944614]
        },
        {
            "waypointOnly": true,
            "name": "5th Ave @ Duke Ellington Cir",
            "coordinates": [40.797113, -73.949096]
        },
        {
            "waypointOnly": true,
            "name": "Right turn onto Duke Ellington Cir",
            "coordinates": [40.797135, -73.949202]
        },
        {
            "waypointOnly": false,
            "name": "End at Grand Army Plaza",
            "coordinates": [40.764295, -73.973032]
        }
     ]
}

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
        path: '/route/' + 'manhattan-country-school-too' + '/location/' + 'D3ADB33F',
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
    let stopsWithInfilledWaypoints = [input_js.stops[0]]
    for (let i = 1; i < input_js.stops.length; i++) {
        let infilledWaypoints = calculateWaypoints(input_js.stops[i - 1].coordinates, input_js.stops[i].coordinates).map((val) => ({ name: 'calculated Waypoint', coordinates: val }) )
        console.log("adding these waypoints: " + infilledWaypoints)
        infilledWaypoints.push(input_js.stops[i])
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
