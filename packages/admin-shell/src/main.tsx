import { createAllmaAdminApp } from './createAllmaAdminApp';

// This is the main entry point for the distributable `@allma/admin-shell` package.
// When a consumer builds their application, this file is executed.
// It initializes the shell with an empty set of plugins. The consumer's
// own entry point (e.g., in `examples/basic-deployment`) will then import
// this shell and provide the actual plugins.
createAllmaAdminApp({
  plugins: [],
});
