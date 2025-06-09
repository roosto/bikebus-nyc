/**
 * This is the main Node.js server script for your project
 * Check out the two endpoints this back-end API provides in server.get and server.post below
 */

require('heroku-self-ping').default("https://tracker.bikebus.nyc/", {
  verbose: true
});

const path = require("path");
const filterObj = require('filter-obj')

// Require the fastify framework and instantiate it
const server = require("fastify")({
  // Set this to true for detailed logging:
  logger: false,
});

const storage = require("node-persist");
const cache = require("nano-cache");

// Setup our static files
server.register(require("@fastify/static"), {
  root: path.join(__dirname, "public"),
  prefix: "/", // optional: default '/'
});

// View is a templating manager for fastify
const handlebars = require("handlebars");

handlebars.registerHelper("toJSON", function (object) {
  return new handlebars.SafeString(JSON.stringify(object));
});

server.register(require("@fastify/view"), {
  engine: {
    handlebars: handlebars,
  },
});

let busIsRunning = true;

//eventually the cms or bus_info.json
const routes = require("./routes.js");
const published_routes = Object.fromEntries(Object.entries(routes).filter(([key, val]) => val.publish))

// validate `combinedRouteKeys` properties
let combinedRoutesErrors = []
Object.entries(routes).forEach(entry => {
  const [key, route] = entry;
  if (!route.hasOwnProperty('combinedRouteKeys')) {
    return
  }

  if (!Array.isArray(route.combinedRouteKeys)) {
    combinedRoutesErrors.push(`In route '${key}': combinedRouteKeys is not an Array: '${route.combinedRouteKeys}'`)
    return
  }

  const combinedRoutesCount = route.combinedRouteKeys.length
  if (combinedRoutesCount < 2) {
    combinedRoutesErrors.push(`In route '${key}': combinedRouteKeys has ${combinedRoutesCount} element(s), but needs 2 or more`)
    return
  }

  route.combinedRouteKeys.forEach(routeKey => {
    if (!routes.hasOwnProperty(routeKey)) {
      combinedRoutesErrors.push(`In route '${key}.combinedRouteKeys': '${routeKey}' does not exist as a key in routes`)
    }
  })
})

if(combinedRoutesErrors.length > 0) {
  throw new Error(combinedRoutesErrors.join("\n"))
}

/**
 * Our home page route
 *
 * Returns src/pages/index.hbs with data built into it
 */

server.get("/", async function (request, reply) {
  // The Handlebars code will be able to access the routes values and build them into the page
  return reply.view("/src/pages/index.hbs", {routes: published_routes})
});

server.get("/:routeKey", async function (request, reply) {
  const routeKey = request.params.routeKey
  if (!routes.hasOwnProperty(routeKey)) {
    return reply.code(404).type("text/plain").send(`Route not found: '${routeKey}'`);
  }

  let routeKeys = [routeKey]
  let route = routes[routeKey]
  if (route.hasOwnProperty('combinedRouteKeys')) {
    routeKeys = route.combinedRouteKeys
  }

  await storage.init();

  // params is an object we'll pass to our handlebars template
  let params = {
    routes: filterObj.includeKeys(routes, routeKeys),
    route,
    routeKeys: routeKeys,
    routeKey: routeKey,
  };

  // The Handlebars code will be able to access the parameter values and build them into the page
  return reply.view("/src/pages/tracker.hbs", params);
});

server.get("/beacon-instructions", async function (request, reply) {
  const params = {};

  // The Handlebars code will be able to access the parameter values and build them into the page
  return reply.view("/src/pages/tracker-instructions.hbs", params);
});

server.get(
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

server.post(
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

server.get("/route/:routeKey/location", async function (request, reply) {
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

module.exports = server
