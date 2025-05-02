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
