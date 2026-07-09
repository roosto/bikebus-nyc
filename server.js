/**
 * This is the main Node.js server script for your project
 * Check out the two endpoints this back-end API provides in server.get and server.post below
 */

require('heroku-self-ping').default("https://tracker.bikebus.nyc/", {
  verbose: true
});

const path = require("path");
const filterObj = require('filter-obj')
const geolib = require('geolib')

// Require the fastify framework and instantiate it
const server = require("fastify")({routerOptions:
    {
      // Set this to true for detailed logging:
      logger: false,
      ignoreTrailingSlash: true,
    }

});

const NanoCache = require('nano-cache');
const cache = new NanoCache({ ttl: 30 * 60 * 1000 }); // 30 minutes in milliseconds

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

handlebars.registerHelper('breaklines', function(text) {
    text = handlebars.Utils.escapeExpression(text);
    text = text.replace(/\n/gm, '<br>');
    return new handlebars.SafeString(text);
});

server.register(require("@fastify/view"), {
  engine: {
    handlebars: handlebars,
  },
});

let busIsRunning = true;

// Maximum distance in meters from the route before a GPS ping is ignored.
// This prevents ride leaders from accidentally sharing their location
// when traveling to/from the route (e.g., home or work).
const MAX_DISTANCE_FROM_ROUTE_METERS = 500;

// Returns true if the given coordinates are within MAX_DISTANCE_FROM_ROUTE_METERS
// of any segment of the route, or if the route has no stops defined.
function isLocationNearRoute(routeStops, latitude, longitude) {
  if (!routeStops || routeStops.length < 2) return true;

  const point = { latitude, longitude };
  const stops = routeStops.map(s => ({ latitude: s.coordinates[0], longitude: s.coordinates[1] }));

  for (let i = 0; i < stops.length - 1; i++) {
    if (geolib.isPointNearLine(point, stops[i], stops[i + 1], MAX_DISTANCE_FROM_ROUTE_METERS)) {
      return true;
    }
  }

  return false;
}

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

  // params is an object we'll pass to our handlebars template
  let params = {
    hostname: request.headers.host,
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

// this handles the case where the beacon page on the glitch app redirects to us
// we send the redirection straight to the `bergen-to-court` route, b/c it's confusing otherwise
server.get(
  "/bergen/beacon/bergen/:beacon_hash", async function (request, reply) {
    const { beacon_hash } = request.params;
    return reply.redirect('/beacon/bergen-to-court/' + encodeURI(beacon_hash), 301);
  }
);

server.get(
  "/beacon/:routeKey/" + process.env.beacon_hash,
  function (request, reply) {
    const { routeKey } = request.params;
    if (!routes.hasOwnProperty(routeKey)) {
      return reply.code(404).type("text/plain").send("Route not found.");
    }

    // no such thing as a beacon page for a "meta route"
    // send user to a page where they can the go to the correct route
    if (routes[routeKey].hasOwnProperty('combinedRouteKeys')) {
      const routeKeys = routes[routeKey].combinedRouteKeys
      const params = {
        beacon_hash: process.env.beacon_hash,
        routeKeys: routeKeys,
        routes: filterObj.includeKeys(routes, routeKeys)
      }
      return reply.view("/src/pages/beacon-choice.hbs", params);
    }

    const iframeRouteKey = routes[routeKey].hasOwnProperty('parentMetaRoute') ? routes[routeKey].parentMetaRoute : routeKey
    const params = {
      beacon_hash: process.env.beacon_hash,
      routeKey: routeKey,
      iframeRouteKey: iframeRouteKey,
      hasParentMetaRoute: routeKey != iframeRouteKey,
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

    if (!isLocationNearRoute(routes[routeKey].stops, request.body.latitude, request.body.longitude)) {
      return reply.code(200).send({ ignored: true });
    }

    cache.set(routeKey + ".latitude", request.body.latitude);
    cache.set(routeKey + ".longitude", request.body.longitude);
    cache.set(routeKey + ".timestamp", Date.now());
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
  let timestamp;

  if (busIsRunning) {
    latitude = cache.get(routeKey + ".latitude");
    longitude = cache.get(routeKey + ".longitude");
    timestamp = cache.get(routeKey + ".timestamp");
  }

  let response = {
    latitude: latitude || 0,
    longitude: longitude || 0,
    timestamp: timestamp || null,
  };
  return response;
});

module.exports = server
