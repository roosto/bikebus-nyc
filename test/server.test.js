'use strict'

process.env.beacon_hash ||= 'HASH_FROM_TESTING'

const { test } = require('tap')
const server = require('../server.js')

test('requests the `/mcs` route', async t => {
  const response = await server.inject({
    method: 'GET',
    url: '/mcs'
  })
  t.equal(response.statusCode, 200, 'returns a status code of 200')
  t.match(response.body,  /<[hH]1>\s*MCS Bike Bus/, "<h1> tag contents match 'MCS Bike Bus")
  t.match(response.body, /routes\s*=\s*\{\s*"mcs"\s*:\s*\{/, "Route JSON for `mcs` is embedded in page body")
})

test('requests the `/bergen` "meta" route', async t => {
  const response = await server.inject({
    method: 'GET',
    url: '/bergen'
  })
  t.equal(response.statusCode, 200, 'returns a status code of 200')
  t.match(response.body, /<[hH]1>\s*Bergen Bike Bus/, "<h1> tag contents match 'Bergen Bike Bus'")
  t.match(response.body, /routes\s*=\s*\{\s*"bergen-to-court"\s*:\s*\{/, "Route JSON is embedded in page body")
  t.match(response.body, /trackBusLocation\('bergen-to-court'\)/, 'Sets up GET calls for `bergen-to-court` location endpoint')
  t.match(response.body, /trackBusLocation\('bergen-to-ps372'\)/, 'Sets up GET calls for `bergen-to-ps378` location endpoint')
})

test('requests the `/I-AM-NOT_HERE` route', async t => {
  const response = await server.inject({
    method: 'GET',
    url: '/I-AM-NOT_HERE'
  })
  t.equal(response.statusCode, 404, 'returns a status code of 404')
  t.match(response.body,  /Route not found/, "page contains 'Route not found'")
})

test('requests the beacon instruction page at `/beacon-instructions`', async t => {
  const response = await server.inject({
    method: 'GET',
    url: '/beacon-instructions'
  })
  t.equal(response.statusCode, 200, 'returns a status code of 200')
  t.match(response.body,  /<title>Bike Bus Beacon Instructions<\/title>/, "page <title> is 'Bike Bus Beacon Instructions'")
})

test('requests the beacon page, w/a bogus routeKey, at: `/beacon/I-AM-NOT-HERE/`', async t => {
  const response = await server.inject({
    method: 'GET',
    url: '/beacon/I-AM-NOT-HERE/'
  })
  t.equal(response.statusCode, 404, 'returns a status code of 404')
  t.match(response.body, /not found/i)
})

test('requests the beacon page, w/o using a hash, at: `/beacon/manhattan-country-school/`', async t => {
  const response = await server.inject({
    method: 'GET',
    url: '/beacon/manhattan-country-school/'
  })
  t.equal(response.statusCode, 404, 'returns a status code of 404')
  t.match(response.body, /not found/i)
})

test(`requests the beacon page, with a hash, at: \`/beacon/manhattan-country-school/${process.env.beacon_hash}\` route`, async t => {
  const response = await server.inject({
    method: 'GET',
    url: `/beacon/manhattan-country-school/${process.env.beacon_hash}`
  })
  t.equal(response.statusCode, 200, 'returns a status code of 200')
})

test(`POST and GET location for \`manhattan-country-school\` route`, async t => {
  const location = { latitude: 40.803917, longitude: -73.946054 }
  const post_response = await server.inject({
    method: 'POST',
    url: `/route/manhattan-country-school/location/${process.env.beacon_hash}`,
    body: location

  })
  t.equal(post_response.statusCode, 200, 'POST returns a status code of 200')
  t.equal(post_response.body, JSON.stringify(location), "POST returns a body equal to POST'ed coordinates")

  const get_response = await server.inject({
    method: 'GET',
    url: '/route/manhattan-country-school/location'
  })
  t.equal(get_response.statusCode, 200, 'GET returns a status code of 200')
  t.equal(post_response.body, JSON.stringify(location), "GET returns a body equal to POST'ed coordinates")
})
