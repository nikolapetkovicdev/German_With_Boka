const path = require('path');
const {defineConfig} = require('vitest/config');

module.exports = defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/**/*.test.ts']
  },
  resolve: {
    alias: {'@': path.resolve(__dirname)}
  }
});
