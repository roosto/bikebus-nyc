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

const fallbackAll = true;
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
    mapWidth: "315px",
    backupLink: "",
    fallback: false
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
    mapWidth: "650px",
    backupLink: "",
    fallback: false
  }
};


/**
 * Our home page route
 *
 * Returns src/pages/index.hbs with data built into it
 */

fastify.get("/:route", async function (request, reply) {  
  const { route } = request.params;
  
  if(route == "") {
    return reply.view("/src/pages/index.hbs");
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
  
  
  
  if(fallbackAll || bus.fallback) {
    return reply.redirect(bus.backupLink);
  }
  
  await storage.init();

  // params is an object we'll pass to our handlebars template
  let params = { 
    
    route: route,
    title: route.charAt(0).toUpperCase() + route.slice(1),
    busRunInfo: bus.runInfo,
    busHeaderImageSrc: bus.headerImageSrc,
    busHeaderImageAlt: bus.headerImageAlt,
    busTrackerTileSrcPattern: bus.trackerTileSrcPattern,
    busTrackerBounds: bus.trackerBounds,
    mapWidth: bus.mapWidth,
    headerWidth: bus.headerWidth,
    
    latitude: await storage.getItem('latitude'),
    longitude: await storage.getItem('longitude'),
  };

  // The Handlebars code will be able to access the parameter values and build them into the page
  return reply.view("/src/pages/tracker.hbs", params);
});

fastify.get("/beacon/:route/"+process.env.beacon_hash, function (request, reply) {
  
  const { route } = request.params;
  if(!routes.hasOwnProperty(route))
  {
    return reply
      .code(404)
      .type('text/plain')
      .send('Route not found.');
  }
  
  if(fallbackAll || routes[route]) {
    return reply.redirect(routes[route].backupLink);
  }
  const params = {
    beacon_hash: process.env.beacon_hash,
    route: route
  };
  return reply.view("/src/pages/beacon.hbs", params);
});

fastify.post("/bus/:route/location/"+process.env.beacon_hash, async function (request, reply) {
  
  const { route } = request.params;
  if(!routes.hasOwnProperty(route))
  {
    return reply
      .code(404)
      .type('text/plain')
      .send('Route not found.');
  }
  
  //41.883148, -87.647396 washington and halsted
  // request.body.latitude = 41.883148;
  // request.body.longitude = -87.647396;
  
  await storage.init();
  await storage.setItem(route+'.latitude', request.body.latitude);
  await storage.setItem(route+'.longitude', request.body.longitude);
  
  return request.body;
});


fastify.get("/bus/:route/location", async function (request, reply) {
  
  const { route } = request.params;
  if(!routes.hasOwnProperty(route))
  {
    return reply
      .code(404)
      .type('text/plain')
      .send('Route not found.');
  }
  
  let latitude;
  let longitude;
  
  if(busIsRunning)
  {
     await storage.init();
     //let coords = [41.889964, -87.659841];
     latitude = await storage.getItem(route+'.latitude');
     longitude = await storage.getItem(route+'.longitude');
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

