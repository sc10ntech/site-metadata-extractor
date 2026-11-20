# Site Metadata Extractor

Cleans and extracts a web(site) resource's metadata.

## Development verification

Use Node.js 22 or 24 for the current development toolchain. Run `npm ci`,
`npm run lint`, `npm run build`, `npm test -- --runInBand` and
`npm run test:package`. The package smoke check verifies the built entry point
used by consumers; tests importing TypeScript source do not cover that boundary.
Dependency maintenance keeps ESLint and its TypeScript plugins compatible,
without changing the extraction API.

November 20 maintenance audit: compatible lockfile updates patch Undici to
6.29.1 inside the release tooling and update ESLint, its TypeScript plugins and
Prettier. The production audit is clean. The full audit reports 52 moderate
entries, including dependent packages, from
[Glob](https://github.com/advisories/GHSA-3g3m-2fjr-6pw4) and
[Minimatch](https://github.com/advisories/GHSA-g3hv-75wg-m249) in the development
toolchain. No high or critical findings remain. These counts do not establish
that an application path is exploitable. Revisit when Jest, TypeDoc and the
release tooling support patched dependency versions; do not force incompatible
overrides or npm's proposed major downgrades to clear the count.

Semantic Release stays on version 25: proposed version 26.0.1 requires Node
26.13 or newer, which is incompatible with this repository's Node 22/24 CI.
The lockfile update passes lint, build, 120 tests and the built-package smoke
check on Node 24.22.3. Release behavior and the extraction API are unchanged.

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
