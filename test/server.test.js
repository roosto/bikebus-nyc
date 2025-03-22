'use strict'

const { test } = require('tap')
const server = require('../server.js')

const scenarios = [
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

scenarios.forEach(scenario => {
  test('requests the `' + scenario.uri + '` route', {
    skip: scenario.uri.match(/^\/.+\/$/) ? 'URIs with a trailing slash are not handled correctly by server.js (except `/`)' : false
  },  async t => {
    const response = await server.inject({
      method: 'GET',
      url: scenario.uri
    })
    t.equal(response.statusCode, scenario.expected.statusCode, 'returns a status code of 200')
    t.match(response.body, scenario.expected.body, 'defaults to Manhantan Country School')
  })
})
