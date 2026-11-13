import * as esbuild from 'esbuild';

await esbuild.build({
  logLevel: 'info',
  entryPoints: ['src/index.ts'],
  bundle: true,
  platform: 'node',
  sourcemap: 'inline',
  outdir: 'dist',
  format: 'esm',
  packages: 'external',
  // es2022 lowers the TC39 decorators (@Guarded, @Public): Node cannot parse them
  target: 'es2022',
});

await esbuild.build({
  logLevel: 'info',
  entryPoints: ['src/es-migrations/**.js', 'src/es-migrations/**.ts'],
  bundle: true,
  platform: 'node',
  sourcemap: 'inline',
  outdir: 'dist/src/es-migrations',
  format: 'esm',
  packages: 'external',
  target: 'es2022',
});
