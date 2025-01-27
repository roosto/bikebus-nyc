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

const storage = require("node-persist");
const cache = require("nano-cache");

// Setup our static files
fastify.register(require("@fastify/static"), {
  root: path.join(__dirname, "public"),
  prefix: "/", // optional: default '/'
});

// View is a templating manager for fastify
const handlebars = require("handlebars");

handlebars.registerHelper("toJSON", function (object) {
  return new handlebars.SafeString(JSON.stringify(object));
});

fastify.register(require("@fastify/view"), {
  engine: {
    handlebars: handlebars,
  },
});

let busIsRunning = true;

//eventually the cms or bus_info.json
const routes = require("./routes.json");

/**
 * Our home page route
 *
 * Returns src/pages/index.hbs with data built into it
 */

fastify.get("/:route", async function (request, reply) {
  let { route } = request.params;

  if (route == "") {
    route = "manhattan-country-school";
  }

  let bus;

  if (!routes.hasOwnProperty(route)) {
    return reply.code(404).type("text/plain").send("Route not found.");
  } else {
    bus = routes[route];
  }

  await storage.init();

  // params is an object we'll pass to our handlebars template
  let params = {
    routes,
    bus,
    route: route,
  };

  // The Handlebars code will be able to access the parameter values and build them into the page
  return reply.view("/src/pages/tracker.hbs", params);
});

fastify.get("/beacon-instructions", async function (request, reply) {
  const params = {};

  // The Handlebars code will be able to access the parameter values and build them into the page
  return reply.view("/src/pages/tracker-instructions.hbs", params);
});

fastify.get(
  "/beacon/:route/" + process.env.beacon_hash,
  function (request, reply) {
    const { route } = request.params;
    if (!routes.hasOwnProperty(route)) {
      return reply.code(404).type("text/plain").send("Route not found.");
    }

    const params = {
      beacon_hash: process.env.beacon_hash,
      route: route,
    };
    return reply.view("/src/pages/beacon.hbs", params);
  }
);

fastify.post(
  "/bus/:route/location/" + process.env.beacon_hash,
  async function (request, reply) {
    const { route } = request.params;
    if (!routes.hasOwnProperty(route)) {
      return reply.code(404).type("text/plain").send("Route not found.");
    }

    await storage.init();
    await storage.setItem(route + ".latitude", request.body.latitude);
    await storage.setItem(route + ".longitude", request.body.longitude);
    cache.del(route + ".latitude");
    cache.del(route + ".longitude");
    return request.body;
  }
);

fastify.get("/bus/:route/location", async function (request, reply) {
  const { route } = request.params;
  if (!routes.hasOwnProperty(route)) {
    return reply.code(404).type("text/plain").send("Route not found.");
  }

  let latitude;
  let longitude;

  if (busIsRunning) {
    await storage.init();
    latitude = cache.get(route + ".latitude");
    if (latitude === null) {
      latitude = await storage.getItem(route + ".latitude");
      cache.set(route + ".latitude", latitude);
    }

    longitude = cache.get(route + ".longitude");
    if (longitude === null) {
      longitude = await storage.getItem(route + ".longitude");
      cache.set(route + ".longitude", longitude);
    }
  }

  let response = {
    latitude: latitude || 0,
    longitude: longitude || 0,
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
