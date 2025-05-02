'use strict'

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
  {
    uri: "/manhattan-country-school/",
    expected: {
      statusCode: 200,
      body: /<[hH]1>\s*MCS Bike Bus/,
    },
  },
]

tracker_scenarios.forEach(scenario => {
  test('requests the `' + scenario.uri + '` route', {
    skip: scenario.uri.match(/^\/.+\/$/) ? 'URIs with a trailing slash are not handled correctly by server.js (except `/`)' : false
  },  async t => {
    const response = await server.inject({
      method: 'GET',
      url: scenario.uri
    })
    t.equal(response.statusCode, scenario.expected.statusCode, 'returns a status code of 200')
    t.match(response.body, scenario.expected.body, 'defaults to Manhantan Country School')
    // TODO: there maybe a way to more elegantly match, using the below code, but since the
    //       `matchOnly()` seems to by default try to examine the 'raw' Response object, I
    //       can't get it to work in the way I might expect
    /* t.matchOnly(response, scenario.expected) */
  })
})

test('requests the beacon page at: `/beacon/manhattan-country-school/` route', async t => {
  const response = await server.inject({
    method: 'GET',
    url: '/beacon/manhattan-country-school/'
  })
  t.equal(response.statusCode, 404, 'returns a status code of 404')
  t.match(response.body, /not found/i)
})

test('requests the beacon page at: `/beacon/manhattan-country-school/MY_HASH_DADDY` route', async t => {
  const response = await server.inject({
    method: 'GET',
    url: '/beacon/manhattan-country-school/MY_HASH_DADDY'
  })
  t.equal(response.statusCode, 200, 'returns a status code of 200')
  // t.match(response.body, /not found/i)
})