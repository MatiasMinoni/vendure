# ArgySolutions Vendure Dashboard

An independently maintained dashboard package based on Vendure 3.7.3, with ArgySolutions login branding, Spanish welcome text, a responsive toolbar wordmark, and green light/dark theme colors. This is not an official Vendure release.

## Install after publication

Install under the original dependency key so Vendure's internal package resolution and your existing imports continue working:

```sh
npm install --save-exact @vendure/dashboard@npm:@argysolutions/vendure-dashboard@3.7.3-argysolutions.1
```

Use compatible Vendure core/common 3.7.3 packages. Import the plugin from `@vendure/dashboard/plugin` and the Vite integration from `@vendure/dashboard/vite`. Rebuild your dashboard after installation. Do not install a second copy under the custom name.

The package preserves upstream login attribution, user-menu links and browser metadata. Login and theme extensions remain supported. An existing toolbar extension with ID `argysolutions-service-brand` suppresses the built-in wordmark to avoid duplication.

This contains only the dashboard and its Vendure plugin, not a configured storefront, Mercado Pago integration, database or hosting service. The upstream root TypeScript declaration limitation in 3.7.3 remains; this release does not repair the broader upstream typing surface.

## Source and license

Source: https://github.com/MatiasMinoni/vendure/tree/argysolutions-3.7.3

The package's `gitHead` identifies its source commit. Original copyright and license files are included. This fork is distributed under GPL-3.0-or-later, including the upstream additional permissions described in `LICENSE.md`. No commercial Vendure license is granted by this fork.
