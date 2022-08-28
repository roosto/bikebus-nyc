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

// ADD FAVORITES ARRAY VARIABLE FROM TODO HERE

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

/**
 * Our home page route
 *
 * Returns src/pages/index.hbs with data built into it
 */
fastify.get("/", async function (request, reply) {
  await storage.init();

  // params is an object we'll pass to our handlebars template
  let params = { 
    latitude: await storage.getItem('latitude'),
    longitude: await storage.getItem('longitude')
  };

  // The Handlebars code will be able to access the parameter values and build them into the page
  return reply.view("/src/pages/index.hbs", params);
});

fastify.get("/beacon/"+process.env.beacon_hash, function (request, reply) {
  return reply.view("/src/pages/beacon.hbs");
});

fastify.post("/bus/location/"+process.env.beacon_hash, async function (request, reply) {
  // Build the params object to pass to the template
  let params = { };
  
  await storage.init();
  await storage.setItem('latitude', request.body.latitude);
  await storage.setItem('longitude', request.body.longitude);
  
  // The Handlebars template will use the parameter values to update the page with the chosen color
  return request.body;
});


fastify.get("/bus/location", async function (request, reply) {
  await storage.init();
  let response = { 
    latitude: await storage.getItem('latitude'),
    longitude: await storage.getItem('longitude')
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

