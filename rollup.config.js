import resolve from '@rollup/plugin-node-resolve';
import malina from 'malinajs/malina-rollup';
import { derver } from 'derver/rollup-plugin';

export default {
  input: 'src/main.js',
  output: {
    file: 'public/bundle.js',
    format: 'iife',
  },
  plugins: [malina(), resolve(), derver()],
};
