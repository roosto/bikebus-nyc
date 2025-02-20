'use strict'

const { test } = require('tap')
const server = require('../server.js')

const scenarios = [
  {
    uri: "/",
    statusCode: 200,
    body: /<[hH]1>\s*MCS Bike Bus/,
  },
  {
    uri: "/manhattan-country-school",
    statusCode: 200,
    body: /<[hH]1>\s*MCS Bike Bus/,
  },
  {
    uri: "/manhattan-country-school/",
    statusCode: 200,
    body: /<[hH]1>\s*MCS Bike Bus/,
  },
]

scenarios.forEach(scenario => {
  test('requests the `' + scenario.uri + '` route', async t => {
    const response = await server.inject({
      method: 'GET',
      url: scenario.uri
    })
    t.equal(response.statusCode, scenario.statusCode, 'returns a status code of 200')
    t.match(response.body, scenario.body, 'defaults to Manhantan Country School')
  })
})
