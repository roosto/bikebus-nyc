#!/usr/bin/env node

const fs = require('node:fs');
const glob = require('glob');

let combinedRoutes = {}
const files = glob.sync('routes/*.json');
for (const path of files) {
    try {
        const jsonFromFile = fs.readFileSync(path, 'utf8')
        const parsedJSON = JSON.parse(jsonFromFile)
        const routeKey = Object.keys(parsedJSON)[0]
        // TODO: check for pre-existence of the key
        combinedRoutes[routeKey] = parsedJSON[routeKey]
    } catch (err) {
        console.error(err);
    }
}

module.exports = combinedRoutes;
