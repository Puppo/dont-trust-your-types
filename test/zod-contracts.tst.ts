import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { expect, test } from 'tstyche'
import { z } from 'zod/v4'
import { type ZodRouteDefinition, route } from '../src/index.js'

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
  headers: z.object({
    'x-trace-id': z.string(),
  }),
  response: z.object({
    id: z.string(),
    name: z.string(),
    memberCount: z.number().int().nonnegative(),
    created: z.boolean(),
  }),
}

type OrganizationSchema = {
  params: typeof organizationSchemas.params
  querystring: typeof organizationSchemas.querystring
  body: typeof organizationSchemas.body
  headers: typeof organizationSchemas.headers
  response: { 201: typeof organizationSchemas.response }
}

type OrganizationDefinition = ZodRouteDefinition<OrganizationSchema>
type OrganizationRequest = Parameters<OrganizationDefinition['handler']>[0]

declare const reply: Parameters<OrganizationDefinition['handler']>[1]

test('Zod schemas are the route contract', () => {
  expect<z.output<typeof organizationSchemas.params>>().type.toBe<{
    organizationId: string
  }>()

  expect<z.output<typeof organizationSchemas.querystring>>().type.toBe<{
    dryRun: boolean
  }>()

  expect<z.output<typeof organizationSchemas.body>>().type.toBe<{
    name: string
    members: string[]
  }>()

  expect<z.output<typeof organizationSchemas.response>>().type.toBe<{
    id: string
    name: string
    memberCount: number
    created: boolean
  }>()
})

test('route applies Zod inference to the Fastify handler', () => {
  expect<OrganizationRequest['params']>().type.toBe<{
    organizationId: string
  }>()
  expect<OrganizationRequest['query']>().type.toBe<{ dryRun: boolean }>()
  expect<OrganizationRequest['body']>().type.toBe<{
    name: string
    members: string[]
  }>()

  expect(reply.code(201).send).type.toBeCallableWith({
    id: 'acme',
    name: 'Acme',
    memberCount: 2,
    created: true
  })
  expect(reply.code(201).send).type.not.toBeCallableWith({
    id: 42,
    name: 'Acme',
    memberCount: 2,
    created: true
  })
})

test('headers are inferred from the Zod schema', () => {
  // Fastify intersects declared Headers with IncomingHttpHeaders, so we
  // assert assignability rather than equality.
  expect<OrganizationRequest['headers']>().type.toBeAssignableTo<{
    'x-trace-id': string
  }>()
})

test('the Zod route factory rejects an invalid reply', () => {
  expect(route).type.not.toBeCallableWith({
    method: 'POST',
    url: '/organizations/:organizationId',
    schema: {
      params: organizationSchemas.params,
      querystring: organizationSchemas.querystring,
      body: organizationSchemas.body,
      response: { 201: organizationSchemas.response },
    },
    handler: async () => ({
      id: 'acme',
      name: 'Acme',
      memberCount: 2,
      // `created` is declared as boolean in the response schema.
      created: 'not-a-boolean',
    }),
  })
})

test('only declared status codes are accepted on reply.code(...)', () => {
  // reply.code() only accepts the status code keys declared in the
  // response schema (here, only 201).
  expect<Parameters<typeof reply.code>[0]>().type.toBe<201>()

  // The declared status code accepts its matching response shape.
  expect(reply.code(201).send).type.toBeCallableWith({
    id: 'acme',
    name: 'Acme',
    memberCount: 2,
    created: true,
  })
})

test('the Zod route accepts a handler that returns reply.code(201).send(...)', () => {
  // The handler can be written as
  //   async (request, reply) => reply.code(201).send({...})
  // which exercises both the async return and the imperative reply.send() form.
  // Extract a typed handler so parameter types are inferred from the schema.
  type Handler = ZodRouteDefinition<OrganizationSchema>['handler']
  const handler: Handler = async (_request, reply) =>
    reply.code(201).send({
      id: 'acme',
      name: 'Acme',
      memberCount: 0,
      created: true,
    })

  expect(route).type.toBeCallableWith({
    method: 'POST',
    url: '/organizations/:organizationId',
    schema: {
      params: organizationSchemas.params,
      querystring: organizationSchemas.querystring,
      body: organizationSchemas.body,
      headers: organizationSchemas.headers,
      response: { 201: organizationSchemas.response },
    },
    handler,
  })
})

test('a realistic Zod handler body type-checks every request and reply access', () => {
  // Each access inside the handler body must resolve to the type
  // inferred from the Zod schemas. If any field is mis-typed, this
  // test fails to compile.
  type Handler = ZodRouteDefinition<OrganizationSchema>['handler']
  const handler: Handler = async (request, reply) => {
    const { organizationId } = request.params
    const { dryRun } = request.query
    const { name, members } = request.body
    const traceId: string = request.headers['x-trace-id']

    return reply.code(201).send({
      id: organizationId,
      name,
      memberCount: members.length,
      created: !dryRun,
      // Reference traceId so it is observed by the type checker.
      ...(traceId.length > 0 ? {} : {}),
    })
  }

  expect(route).type.toBeCallableWith({
    method: 'POST',
    url: '/organizations/:organizationId',
    schema: {
      params: organizationSchemas.params,
      querystring: organizationSchemas.querystring,
      body: organizationSchemas.body,
      headers: organizationSchemas.headers,
      response: { 201: organizationSchemas.response },
    },
    handler,
  })
})

test('route(...) returns a FastifyPluginAsyncZod', () => {
  expect<ReturnType<typeof route>>().type.toBe<FastifyPluginAsyncZod>()
})
