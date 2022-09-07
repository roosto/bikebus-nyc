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
let routes = {};
routes.halsted.runInfo = "Run #H-003 Wednesday, September 7th, 2022. Meet at 7:30 am at Elevate Coffee. Roll out at 7:45 am."
routes.halsted.headerImageSrc = "https://cdn.glitch.global/6ba8c1b0-9df4-482f-9009-77d10d780dbb/header.png?v=1661792004199"
routes.halsted.headerImageAlt = "The Halsted Bike Bus. Brought to you by CHICAGO, BIKE GRID NOW!"
routes.halsted.trackerTileSrcPattern = "https://cdn.glitch.global/6ba8c1b0-9df4-482f-9009-77d10d780dbb/bus.9.6.22.{z}.{x}.{y}.jpg?v=16617"

let milwaukeeBus = {};
routes.milwaukee.runInfo = "Run #M-003 Wednesday, September 7th, 2022. Meet at 7:30 am at Elevate Coffee. Roll out at 7:45 am."
routes.milwaukee.headerImageSrc = "https://cdn.glitch.global/6ba8c1b0-9df4-482f-9009-77d10d780dbb/header.png?v=1661792004199"
routes.milwaukee.headerImageAlt = "The Halsted Bike Bus. Brought to you by CHICAGO, BIKE GRID NOW!"
milwaukeeBus.trackerTileSrcPattern = "https://cdn.glitch.global/6ba8c1b0-9df4-482f-9009-77d10d780dbb/bus.9.6.22.{z}.{x}.{y}.jpg?v=16617"

/**
 * Our home page route
 *
 * Returns src/pages/index.hbs with data built into it
 */
fastify.get("/", async function (request, reply) {
  if(fallback) {
    return reply.redirect(backupLink);
  }
  
  if(!busIsRunning) {
    return reply.view("/src/pages/preview.hbs");
  }
  
  await storage.init();

  // params is an object we'll pass to our handlebars template
  let params = { 
    latitude: await storage.getItem('latitude'),
    longitude: await storage.getItem('longitude'),
  };

  // The Handlebars code will be able to access the parameter values and build them into the page
  return reply.view("/src/pages/index.hbs", params);
});

fastify.get("/:route", async function (request, reply) {
  busIsRunning = true;
  
  const { route } = request.params;
  let bus;
  if(route == "mke")
  {
     bus = milwaukeeBus;
  }
  else
  {
    bus = halstedBus;
  }
  
  if(fallback) {
    return reply.redirect(backupLink);
  }
  
  if(!busIsRunning) {
    return reply.view("/src/pages/preview.hbs");
  }
  
  await storage.init();

  // params is an object we'll pass to our handlebars template
  let params = { 
    
    busRunInfo: bus.runInfo,
    busHeaderImageSrc: bus.headerImageSrc,
    busHeaderImageAlt: bus.headerImageAlt,
    busTrackerTileSrcPattern: bus.trackerTileSrcPattern,
    
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

