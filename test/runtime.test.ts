import assert from 'node:assert/strict'
import test from 'node:test'
import Fastify from 'fastify'
import { z } from 'zod/v4'
import {
  contractRoute,
  route,
  type RouteDefinition,
} from '../src/index.js'

type OrganizationRoute = {
  Params: { organizationId: string };
  Querystring: { include?: 'members' | 'projects' };
  Reply: { id: string; name: string };
}

const organizationDefinition: RouteDefinition<OrganizationRoute> = {
  method: 'GET',
  url: '/organizations/:organizationId',
  handler: async (request) => ({
    id: request.params.organizationId,
    name: request.query.include === 'members' ? 'Acme and friends' : 'Acme',
  }),
}

function buildServer () {
  const app = Fastify({ logger: false })
  app.register(contractRoute(organizationDefinition))
  return app
}

const organizationSchemas = {
  params: z.object({
    organizationId: z.string().min(1),
  }),
  querystring: z.object({
    dryRun: z
      .enum(['true', 'false'])
      .default('false')
      .transform((value) => value === 'true'),
  }),
  body: z.object({
    name: z.string().min(1),
    members: z.array(z.string()).default([]),
  }),
  response: z.object({
    id: z.string(),
    name: z.string(),
    memberCount: z.number().int().nonnegative(),
    created: z.boolean(),
  }),
}

const organizationRoute = route({
  method: 'POST',
  url: '/organizations/:organizationId',
  schema: {
    params: organizationSchemas.params,
    querystring: organizationSchemas.querystring,
    body: organizationSchemas.body,
    response: { 201: organizationSchemas.response },
  },
  async handler (request, reply) {
    const { organizationId } = request.params
    const { dryRun } = request.query
    const { name, members } = request.body

    return reply.code(201).send({
      id: organizationId,
      name,
      memberCount: members.length,
      created: !dryRun,
    })
  },
})

function buildZodServer () {
  const server = Fastify({ logger: false })
  server.register(organizationRoute)
  return server
}

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
