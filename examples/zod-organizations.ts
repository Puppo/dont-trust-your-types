import Fastify from 'fastify'
import { z } from 'zod/v4'
import { route } from '../src/index.js'

export const organizationSchemas = {
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

export const organizationRoute = route({
  method: 'POST',
  url: '/organizations/:organizationId',
  schema: {
    params: organizationSchemas.params,
    querystring: organizationSchemas.querystring,
    body: organizationSchemas.body,
    response: { 201: organizationSchemas.response },
  },
  async handler (request, reply) {
    // Params, querystring and body are inferred from the Zod schemas above.
    const { organizationId } = request.params
    const { dryRun } = request.query
    const { name, members } = request.body

    // reply.code(201).send(...) is checked against the response schema.
    return reply.code(201).send({
      id: organizationId,
      name,
      memberCount: members.length,
      created: !dryRun,
    })
  },
})

export function buildZodServer () {
  const server = Fastify({ logger: false })
  server.register(organizationRoute)
  return server
}
