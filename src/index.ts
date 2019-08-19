import cheerio from 'cheerio';
import DOMPurify from 'dompurify';

import cleaner from './cleaner';
import extractor from './extractor';

const extractLinkMetadata = (markup: string, lang: string) => {
  const doc = cheerio.load(markup);
  const language = lang;

  const pageData: any = {
    author: extractor.author(doc),
    canonicalLink: extractor.canonicalLink(doc),
    copyright: extractor.copyright(doc),
    date: extractor.date(doc),
    description: extractor.description(doc),
    favicon: extractor.favicon(doc),
    image: extractor.image(doc),
    keywords: extractor.keywords(doc),
    lang: language,
    publisher: extractor.publisher(doc),
    softTitle: extractor.softTitle(doc),
    tags: extractor.tags(doc),
    title: extractor.title(doc)
  };

  // Step 1: Clean the doc
  cleaner(doc);

  // Step 2: Find the doc node with the best text
  const topNode = extractor.calculateBestNode(doc, language);

  // Step 3: Extract text ,videos, images, link
  pageData.videos = extractor.videos(doc, topNode);
  pageData.links = extractor.links(doc, topNode, language);
  pageData.text = extractor.text(doc, topNode, language);

  return pageData;
};

export default extractLinkMetadata;

// Allow access to document properties with lazy evaluation
export const lazy = (html, language) => {
  return {
    author: () => {
      const doc = getParsedDoc.call(global, html);
      global.author = extractor.author(doc);
    },
    canonicalLink: () => {
      const doc = getParsedDoc.call(global, html);
      global.canonicalLink = extractor.canonicalLink(doc);
    },
    copyright: () => {
      const doc = getParsedDoc.call(global, html);
      global.copyright = extractor.copyright(doc);
    },
    date: () => {
      const doc = getParsedDoc.call(global, html);
      global.date = extractor.date(doc);
    },
    description: () => {
      const doc = getParsedDoc.call(global, html);
      global.description = extractor.description(doc);
    },
    favicon: () => {
      const doc = getParsedDoc.call(global, html);
      global.favicon = extractor.favicon(doc);
    },
    image: () => {
      const doc = getParsedDoc.call(global, html);
      global.image = extractor.image(doc);
    },
    keywords: () => {
      const doc = getParsedDoc.call(global, html);
      global.keywords = extractor.keywords(doc);
    },
    lang: () => {
      const doc = getParsedDoc.call(global, html);
      global.lang = language || extractor.lang(doc);
    },
    links: () => {
      if (!global.links) {
        const doc = getParsedDoc.call(global, html);
        const topNode = getTopNode.call(global, doc, this.lang());
        global.links = extractor.links(doc, topNode, this.lang());
      }
    },
    publisher: () => {
      const doc = getParsedDoc.call(global, html);
      global.publisher = extractor.publisher(doc);
    },
    softTitle: () => {
      const doc = getParsedDoc.call(global, html);
      global.softTitle = extractor.softTitle(doc);
    },
    tags: () => {
      const doc = getParsedDoc.call(global, html);
      global.tags = extractor.tags(doc);
    },
    text: () => {
      if (!global.text) {
        const doc = getParsedDoc.call(global, html);
        const topNode = getTopNode.call(global, doc, this.lang());
        global.text = extractor.text(doc, topNode, this.lang());
      }
    },
    title: () => {
      const doc = getParsedDoc.call(global, html);
      global.title = extractor.title(doc);
    },
    videos: () => {
      if (!global.videos) {
        const doc = getParsedDoc.call(global, html);
        const topNode = getTopNode.call(global, doc, this.lang());
        global.videos = extractor.videos(doc, topNode);
      }
    }
  };
};

function getCleanedDoc(html) {
  if (!global.cleanedDoc) {
    const doc = getParsedDoc.call(global, html);
    global.cleanedDoc = cleaner(doc);
  }
  return global.cleanedDoc;
}

function getParsedDoc(html) {
  global.doc = cheerio.load(html);
}

function getTopNode(doc, lang) {
  global.topNode = extractor.calculateBestNode(doc, lang);
}
