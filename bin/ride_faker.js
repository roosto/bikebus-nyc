#!/usr/bin/env node

const https = require('http') // Use 'http' for non-secure connections
const geolib = require('geolib')

const input_js = {
  "stops" : [
         {
            "coordinates" : [
               40.660497,
               -73.962954
            ],
            "markerClass" : "label-left rotate-65",
            "name" : "Ocean Ave @ Lincoln Rd",
            "subtitle" : "",
            "time" : "7:45"
         },
         {
            "coordinates" : [
               40.660914,
               -73.960908
            ],
            "name" : "Lincoln Rd @ Flatbush Ave",
            "waypointOnly" : true
         },
         {
            "coordinates" : [
               40.660541,
               -73.960659
            ],
            "name" : "Flatbush, btwn Lincoln & Maple",
            "waypointOnly" : true
         },
         {
            "coordinates" : [
               40.660216,
               -73.960623
            ],
            "name" : "Flatbush @ Maple",
            "waypointOnly" : true
         },
         {
            "coordinates" : [
               40.660454,
               -73.956873
            ],
            "markerClass" : "label-left rotate-65",
            "name" : "Bedford Ave",
            "time" : "7:55"
         },
         {
            "coordinates" : [
               40.661155,
               -73.945501
            ],
            "markerClass" : "label-left rotate-65",
            "name" : "Brooklyn Ave",
            "time" : "8:00"
         },
         {
            "coordinates" : [
               40.661503,
               -73.939888
            ],
            "markerClass" : "label-left rotate-65",
            "name" : "Albany Ave",
            "time" : "8:05"
         },
         {
            "coordinates" : [
               40.661668,
               -73.93741
            ],
            "name" : "Maple @ Troy West side",
            "waypointOnly" : true
         },
         {
            "coordinates" : [
               40.661706,
               -73.937124
            ],
            "name" : "Maple @ Troy East side",
            "waypointOnly" : true
         },
         {
            "coordinates" : [
               40.662051,
               -73.931497
            ],
            "markerClass" : "label-left rotate-65",
            "name" : "Utica Ave",
            "time" : "8:10"
         },
         {
            "coordinates" : [
               40.662658,
               -73.931557
            ],
            "name" : "Utica @ Remsen",
            "waypointOnly" : true
         },
         {
            "coordinates" : [
               40.663243,
               -73.931608
            ],
            "name" : "Utica @ E New York Ave",
            "time" : "7:55",
            "waypointOnly" : true
         },
         {
            "coordinates" : [
               40.663617,
               -73.930698
            ],
            "name" : "E New York Ave @ E 91st",
            "waypointOnly" : true
         },
         {
            "coordinates" : [
               40.664323,
               -73.929024
            ],
            "name" : "E New York Ave @ 93rd",
            "waypointOnly" : true
         },
         {
            "coordinates" : [
               40.663997,
               -73.928726
            ],
            "markerClass" : "label-left rotate-65",
            "name" : "PS 770",
            "time" : "8:15"
         }
      ],
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
        path: '/route/' + 'ps770' + '/location/' + 'D3ADB33F',
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
        await sleep(500)
    }

      console.log("Done");
};

console.log('about to do the thing')
doTheThing()