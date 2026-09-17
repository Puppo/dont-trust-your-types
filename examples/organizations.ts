import Fastify from 'fastify'
import { contractRoute, type RouteDefinition } from '../src/index.js'

export type OrganizationRoute = {
  Params: { organizationId: string };
  Querystring: { include?: 'members' | 'projects' };
  Reply: { id: string; name: string };
}

export const organizationDefinition: RouteDefinition<OrganizationRoute> = {
  method: 'GET',
  url: '/organizations/:organizationId',
  handler: async (request) => ({
    id: request.params.organizationId,
    name: request.query.include === 'members' ? 'Acme and friends' : 'Acme',
  }),
}

export function buildServer () {
  const app = Fastify({ logger: false })
  app.register(contractRoute(organizationDefinition))
  return app
}
