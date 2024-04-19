import * as esbuild from 'esbuild'
import { sentryEsbuildPlugin } from "@sentry/esbuild-plugin"

await esbuild.build({
  entryPoints: ['src/app/app.tsx'],
  sourcemap: true,
  minify: true,
  bundle: true,
  outdir: 'dist/js',
  logLevel: 'info',
  plugins: [
    // Put the Sentry esbuild plugin after all other plugins
    sentryEsbuildPlugin({
      authToken: process.env.SENTRY_AUTH_TOKEN,
      org: "jamie-wong",
      project: "hvac-sim-app",
    }),
  ],
});