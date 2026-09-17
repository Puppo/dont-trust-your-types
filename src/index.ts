import type {
  FastifySchema,
  FastifyPluginAsync,
  RawReplyDefaultExpression,
  RawRequestDefaultExpression,
  RawServerDefault,
  RouteGenericInterface,
  RouteOptions,
} from 'fastify'
import {
  type FastifyPluginAsyncZod,
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider
} from 'fastify-type-provider-zod'

/** The Fastify generic slots exposed to a route consumer. */
type RouteContract = RouteGenericInterface

/** A route whose request and reply types are inferred from its Zod schemas. */
export type ZodRouteDefinition<
  Schema extends FastifySchema
> = RouteOptions<
  RawServerDefault,
  RawRequestDefaultExpression<RawServerDefault>,
  RawReplyDefaultExpression<RawServerDefault>,
  RouteGenericInterface,
  unknown,
  Schema,
  ZodTypeProvider
>

/** Native Fastify route options with the contract in its fourth generic slot. */
export type FastifyRouteOptions<T extends RouteContract> = RouteOptions<
  RawServerDefault,
  RawRequestDefaultExpression<RawServerDefault>,
  RawReplyDefaultExpression<RawServerDefault>,
  T
>

/** A handler whose request and reply are part of the public route contract. */
export type RouteHandler<T extends RouteContract> =
  FastifyRouteOptions<T>['handler']

/** Keeps Fastify route options and the consumer's explicit route contract. */
export type RouteDefinition<T extends RouteContract> = FastifyRouteOptions<T>

/** Turn one Zod-inferred route definition into an encapsulated Fastify plugin. */
export function route<const Schema extends FastifySchema> (
  definition: ZodRouteDefinition<Schema>
): FastifyPluginAsyncZod {
  return async function routePlugin (fastify) {
    // Compiler configuration is encapsulated with the route plugin.
    fastify.setValidatorCompiler(validatorCompiler)
    fastify.setSerializerCompiler(serializerCompiler)

    fastify.route(definition)
  }
}

/** Turn one explicit Fastify route contract into an encapsulated plugin. */
export function contractRoute<T extends RouteContract> (
  definition: RouteDefinition<T>
): FastifyPluginAsync {
  return async function contractRoutePlugin (fastify) {
    fastify.route<T>(definition)
  }
}
