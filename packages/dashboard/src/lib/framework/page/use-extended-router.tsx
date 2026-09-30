import { AnyRoute, createRoute, createRouter, RouterOptions } from '@tanstack/react-router';
import { useMemo } from 'react';
import { ErrorPage } from '../../components/shared/error-page.js';
import { AUTHENTICATED_ROUTE_PREFIX } from '../../constants.js';
import { extensionRoutes } from './page-api.js';

/**
 * TanStack's `addChildren()` replaces `route.children` in place, so extending the
 * route tree mutates the shared routes from `routeTree.gen`. We keep each route's
 * original children so that a rebuild (StrictMode, HMR remount) starts from the
 * base tree instead of finding the extension routes it added last time.
 */
const baseChildrenByRoute = new WeakMap<AnyRoute, AnyRoute[]>();

function getBaseChildren(route: AnyRoute): AnyRoute[] {
    let children = baseChildrenByRoute.get(route);
    if (!children) {
        children = [...(route.children ?? [])];
        baseChildrenByRoute.set(route, children);
    }
    return children;
}

/**
 * Creates a TanStack Router with the base route tree extended with additional
 * routes from dashboard extensions.
 *
 * Call it only after the dashboard extensions have been registered, because the
 * router is created once and is not rebuilt when extension routes change.
 * `@tanstack/react-router` does not load a router instance that replaces the
 * one a mounted `RouterProvider` already holds.
 */
export const useExtendedRouter = (
    baseRouteTree: AnyRoute,
    routerOptions: Omit<RouterOptions<AnyRoute, any>, 'routeTree'>,
) => {
    return useMemo(() => {
        const routeTree = baseRouteTree;
        const rootChildren = getBaseChildren(routeTree);

        const authenticatedRouteIndex = rootChildren.findIndex(
            (r: AnyRoute) => r.id === AUTHENTICATED_ROUTE_PREFIX,
        );

        if (authenticatedRouteIndex === -1) {
            if (process.env.NODE_ENV !== 'production') {
                console.error(
                    `[Dashboard] Could not find authenticated route with id ` +
                        `"${AUTHENTICATED_ROUTE_PREFIX}" in the route tree. Extension routes ` +
                        `will not be registered. This usually indicates a drift ` +
                        `between AUTHENTICATED_ROUTE_PREFIX (src/lib/constants.ts) and the ` +
                        `route id generated from src/app/routes/_authenticated.tsx.`,
                );
            }
            // No authenticated route found, return router with base tree
            return createExtendedRouter(routerOptions, routeTree);
        }

        const authenticatedRoute: AnyRoute = rootChildren[authenticatedRouteIndex];
        const authenticatedChildren = getBaseChildren(authenticatedRoute);

        const newAuthenticatedRoutes: AnyRoute[] = [];
        const newRootRoutes: AnyRoute[] = [];

        // Create new routes for each extension
        for (const [path, config] of extensionRoutes.entries()) {
            const pathWithoutLeadingSlash = path.startsWith('/') ? path.slice(1) : path;

            // Check if route should be authenticated (default is true)
            const isAuthenticated = config.authenticated !== false;

            if (isAuthenticated) {
                // Check if the route already exists under authenticated route
                if (
                    authenticatedChildren.findIndex(
                        (r: AnyRoute) => r.path === pathWithoutLeadingSlash,
                    ) > -1
                ) {
                    warnRouteCollision(path);
                    continue;
                }

                const newRoute: AnyRoute = createRoute({
                    path: `/${pathWithoutLeadingSlash}`,
                    getParentRoute: () => authenticatedRoute,
                    loader: config.loader,
                    validateSearch: config.validateSearch,
                    component: () => config.component(newRoute),
                    errorComponent: ({ error }) => <ErrorPage message={error.message} />,
                });
                newAuthenticatedRoutes.push(newRoute);
            } else {
                // Check if the route already exists at the root level
                // Check both by path and by id (which includes the leading slash)
                const routeExists =
                    rootChildren.some(
                        (r: AnyRoute) =>
                            r.path === `/${pathWithoutLeadingSlash}` ||
                            r.path === pathWithoutLeadingSlash ||
                            r.id === `/${pathWithoutLeadingSlash}`,
                    ) ||
                    newRootRoutes.some(
                        (r: AnyRoute) =>
                            r.path === `/${pathWithoutLeadingSlash}` ||
                            r.id === `/${pathWithoutLeadingSlash}`,
                    );

                if (routeExists) {
                    warnRouteCollision(path);
                    continue;
                }

                const newRoute: AnyRoute = createRoute({
                    path: `/${pathWithoutLeadingSlash}`,
                    getParentRoute: () => routeTree,
                    loader: config.loader,
                    validateSearch: config.validateSearch,
                    component: () => config.component(newRoute),
                    errorComponent: ({ error }) => <ErrorPage message={error.message} />,
                });
                newRootRoutes.push(newRoute);
            }
        }

        // Always reset the children, even with no new routes, so that routes
        // added by an earlier build are removed.
        const childrenWithoutAuthenticated = rootChildren.filter(
            (r: AnyRoute) => r.id !== AUTHENTICATED_ROUTE_PREFIX,
        );

        const updatedAuthenticatedRoute = authenticatedRoute.addChildren([
            ...authenticatedChildren,
            ...newAuthenticatedRoutes,
        ]);

        const extendedRouteTree: AnyRoute = routeTree.addChildren([
            ...childrenWithoutAuthenticated,
            updatedAuthenticatedRoute,
            ...newRootRoutes,
        ]);

        return createExtendedRouter(routerOptions, extendedRouteTree);
    }, [baseRouteTree, routerOptions]);
};

function warnRouteCollision(path: string) {
    if (process.env.NODE_ENV !== 'production') {
        console.warn(
            `[Dashboard] Extension route "${path}" conflicts with an existing route and will not be registered.`,
        );
    }
}

/**
 * Helper to create a router with extended route tree, handling some
 * type issues with hydrate/dehydrate functions.
 */
function createExtendedRouter(
    routerOptions: Omit<RouterOptions<AnyRoute, any>, 'routeTree'>,
    extendedRouteTree: AnyRoute,
) {
    return createRouter({
        ...routerOptions,
        dehydrate: routerOptions.dehydrate as any,
        hydrate: routerOptions.hydrate as any,
        routeTree: extendedRouteTree,
    });
}
