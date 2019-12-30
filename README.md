# extract-link-metadata

Cleans and extracts a web resource's metadata.

Metadata Extraction Fields:

| Name  | Data Type  |
|---|---|
| author  | array (jsonb)  |
| canonical_url  | string  |
| copyright  | string  |
| date (publish date)  | date  |
| description  | text  |
| favicon  | text  |
| image (primary/og image) | text  |
| jsonld (structured data) | object (jsonb)  |
| keywords  | array (jsonb)  |
| lang  | string  |
| locale  | string  |
| origin  | string  |
| publisher  | string  |
| site_name  | string  |
| tags  | array (jsonb)  |
| title  | string  |
| type  | string  |
| truncated_text  | text  |
| status  | string  |
| videos  | array (jsonb)  |
| links  | array (jsonb)  |


## Usage

This project is really a library that you import into another project. Feed in a raw markup from a webpage to get extracted fields.

## Development

1. Run: `git clone https://github.com/collinwu/extract-link-metadata.git`
2. Change into proj directory and install deps: `cd extract-link-metadata && npm i`


## Releasing

1. Run: `npm run compile`
2. Copy all files from the `build` directory into any project that would like ot leverage the metadata extractor

## Creids & Disclaimer

extract-link-metadata is inspired by and the spiritual successor to [node-unfluff](https://github.com/ageitgey/node-unfluff)
