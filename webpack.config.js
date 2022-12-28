const path = require('path');

// The way we're adding logic to the existing webpack hooks
// is by using the `tap` method, which has this signature:
// `tap(string, callback)`
// where `string` is mainly for debugging purposes, indicating
// the source where the custom logic has been added from.
// The `callback`'s argument depend on the hook on which we're adding custom functionality.

class UnderstandingModuleGraphPlugin {
  apply(compiler) {
    const className = this.constructor.name;
    // Onto the `compilation` object: it is where most of the *state* of
    // the bundling process is kept. It contains information such as the module graph,
    // the chunk graph, the created chunks, the created modules, the generated assets
    // and much more.
    compiler.hooks.compilation.tap(className, (compilation) => {
      // The `finishModules` is called after *all* the modules(including
      // their dependencies and the dependencies' dependencies and so forth)
      // have been built.
      compilation.hooks.finishModules.tap(className, (modules) => {
        // `modules` is the set which contains all the built modules.
        // These are simple `NormalModule` instances. Once again, a `NormalModule`
        // is produced by the `NormalModuleFactory`.
        // console.log(modules);

        // Retrieving the **module map**(Map<Module, ModuleGraphModule>).
        // It contains all the information we need in order to traverse the graph.
        const {
          moduleGraph: { _moduleMap: moduleMap },
        } = compilation;

        // Let's traverse the module graph in a DFS fashion.
        const dfs = () => {
          // Recall that the root module of the `ModuleGraph` is the
          // *null module*.
          const root = null;

          const visited = new Map();

          const traverse = (crtNode) => {
            if (visited.get(crtNode)) {
              return;
            }
            visited.set(crtNode, true);

            console.log(
              crtNode?.resource ? path.basename(crtNode?.resource) : `ROOT `
            );

            // Getting the associated `ModuleGraphModule`, which only has some extra
            // properties besides a `NormalModule` that we can use to traverse the graph further.
            const correspondingGraphModule = moduleMap.get(crtNode);

            // A `Connection`'s `originModule` is the where the arrow starts
            // and a `Connection`'s `module` is there the arrow ends.
            // So, the `module` of a `Connection` is a child node.
            // Here you can find more about the graph's connection: https://github.com/webpack/webpack/blob/main/lib/ModuleGraphConnection.js#L53.
            // `correspondingGraphModule.outgoingConnections` is either a Set or undefined(in case the node has no children).
            // We're using `new Set` because a module can be reference the same module through multiple connections.
            // For instance, an `import foo from 'file.js'` will result in 2 connections: one for a simple import
            // and one for the `foo` default specifier. This is an implementation detail which you shouldn't worry about.
            const children = new Set(
              Array.from(
                correspondingGraphModule.outgoingConnections || [],
                (c) => c.module
              )
            );
            for (const c of children) {
              traverse(c);
            }
          };

          // Starting the traversal.
          traverse(root);
        };

        dfs();
      });
    });
  }
}

/**
 * @type {import("webpack/types").Configuration}
 */
const config = {
  entry: path.resolve(__dirname, './src/a.js'),

  output: {
    path: path.resolve(__dirname, 'dist'),
    clean: true,
  },

  mode: 'none',

  plugins: [new UnderstandingModuleGraphPlugin()],
};

module.exports = config;
