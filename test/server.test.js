'use strict'

const { test } = require('tap')
const server = require('../server.js')

test('requests the "/" route', async t => {
  const response = await server.inject({
    method: 'GET',
    url: '/'
  })
  t.equal(response.statusCode, 200, 'returns a status code of 200')
})
