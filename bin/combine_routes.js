#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

if (process.argv.length <= 2) {
    console.error("Error: expected at least 1 argument")
    process.exit(1)
}

let combinedRoutes = {}
for (i=2; i < process.argv.length; i++) {
    try {
        const jsonFromFile = fs.readFileSync(process.argv[i], 'utf8')
        const parsedJSON = JSON.parse(jsonFromFile)
        const routeKey = Object.keys(parsedJSON)[0]
        // TODO: check for pre-existence of the key
        combinedRoutes[routeKey] = parsedJSON[routeKey]
    } catch (err) {
        console.error(err);
    }
}

console.log(JSON.stringify(combinedRoutes, null, 2))
