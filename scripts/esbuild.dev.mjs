import * as esbuild from 'esbuild'

let ctx = await esbuild.context({
  entryPoints: ['src/app/app.tsx'],
  define: {
    "process.env.NODE_ENV": '"development"',
  },
  bundle: true,
  sourcemap: true,
  outdir: 'static/js',
  logLevel: 'info',
})

await ctx.watch()

let { host, port } = await ctx.serve({
  servedir: 'static',
  onRequest: (args) => {
    console.log(args.method, args.path, args.timeInMS)
  }
})