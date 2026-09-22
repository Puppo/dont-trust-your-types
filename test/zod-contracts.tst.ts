import type {
  FastifySchema,
  RawReplyDefaultExpression,
  RawRequestDefaultExpression,
  RawServerDefault,
  RouteGenericInterface,
  RouteOptions,
} from 'fastify'
import { type ZodTypeProvider } from 'fastify-type-provider-zod'
import { expect, test } from 'tstyche'
import { z } from 'zod/v4'
import { type ZodRouteDefinition } from '../src/index.js'

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

type OrganizationSchema = {
  params: typeof organizationSchemas.params
  querystring: typeof organizationSchemas.querystring
  body: typeof organizationSchemas.body
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