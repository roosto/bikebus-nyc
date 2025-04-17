#!/usr/bin/env node

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

function latlongs_to_arr(obj) {
  return [obj.longitude, obj.latitude]
}

function subDivide(start, end, maxDistance = 1500) {
  let distance = geolib.getDistance(start, end);
  // base case of being close enough
  if (distance <= maxDistance) {
    return [start,end]
  }

  let midpoint = geolib.getCenter(start,end)
  // 2nd base case of needing only one sub-division
  if (geolib.getDistance(start,midpoint) <= maxDistance) {
    return [start,midpoint,end]
  }

  // recurcsion case of needing more subdivisions
  left_midpoints = subDivide(start,midpoint).slice(1,-1)
  right_midpoints = subDivide(midpoint,endpoint).slice(1,-1)

  return [start].push(left_midpoints).push(right_midpoints).push(end)
}

async function chunkifyRoute(route, maxDistanceInMeters = 100) {
  var routeWithChunks = { 'stops': [] }
  input_js.stops.forEach((value, index) => {
    console.log("At index: %d", index)
    console.log("next index exists? %s", index + 2 > input_js.stops.length ? 'no' : 'yes' )
  });
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

const https = require('http'); // Use 'http' for non-secure connections
const doTheThing = async () => {
    for (const stop of input_js.stops) {
        await move_to_stop(stop)
        console.log("Moved to: " + stop.name)
        await sleep(15000)
    }

    console.log("Done");
};

doTheThing()
