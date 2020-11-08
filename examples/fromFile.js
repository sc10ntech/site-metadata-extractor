import fs from 'fs';
import path from 'path';
import extractLinkMetadata from '../dist/index';

const getMetadataFromFile = (filename) => {
  const filepath = path.resolve(
    __dirname,
    `../tests/fixtures/test_${filename}.html`
  );
  const markup = fs.readFileSync(filepath).toString();
  const metadata = extractLinkMetadata(markup, 'http://localhost:8080');
  return metadata;
};

getMetadataFromFile('cnbc2');

// node -r esm fromFile.js
