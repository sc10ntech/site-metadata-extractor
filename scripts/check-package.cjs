// Exercise the built package entry point; source-import tests cannot catch its layout.
const assert = require("node:assert/strict");
const { extractFromHtml } = require("..");
const { version } = require("../package.json");
const result = extractFromHtml("<html><head><title>Package smoke</title></head><body><p>Example content.</p></body></html>");
assert.equal(result.title, "Package smoke");
assert.equal(result.extraction.packageVersion, version);
console.log("Built package entry point passed.");
