/**
 * Entry point for `node backend/server.js` — registers tsx and loads the TypeScript app.
 */
require('tsx/cjs/api').register()
require('./server.ts')
