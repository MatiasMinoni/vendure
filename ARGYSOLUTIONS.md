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

## Preparing the npm package

The release package is named `@YOUR_NPM_USERNAME/vendure-dashboard`, version `3.7.3-argysolutions.1`. Public publication requires an authenticated npm account with write permission to that scope. Confirm the username using `npm whoami` after `npm login`. The branding remains ArgySolutions even when the package is published under a personal account. No credentials are stored here.

After installing the upstream workspace dependencies, build and package from `packages/dashboard`:

```sh
npx tsc -p tsconfig.vite.json --rootDir vite
npx tsc -p tsconfig.plugin.json --rootDir plugin
node scripts/build-plugin.js
npm run build:lib
node scripts/pack-argysolutions.mjs YOUR_NPM_USERNAME
```

Use the upstream TypeScript 5.8.2 compiler for these release builds. The explicit GraphQL `DocumentNode` annotation makes plugin declarations portable across pnpm dependency paths. The packaging script adds the directly imported `@gql.tada/cli-utils` dependency, includes the license files, and writes the tarball and file manifest to `artifacts/argysolutions/`.

Review and publish the exact tested tarball from the repository root:

```sh
npm publish artifacts/argysolutions/YOUR_NPM_USERNAME-vendure-dashboard-3.7.3-argysolutions.1.tgz --access public --tag latest
```

The `latest` tag is intentional for the independently versioned fork. Installation uses the original dependency key:

```sh
npm install --save-exact @vendure/dashboard@npm:@YOUR_NPM_USERNAME/vendure-dashboard@3.7.3-argysolutions.1
```

The commands targeting the registry will only work after publication. Until then, the tarball can be installed under `@vendure/dashboard` using a `file:` dependency in `package.json`.
