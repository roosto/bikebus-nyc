'use strict'

const { test } = require('tap')
const server = require('../server.js')

test('requests the "/" route', async t => {
  const response = await server.inject({
    method: 'GET',
    url: '/'
  })
  t.equal(response.statusCode, 200, 'returns a status code of 200')
  t.match(response.body, /<[hH]1>\s*MCS Bike Bus/, 'defaults to Manhantan Country School')
})

test('requests the "/manhattan-country-school/" route', async t => {
  const response = await server.inject({
    method: 'GET',
    url: '/manhattan-country-school/'
  })
  t.equal(response.statusCode, 200, 'returns a status code of 200')
  t.match(response.body, /<[hH]1>\s*MCS Bike Bus/, 'defaults to Manhantan Country School')
})

test('requests the "/manhattan-country-school" route', async t => {
  const response = await server.inject({
    method: 'GET',
    url: '/manhattan-country-school'
  })
  t.equal(response.statusCode, 200, 'returns a status code of 200')
  t.match(response.body, /<[hH]1>\s*MCS Bike Bus/, 'defaults to Manhantan Country School')
})