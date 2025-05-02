'use strict'

process.env.beacon_hash ||= 'HASH_FROM_TESTING'

const { test } = require('tap')
const server = require('../server.js')

const tracker_scenarios = [
  {
    uri: "/",
    expected: {
      statusCode: 200,
      body: /<[hH]1>\s*MCS Bike Bus/,
    },
  },
  {
    uri: "/manhattan-country-school",
    expected: {
      statusCode: 200,
      body: /<[hH]1>\s*MCS Bike Bus/,
    },
  },
]

tracker_scenarios.forEach(scenario => {
  test('requests the `' + scenario.uri + '` route', async t => {
    const response = await server.inject({
      method: 'GET',
      url: scenario.uri
    })
    t.equal(response.statusCode, scenario.expected.statusCode, 'returns a status code of 200')
    t.match(response.body, scenario.expected.body, 'defaults to Manhantan Country School')
  })
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
  t.equal(post_response.statusCode, 200, 'POST eturns a status code of 200')
  t.equal(post_response.body, JSON.stringify(location), "POST returns a body equal to POST'ed coordinates")

  const get_response = await server.inject({
    method: 'GET',
    url: '/route/manhattan-country-school/location'
  })
  t.equal(get_response.statusCode, 200, 'GET returns a status code of 200')
  t.equal(post_response.body, JSON.stringify(location), "GET returns a body equal to POST'ed coordinates")
})
