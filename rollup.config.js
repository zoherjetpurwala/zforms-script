import typescript from '@rollup/plugin-typescript'
import { nodeResolve } from '@rollup/plugin-node-resolve'
import terser from '@rollup/plugin-terser'

export default {
  input: 'src/script.ts',
  output: [
    {
      file: './public/zForm.min.js',
      format: 'iife',
      name: 'zForm',
      sourcemap: true,
      plugins: [
        terser({
          compress: {
            drop_console: true,
            dead_code: true,
            unused: true,
          },
          mangle: {
            properties: {
              regex: /^_/,
            },
          },
          format: {
            comments: false,
          },
        }),
      ],
    },
  ],
  plugins: [
    nodeResolve(),
    typescript({
      tsconfig: './tsconfig.json',
    }),
  ],
}
