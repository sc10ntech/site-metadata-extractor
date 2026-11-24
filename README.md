# Site Metadata Extractor

Cleans and extracts a web(site) resource's metadata.

## Development verification

Use Node.js 22.14 or newer in the 22.x line, or Node.js 24.10 or newer.
Run `npm ci`, `npm run semantic-release -- --version`, `npm run lint`,
`npm run build`, `npm test -- --runInBand` and `npm run test:package`.
The release-tool version command checks startup without publishing; CI runs it
on both supported Node versions. The package smoke check verifies the built
entry point used by consumers, which source-only tests do not cover.

### November 24 dependency maintenance

Semantic Release 26.0.1 failed in the release workflow because it requires Node
26.13 or newer. Version 25.0.9 restores compatibility with this repository's
Node 22/24 toolchain. Dependabot proposals for version 26 and later are deferred
until a deliberate Node/toolchain upgrade. A new CI startup check prevents this
engine mismatch from passing unnoticed again. Actual publication is verified
separately by the release workflow after merge.

Compatible Glob updates install 13.0.7 and 14.0.6 where existing parent ranges
allow them. These address the
[aborted traversal advisory](https://github.com/advisories/GHSA-3g3m-2fjr-6pw4)
on those paths. The advisory range still includes Glob 13.0.7, so the audit
continues to flag it despite its source fix. Older copies also remain inside
npm and test-exclude.

The production dependency audit reports zero findings. The full audit reports
52 moderate entries, including affected dependent packages, and no high or
critical findings. Main before this repair had 35 moderate entries: returning
to the compatible release tool changes the dependency tree and increases the
number of affected dependent-package entries. Counts are
not independent vulnerabilities or proof of an exploitable application path.
The previously patched Undici versions remain in place.

[Minimatch's denial-of-service advisory](https://github.com/advisories/GHSA-g3hv-75wg-m249)
remains unresolved in the development toolchain. Crafted glob patterns can cause
excessive CPU/memory use when optimization level 2 is enabled. Glob enables that
mode; Jest and npm use Glob. The extractor's production dependency graph does
not include Minimatch. Project-controlled test patterns reduce exposure, but
this does not prove that every development/release input is trusted.

The first patched Minimatch is 11.0.1. Current Jest, test-exclude, TypeDoc and
npm releases still require or bundle affected older versions. A blanket override
is incompatible: [Minimatch 11 removes APIs](https://github.com/isaacs/minimatch/compare/v10.2.6...v11.0.0)
used by Glob 13 and [TypeDoc's file traversal](https://github.com/TypeStrong/typedoc/blob/v0.28.20/src/lib/utils/fs.ts).
Do not dismiss the alert or force that override. Revisit when these parent tools
adopt compatible patched dependencies, including npm's bundled dependencies,
or when a compatible backport becomes available.

Verification on Node 24.22.3: clean install, lint, build, all 120 tests, coverage and the
built-package smoke check pass. The release-tool startup check also passes on
Node 22.22.0. This fixes the observed startup failure; it is not evidence of a
successful package publication. The extraction API is unchanged.

Metadata extraction fields currently supported:

| Name                     | Data Type      |
| ------------------------ | -------------- |
| author                   | array (jsonb)  |
| canonical_url            | string         |
| copyright                | string         |
| date (publish date)      | date           |
| description              | text           |
| favicon                  | text           |
| image (primary/og image) | text           |
| jsonld (structured data) | object (jsonb) |
| keywords                 | array (jsonb)  |
| lang                     | string         |
| locale                   | string         |
| origin                   | string         |
| publisher                | string         |
| site_name                | string         |
| tags                     | array (jsonb)  |
| title                    | string         |
| type                     | string         |
| truncated_text           | text           |
| status                   | string         |
| videos                   | array (jsonb)  |
| links                    | array (jsonb)  |

## Install

NPM:

```bash
$ npm install site-metadata-extractor --save
```

Yarn:

```bash
$ yarn add site-metadata-extractor
```

## Usage

Feed in a raw markup from a webpage to get extracted metadata fields.

### Modern typed API

The typed API is additive. The default export remains available for existing
callers, while new callers can pass already-fetched public HTML into:

```ts
import {
  extractFromHtml,
  extractMetadataOnly,
  extractLazy,
  type ExtractedResource,
} from "site-metadata-extractor";

const resource: ExtractedResource = extractFromHtml(html, {
  inputUrl: "https://example.com/requested-url",
  finalUrl: "https://example.com/final-url",
  lang: "en",
});
```

This package does not fetch network resources. Fetch HTML in the calling
application, apply any SSRF/private-network protections there, then pass the
HTML string into the extractor.

`extractFromHtml(html, options)` returns stable typed output for ingestion:

- URL fields: `inputUrl`, `finalUrl`, `canonicalUrl`, `normalizedUrl`, `domain`
- metadata: `title`, `softTitle`, `description`, `author`, `publisher`,
  `siteName`, `lang`, `locale`, `publishedAt`, `modifiedAt`
- assets: `faviconCandidates`, `imageCandidates`, `primaryImage`
- structured/raw data: `jsonld`, `rawMeta`
- content: `links`, `videos`, `readableText`, `textStats`
- extraction metadata: `extraction.packageVersion`,
  `extraction.strategyVersion`, `extraction.warnings`, `extraction.confidence`

`extractMetadataOnly(html, options)` returns the same shape but skips readable
text, link, and video extraction.

`extractLazy(html, options)` uses instance-local caches and exposes:
`metadata()`, `readableText()`, `links()`, `videos()`, and `extract()`.

Exported output types include `ExtractedResource`, `AssetCandidate`,
`ExtractedLink`, `ExtractedVideo`, `TextStats`, and `ExtractionMetadata`.

Migration note: the legacy default export still returns the historical field
names such as `canonicalLink`, `favicon`, `image`, and `text`. New integrations
should prefer `extractFromHtml` so candidate URLs are resolved against
`finalUrl`/`inputUrl`, JSON-LD is always an array, oversized metadata is bounded,
and malformed JSON-LD is reported in `extraction.warnings` instead of being
logged.

**From `.html` file:**

```js
import fs from "fs";
import siteMetadataExtractor from "site-metadata-extractor";

const getMetadataFromFile = (filename) => {
  const filepath = path.resolve(__dirname, `../data/${filename}.html`);
  const markup = fs.readFileSync(filepath).toString();
  // feel free to use localhost as the second parameter for testing
  const metadata = siteMetadataExtractor(markup, "YOUR_SITE_ORIGIN_HERE");
  return metadata;
};

getMetadataFromFile("example");
```

**From a server request:**

```js
import axios from 'axios';
import siteMetadataExtractor from 'site-metadata-extractor';

const processSite = async (url) => {
  return axios.get(url, config = {})
    .then(res => {
      const { headers } = res;
      const contentType = headers['content-type'];
      if (contentType.includes('text/html')) {
        return {
          body: res.data,
          url
        };
      } else {
        return {};
      }
    })
    .catch(err => {
      console.log(err);
    });
};

processSite('https://www.cnbc.com/guide/personal-finance-101-the-complete-guide-to-managing-your-money/`)
	.then((data) => {
		...
    siteMetadataExtractor(data, "https://www.cnbc.com/guide/personal-finance-101-the-complete-guide-to-managing-your-money/", "en");
    ...
	});
```

## Readable text and structured metadata

The `2026-10-21.cheerio-v3` strategy preserves `html`, `body` and `main` when
layout attributes contain noise terms such as `tools`. Descendant noise removal
and inert-text handling remain in place. Missing title, description, author,
publisher and dates can fall back to one page entity in JSON-LD, including
first-level `@graph` records. Explicit HTML metadata takes precedence. Embedded
names are supported; arbitrary `@id` reference resolution is not implemented.
Ambiguous page entities do not get merged. This is heuristic extraction, not a
complete visual-page archive, and it does not execute JavaScript or fetch URLs.

A sole entity explicitly identifying another page is also ignored. A sole entity
without a page identifier can supply missing metadata; multiple matching entities
remain ambiguous. The strategy version changes when these selection rules change.

October 21 verification: lint, TypeScript build, 120 tests and the built-package
smoke check pass against the dependencies merged in #936. These source changes
are pending release. Consumers with pinned versions or local patches need a
separately verified package upgrade to receive them.

## Development

1. Run: `git clone https://github.com/sc10ntech/site-metadata-extractor.git`
2. Change into project directory and install deps: `cd site-metadata-extractor && npm i`

## Creids & Disclaimer

site-metadata-extractor was inspired by, and tries to be the spiritual successor to [node-unfluff](https://github.com/ageitgey/node-unfluff)
