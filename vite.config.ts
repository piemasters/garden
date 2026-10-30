import { defineConfig, lazyPlugins } from "vite-plus";
import { devtools } from "@tanstack/devtools-vite";

import { tanstackStart } from "@tanstack/react-start/plugin/vite";

import netlify from "@netlify/vite-plugin-tanstack-start";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const config = defineConfig({
  fmt: {
    ignorePatterns: ["src/routeTree.gen.ts"],
  },
  lint: {
    ignorePatterns: ["src/routeTree.gen.ts"],
    jsPlugins: [{ name: "vite-plus", specifier: "vite-plus/oxlint-plugin" }],
    rules: { "vite-plus/prefer-vite-plus-imports": "error" },
    options: { typeAware: true, typeCheck: true },
  },
  resolve: { tsconfigPaths: true },
  // Bundle three into server output. Its CommonJS entry require()s an ES module, which crashes the Netlify function.
  ssr: {
    noExternal: ["three", "@react-three/fiber", "@react-three/drei"],
  },
  plugins: lazyPlugins(() => [
    devtools({
      consolePiping: { enabled: false },
      injectSource: {
        enabled: true,
        ignore: {
          // React Three Fiber reads dashed props as object paths. data-tsd-source
          // is written onto the 3D object, and the next update throws.
          files: [/\/components\/designer\/scene\//],
        },
      },
    }),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
    netlify({ dev: { edgeFunctions: { enabled: false } } }),
  ]),
});

export default config;
