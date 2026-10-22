# Site Metadata Extractor

Cleans and extracts a web(site) resource's metadata.

## Development verification

Use Node.js 22 or 24 for the current development toolchain. Run `npm ci`,
`npm run lint`, `npm run build`, `npm test -- --runInBand` and
`npm run test:package`. The package smoke check verifies the built entry point
used by consumers; tests importing TypeScript source do not cover that boundary.
Dependency maintenance keeps ESLint and its TypeScript plugins compatible,
without changing the extraction API.

October 21 maintenance audit: the development toolchain still includes
[braces](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) and
[sprintf-js](https://github.com/advisories/GHSA-hp3w-g68c-fv3c) denial-of-service
advisories. The full audit reports their transitive dependents as well. Do not
apply npm's proposed major downgrades of Jest/semantic-release to clear the count;
revisit when compatible patched upstream packages are available.

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

## Development

1. Run: `git clone https://github.com/sc10ntech/site-metadata-extractor.git`
2. Change into project directory and install deps: `cd site-metadata-extractor && npm i`

## Creids & Disclaimer

site-metadata-extractor was inspired by, and tries to be the spiritual successor to [node-unfluff](https://github.com/ageitgey/node-unfluff)
