import assert from 'node:assert/strict'
import test from 'node:test'
import { buildServer } from '../examples/organizations.js'
import { buildZodServer } from '../examples/zod-organizations.js'

test('registers an organization route', async (t) => {
  const app = buildServer()
  t.after(() => app.close())
  const response = await app.inject({
    method: 'GET',
    url: '/organizations/acme?include=members',
  })
  assert.equal(response.statusCode, 200)
  assert.deepEqual(response.json(), { id: 'acme', name: 'Acme and friends' })
})

test('validates and serializes a route from Zod schemas', async (t) => {
  const app = buildZodServer()
  t.after(() => app.close())

  const response = await app.inject({
    method: 'POST',
    url: '/organizations/acme?dryRun=true',
    payload: { name: 'Acme', members: ['Ada', 'Grace'] }
  })

  assert.equal(response.statusCode, 201)
  assert.deepEqual(response.json(), {
    id: 'acme',
    name: 'Acme',
    memberCount: 2,
    created: false
  })
})

test('rejects a body that does not match its Zod schema', async (t) => {
  const app = buildZodServer()
  t.after(() => app.close())

  const response = await app.inject({
    method: 'POST',
    url: '/organizations/acme',
    payload: { name: '' }
  })

  assert.equal(response.statusCode, 400)
})
