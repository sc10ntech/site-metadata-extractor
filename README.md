# Extract Site Metadata

Cleans and extracts a web resource's metadata.

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
$ npm install extract-site-metadata --save
```

Yarn:

```bash
$ yarn add extract-site-metadata
```

## Usage

Feed in a raw markup from a webpage to get extracted metadata fields.

**From `.html` file:**

```js
import fs from 'fs';
import extractSiteMetadata from 'extract-site-metadata';

const getMetadataFromFile = (filename) => {
  const filepath = path.resolve(__dirname, `../data/${filename}.html`);
  const markup = fs.readFileSync(filepath).toString();
  // feel free to use localhost as the second parameter for testing
  const metadata = extractLinkMetadata(markup, 'YOUR_SITE_ORIGIN_HERE');
  return metadata;
};

getMetadataFromFile('example');
```

**From a server request:**

```js
import axios from 'axios';
import extractSiteMetadata from 'extract-site-metadata';

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
	});
```

## Development

1. Run: `git clone https://github.com/sc10ntech/extract-site-metadata.git`
2. Change into project directory and install deps: `cd extract-site-metadata && npm i`

## Creids & Disclaimer

extract-site-metadata was inspired by, and tries to be the spiritual successor to [node-unfluff](https://github.com/ageitgey/node-unfluff)
