# ArgySolutions dashboard fork

Based on Vendure v3.7.3. The `argysolutions-3.7.3` branch carries the service branding developed in the ecommerce application:

- ArgySolutions login wordmark and Spanish welcome text.
- Responsive ArgySolutions toolbar wordmark.
- Forest green primary and brand colors in light and dark themes.

The defaults live in `packages/dashboard/src/lib/components/shared/service-branding.tsx` and `packages/dashboard/vite/vite-plugin-theme.ts`. Login extensions and theme overrides remain available. An existing toolbar extension with ID `argysolutions-service-brand` suppresses the built-in wordmark to avoid duplication.

This change preserves the upstream login attribution, user-menu links, browser title/favicon and license files. It is the same primary branding scope as the local application, not a complete removal of Vendure references.

## Use and distribution

This repository contains the framework source, not a configured store, database, credentials or the local Mercado Pago integration. Downloading this branch does not switch an existing application's npm dependencies to the fork. The local ecommerce application still uses published Vendure 3.7.3 with its branding extension.

Follow the upstream development/build instructions when producing packages from this source. The upstream package names and versions are retained; no package has been published to npm by this fork.

## Validation

The dashboard was built with Vite 7.3.6 using the ecommerce application's compatible installed dependencies and the fork's dashboard source and theme plugin. The local branding extension was disabled for this verification to exercise the fork defaults. Strict TypeScript checks passed for the service branding and theme modules.

Chrome verification against a local demo backend passed for login, primary color, desktop/mobile layout, authenticated toolbar, administrators, roles and customers, with no JavaScript errors. This is scoped dashboard verification, not the entire Vendure monorepo test suite or a clean package-release build.
