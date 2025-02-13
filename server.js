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

fastify.get("/:routeKey", async function (request, reply) {
  let { routeKey } = request.params;

  let { routeKeys } = request.query;
  console.log({ routeKeys });

  if (routeKey == "") {
    routeKey = "manhattan-country-school";
  }

  let route;

  if (!routes.hasOwnProperty(routeKey)) {
    return reply.code(404).type("text/plain").send("Route not found.");
  } else {
    route = routes[routeKey];
  }

  await storage.init();

  // params is an object we'll pass to our handlebars template
  let params = {
    routes,
    route,
    routeKey: routeKey,
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
  "/beacon/:routeKey/" + process.env.beacon_hash,
  function (request, reply) {
    const { routeKey } = request.params;
    if (!routes.hasOwnProperty(routeKey)) {
      return reply.code(404).type("text/plain").send("Route not found.");
    }

    const params = {
      beacon_hash: process.env.beacon_hash,
      routeKey: routeKey,
    };
    return reply.view("/src/pages/beacon.hbs", params);
  }
);

fastify.post(
  "/route/:routeKey/location/" + process.env.beacon_hash,
  async function (request, reply) {
    const { routeKey } = request.params;
    if (!routes.hasOwnProperty(routeKey)) {
      return reply.code(404).type("text/plain").send("Route not found.");
    }

    await storage.init();
    await storage.setItem(routeKey + ".latitude", request.body.latitude);
    await storage.setItem(routeKey + ".longitude", request.body.longitude);
    cache.del(routeKey + ".latitude");
    cache.del(routeKey + ".longitude");
    return request.body;
  }
);

fastify.get("/route/:routeKey/location", async function (request, reply) {
  const { routeKey } = request.params;
  if (!routes.hasOwnProperty(routeKey)) {
    return reply.code(404).type("text/plain").send("Route not found.");
  }

  let latitude;
  let longitude;

  if (busIsRunning) {
    await storage.init();
    latitude = cache.get(routeKey + ".latitude");
    if (latitude === null) {
      latitude = await storage.getItem(routeKey + ".latitude");
      cache.set(routeKey + ".latitude", latitude);
    }

    longitude = cache.get(routeKey + ".longitude");
    if (longitude === null) {
      longitude = await storage.getItem(routeKey + ".longitude");
      cache.set(routeKey + ".longitude", longitude);
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
