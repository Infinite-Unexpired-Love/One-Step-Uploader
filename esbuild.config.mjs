import esbuild from "esbuild";
import process from "process";
import builtins from "builtin-modules";
import fs from "fs";
import path from "path";

const prod = process.argv[2] === "production";

const copyStaticFiles = {
  name: "copy-manifest",
  setup(build) {
    build.onEnd(() => {
      const src = path.resolve("manifest.json");
      const dest = path.resolve("build/manifest.json");

      fs.copyFileSync(src, dest);
    });
  },
};

const context = await esbuild.context({
  entryPoints: ["src/main.ts"],
  bundle: true,
  outfile: "build/main.js",
  format: "cjs",
  target: "es2018",
  minify: prod,
  sourcemap: prod ? false : "inline",
  treeShaking: true,
  plugins: [copyStaticFiles],
  external: [
    "obsidian",
    "electron",
    ...builtins,
  ],
});

if (prod) {
  await context.rebuild();
  process.exit(0);
} else {
  await context.watch();
}
