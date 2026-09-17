# fastify-route-contracts

A deliberately small Fastify package for a talk about **type contracts** and [TSTyche](https://tstyche.org). Runtime tests show that the route works; type tests ensure the public generic contract does not silently become `any`.

## Run it

```sh
npm install
npm run lint
npm run check
npm test
npm run test:types
```

For CI, test every supported TypeScript minor release before TypeScript 7:

```sh
npm run test:types:compat
```

## The regression to demonstrate

`RouteDefinition` starts from Fastify's `RouteOptions`, correctly putting the route contract in its fourth generic parameter. Changing it to use `FastifyRouteOptions<any>` makes editor hovers lose `params` and `query` inference. The equality assertion in `test/contracts.tst.ts` then fails, even if the runtime test remains green.

The invalid-call test binds `contractRoute<OrganizationRoute>` first. Testing an unbound generic factory would be misleading: TypeScript could infer a different, valid route contract from the argument.

## Zod inference

[`examples/zod-organizations.ts`](examples/zod-organizations.ts) passes Zod schemas directly to the exported `route()` wrapper. The wrapper is a `FastifyPluginAsyncZod`, so params, querystring, body and the `201` response are inferred in the handler while those same schemas perform validation and serialization at runtime. The separate `contractRoute()` wrapper preserves the explicit Fastify-generic example without mixing the two provider types.
