// Keeps PLUGIN_VERSION in index.mjs equal to the version in package.json.
// Runs automatically from the npm "version" lifecycle hook, so `npm version patch` updates both.

import { readFileSync, writeFileSync } from "node:fs";

const { version } = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const file = new URL("../index.mjs", import.meta.url);
const source = readFileSync(file, "utf8");

const pattern = /const PLUGIN_VERSION = "[^"]*";/;
if (!pattern.test(source)) {
	throw new Error("Could not find the PLUGIN_VERSION constant in index.mjs");
}

writeFileSync(file, source.replace(pattern, `const PLUGIN_VERSION = "${version}";`));
console.log(`PLUGIN_VERSION set to ${version}`);
