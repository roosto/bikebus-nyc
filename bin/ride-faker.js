#!/usr/bin/env node

import { request } from 'http'; // Use 'http' for non-secure connections
import { getDistance, getRhumbLineBearing, computeDestinationPoint } from 'geolib';

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

function geojsonToGeolibCoordsTo(coord) {
  return { latitude: coord[0], longitude: coord[1] }
}

function calculateWaypoints(start, end, segmentLengths = 150) {
  let distance = getDistance(start, end);
  // easy case of being close enough
  if (distance < segmentLengths * 1.5) {
    return []
  }
  
  // convert to "native" GeoLibCoordinates objects
  // The [documentation for computeDestinationPoint](https://github.com/manuelbieh/geolib?tab=readme-ov-file#computedestinationpointpoint-distance-bearing-radius--earthradius)
  // says that it will return the same input it is given, but in my
  // experience it does not return GeoJSON, if given GeoJSON. So I've added the conversion steps
  // to be on the safe side
  const start_converted = geojsonToGeolibCoordsTo(start)
  const end_converted = geojsonToGeolibCoordsTo(end)

  const bearing = getRhumbLineBearing(start_converted, end_converted)
  const waypointCount = Math.floor(distance / segmentLengths)
  let midpoints = [computeDestinationPoint(start_converted, segmentLengths, bearing)]
  for(let i = 1; i < waypointCount; i++) {
    midpoints[i] = computeDestinationPoint(midpoints[i-1], segmentLengths, bearing)
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
      
      const data = JSON.stringify({
        latitude: stop.coordinates[0],
        longitude: stop.coordinates[1],
      });
      
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
    let stopsWithWaypoints = [input_js.stops[0]]
    for (let i = 1; i++; i < input_js.stops.length) {
        console.log("adding these waypoints: " + calculateWaypoints(input_js.stops[i], input_js.stops[i - 1]))
        stopsWithWaypoints.push(calculateWaypoints(input_js.stops[i], input_js.stops[i - 1]))
        stopsWithWaypoints.push(input_js.stops[i])
    }

    for (const stop of input_js.stops) {
        await move_to_stop(stop)
        console.log("Moved to: " + stop['name'] ? stop.name : '<waypoint>')
        await sleep(15000)
    }

      console.log("Done");
};

doTheThing()
