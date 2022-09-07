/**
 * This is the main Node.js server script for your project
 * Check out the two endpoints this back-end API provides in fastify.get and fastify.post below
 */

const path = require("path");

// Require the fastify framework and instantiate it
const fastify = require("fastify")({
  // Set this to true for detailed logging:
  logger: false,
});

const storage = require('node-persist');

// Setup our static files
fastify.register(require("@fastify/static"), {
  root: path.join(__dirname, "public"),
  prefix: "/", // optional: default '/'
});

// View is a templating manager for fastify
fastify.register(require("@fastify/view"), {
  engine: {
    handlebars: require("handlebars"),
  },
}); 

const backupLink = '';
const fallback = false;
let busIsRunning = false;

//eventually the cms or bus_info.json
let routes = {
  halsted: {
    runInfo: "Run #H-003 // Wednesday, September 7th, 2022. Meet at 7:30 am at Elevate Coffee. Roll out at 7:45 am.",
    headerImageSrc: "https://cdn.glitch.global/6ba8c1b0-9df4-482f-9009-77d10d780dbb/header-halsted.png?v=1662526286000",
    headerImageAlt: "The Halsted Bike Bus. Brought to you by CHICAGO, BIKE GRID NOW!",
    trackerTileSrcPattern: "https://cdn.glitch.global/6ba8c1b0-9df4-482f-9009-77d10d780dbb/bus.9.6.22.{z}.{x}.{y}.jpg?v=16617",
    trackerBounds: {
            bottomLeft: [41.874, -87.64377961], //bottom left
            topRight: [41.94002090, -87.64669311] //top right
    },
    mapWidth: "315px"
  },
  milwaukee: {
    runInfo: "Run #M-001 //  Wednesday, September 7th, 2022. Meet at 7:30 am at New Wave Coffee. Roll out at 7:45 am.",
    headerImageSrc: "https://cdn.glitch.global/6ba8c1b0-9df4-482f-9009-77d10d780dbb/header-mke.png?v=1662526324223",
    headerImageAlt: "The Milwaukee Bike Bus. Brought to you by CHICAGO, BIKE GRID NOW!",
    trackerTileSrcPattern: "https://cdn.glitch.global/6ba8c1b0-9df4-482f-9009-77d10d780dbb/mke.9.6.22.{z}.{x}.{y}.jpg?v=1662528192255",
    trackerBounds: {
            bottomLeft: [41.874, -87.6977961], //bottom left , -87.708574
            topRight: [41.91202090, -87.63069311] //top right
    },
    mapWidth: "650px"
  }
};


/**
 * Our home page route
 *
 * Returns src/pages/index.hbs with data built into it
 */

fastify.get("/:route", async function (request, reply) {
  busIsRunning = true;
  
  const { route } = request.params;
  
  if(!busIsRunning || route == "") {
    return reply.view("/src/pages/preview.hbs");
  }
  
  let bus;
  
  
  if(!routes.hasOwnProperty(route))
  {
    return reply
      .code(404)
      .type('text/plain')
      .send('Route not found.');
  }
  else
  {
    bus = routes[route];
  }
  
  
  
  if(fallback) {
    return reply.redirect(backupLink);
  }
  
  await storage.init();

  // params is an object we'll pass to our handlebars template
  let params = { 
    
    busRunInfo: bus.runInfo,
    busHeaderImageSrc: bus.headerImageSrc,
    busHeaderImageAlt: bus.headerImageAlt,
    busTrackerTileSrcPattern: bus.trackerTileSrcPattern,
    busTrackerBounds: bus.trackerBounds,
    mapWidth: bus.mapWidth,
    
    latitude: await storage.getItem('latitude'),
    longitude: await storage.getItem('longitude'),
  };

  // The Handlebars code will be able to access the parameter values and build them into the page
  return reply.view("/src/pages/index.hbs", params);
});

fastify.get("/beacon/"+process.env.beacon_hash, function (request, reply) {
  if(fallback) {
    return reply.redirect(backupLink);
  }
  const params = {
    beacon_hash: process.env.beacon_hash,
  };
  return reply.view("/src/pages/beacon.hbs", params);
});

fastify.post("/bus/location/"+process.env.beacon_hash, async function (request, reply) {
  
  await storage.init();
  await storage.setItem('latitude', request.body.latitude);
  await storage.setItem('longitude', request.body.longitude);
  
  return request.body;
});


fastify.get("/bus/location", async function (request, reply) {
  
  let latitude;
  let longitude;
  
  if(busIsRunning)
  {
     await storage.init();
     let coords = [41.889964, -87.659841];
     latitude = coords[0] //await storage.getItem('latitude');
     longitude = coords[1] //await storage.getItem('longitude');
  }
   
  let response = { 
    latitude: latitude || 0,
    longitude: longitude || 0
  };
  return response;
});

// Run the server and report out to the logs
fastify.listen(
  { port: process.env.PORT, host: "0.0.0.0" },
  function (err, address) {
    if (err) {
      fastify.log.error(err);
      process.exit(1);
    }
    console.log(`Your app is listening on ${address}`);
    fastify.log.info(`server listening on ${address}`);
  }
);

