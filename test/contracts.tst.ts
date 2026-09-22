import { expect, test } from 'tstyche'
import { z } from 'zod/v4'
import {
  contractRoute,
  route,
  type FastifyRouteOptions,
  type RouteDefinition,
  type RouteHandler,
} from '../src/index.js'

type OrganizationRoute = {
  Params: { organizationId: string };
  Querystring: { include?: 'members' | 'projects' };
  Body: { name: string };
  Headers: { 'x-trace-id': string };
  Reply: { id: string; name: string };
}
type ExpectedDefinition = Omit<
  FastifyRouteOptions<OrganizationRoute>,
  'handler'
> & { handler: RouteHandler<OrganizationRoute> }
const organizationRoute = contractRoute<OrganizationRoute>

test('RouteDefinition preserves its generic', () => {
  // Fails if RouteDefinition<T> is accidentally changed to use `any`.
  expect<RouteDefinition<OrganizationRoute>>().type.toBe<ExpectedDefinition>()
})

test('request inference remains part of the contract', () => {
  expect<Parameters<RouteHandler<OrganizationRoute>>[0]['params']>().type.toBe<{
    organizationId: string;
  }>()
  expect<Parameters<RouteHandler<OrganizationRoute>>[0]['query']>().type.toBe<{
    include?: 'members' | 'projects';
  }>()
})

test('request body is inferred from the contract', () => {
  expect<Parameters<RouteHandler<OrganizationRoute>>[0]['body']>().type.toBe<{
    name: string;
  }>()
})

test('request headers are inferred from the contract', () => {
  // Fastify intersects declared Headers with IncomingHttpHeaders, so we
  // assert assignability rather than equality.
  expect<Parameters<RouteHandler<OrganizationRoute>>[0]['headers']>().type.toBeAssignableTo<{
    'x-trace-id': string;
  }>()
})

test('a bound route factory rejects an invalid reply', () => {
  expect(organizationRoute).type.not.toBeCallableWith({
    method: 'GET',
    url: '/organizations/:organizationId',
    handler: async () => ({ id: 42, name: 'Acme' }),
  })
})

test('an async handler returning the Reply is accepted', () => {
  expect(organizationRoute).type.toBeCallableWith({
    method: 'GET',
    url: '/organizations/:organizationId',
    handler: async () => ({ id: 'acme', name: 'Acme' }),
  })
})

test('the Zod route factory rejects an invalid reply', () => {
  expect(route).type.not.toBeCallableWith({
    method: 'POST',
    url: '/organizations',
    schema: {
      response: { 201: z.object({ id: z.string(), name: z.string() }) },
    },
    handler: async () => ({ id: 42, name: 'Acme' }),
  })
})