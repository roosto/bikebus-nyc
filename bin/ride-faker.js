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
