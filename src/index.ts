import cheerio from 'cheerio';
import { URL } from 'url';

import cleaner from './cleaner';
import extractor from './extractor';

const extractLinkMetadata = (
  markup: string,
  resourceUrl: string,
  lang: string = 'en'
) => {
  const resourceUrlObj = new URL(resourceUrl);
  const doc = cheerio.load(markup, { xmlMode: true });
  const language = lang || extractor.lang(doc);

  const pageData: any = {
    author: extractor.author(doc),
    canonicalLink: extractor.canonicalLink(doc, resourceUrl),
    copyright: extractor.copyright(doc),
    date: extractor.date(doc),
    description: extractor.description(doc),
    favicon: extractor.favicon(doc, resourceUrlObj),
    image: extractor.image(doc),
    jsonld: extractor.jsonld(doc),
    keywords: extractor.keywords(doc),
    lang: language,
    locale: extractor.locale(doc),
    origin: resourceUrlObj.origin,
    publisher: extractor.publisher(doc),
    siteName: extractor.siteName(doc),
    softTitle: extractor.softTitle(doc),
    tags: extractor.tags(doc),
    title: extractor.title(doc),
    type: extractor.type(doc)
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
export const lazy = (html: any, resourceUrl: string, language: string) => {
  const resourceUrlObj = new URL(resourceUrl);

  return {
    author: () => {
      const doc = getParsedDoc.call(global, html);
      global.author = extractor.author(doc);
      return global.author;
    },
    canonicalLink: () => {
      const doc = getParsedDoc.call(global, html);
      global.canonicalLink = extractor.canonicalLink(doc, resourceUrl);
      return global.canonicalLink;
    },
    copyright: () => {
      const doc = getParsedDoc.call(global, html);
      global.copyright = extractor.copyright(doc);
      return global.copyright;
    },
    date: () => {
      const doc = getParsedDoc.call(global, html);
      global.date = extractor.date(doc);
      return global.date;
    },
    description: () => {
      const doc = getParsedDoc.call(global, html);
      global.description = extractor.description(doc);
      return global.description;
    },
    favicon: () => {
      const doc = getParsedDoc.call(global, html);
      global.favicon = extractor.favicon(doc, resourceUrlObj);
      return global.favicon;
    },
    image: () => {
      const doc = getParsedDoc.call(global, html);
      global.image = extractor.image(doc);
      return global.image;
    },
    jsonld: () => {
      const doc = getParsedDoc.call(global, html);
      global.jsonld = extractor.jsonld(doc);
      return global.jsonld;
    },
    keywords: () => {
      const doc = getParsedDoc.call(global, html);
      global.keywords = extractor.keywords(doc);
      return global.keywords;
    },
    lang: () => {
      const doc = getParsedDoc.call(global, html);
      global.lang = language || extractor.lang(doc);
      return global.lang;
    },
    locale: () => {
      const doc = getParsedDoc.call(global, html);
      global.locale = extractor.locale(doc);
      return global.locale;
    },
    links() {
      if (!global.links) {
        const doc = getParsedDoc.call(global, html);
        const topNode = getTopNode.call(global, doc, this.lang());
        global.links = extractor.links(doc, topNode, this.lang());
        return global.links;
      }
    },
    origin: () => {
      global.originUrl = resourceUrlObj.origin;
      return global.originUrl;
    },
    publisher: () => {
      const doc = getParsedDoc.call(global, html);
      global.publisher = extractor.publisher(doc);
      return global.publisher;
    },
    siteName: () => {
      const doc = getParsedDoc.call(global, html);
      global.siteName = extractor.siteName(doc);
      return global.siteName;
    },
    softTitle: () => {
      const doc = getParsedDoc.call(global, html);
      global.softTitle = extractor.softTitle(doc);
      return global.softTitle;
    },
    tags: () => {
      const doc = getParsedDoc.call(global, html);
      global.tags = extractor.tags(doc);
      return global.tags;
    },
    text() {
      if (!global.text) {
        const doc = getParsedDoc.call(global, html);
        const topNode = getTopNode.call(global, doc, this.lang());
        global.text = extractor.text(doc, topNode, this.lang());
        return global.text;
      }
    },
    title: () => {
      const doc = getParsedDoc.call(global, html);
      global.title = extractor.title(doc);
      return global.title;
    },
    type: () => {
      const doc = getParsedDoc.call(global, html);
      global.type = extractor.type(doc);
      return global.type;
    },
    videos() {
      if (!global.videos) {
        const doc = getParsedDoc.call(global, html);
        const topNode = getTopNode.call(global, doc, this.lang());
        global.videos = extractor.videos(doc, topNode);
        return global.videos;
      }
    }
  };
};

function getCleanedDoc(html: any) {
  if (!global.cleanedDoc) {
    const doc = getParsedDoc.call(global, html);
    global.cleanedDoc = cleaner(doc);
  }
  return global.cleanedDoc;
}

function getParsedDoc(html: any) {
  global.doc = cheerio.load(html);
}

function getTopNode(doc: any, lang: any) {
  global.topNode = extractor.calculateBestNode(doc, lang);
}
