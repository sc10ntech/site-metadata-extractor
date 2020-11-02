/* eslint-disable no-unused-vars */
/* eslint-disable @typescript-eslint/no-unused-vars */
import cheerio from 'cheerio';
import { NewsArticle, Article } from 'schema-dts';
import { URL } from 'url';

import cleaner from './cleaner';
import extractor, { LinkObj, VideoAttrs } from './extractor';

export interface PageData {
  author: string[];
  canonicalLink: string;
  copyright: string;
  date: string;
  description: string;
  favicon: string;
  image: string;
  jsonld: NewsArticle | Article | null;
  keywords: string;
  lang: string;
  links?: LinkObj[];
  locale: string;
  origin: string;
  publisher: string;
  siteName: string;
  softTitle: string;
  tags: string[];
  text?: string;
  title: string;
  type: string;
  videos?: VideoAttrs[];
}

export interface LazyExtractor {
  author: () => string[];
  canonicalLink: () => string;
  copyright: () => string;
  date: () => string;
  description: () => string;
  favicon: () => string;
  image: () => string;
  jsonld: () => NewsArticle | Article | null;
  keywords: () => string;
  lang: () => string;
  links: () => LinkObj[];
  locale: () => string;
  origin: () => string;
  publisher: () => string;
  siteName: () => string;
  softTitle: () => string;
  tags: () => string[];
  text: () => string;
  title: () => string;
  type: () => string;
  videos: () => VideoAttrs[];
}

const extractLinkMetadata = (
  markup: string,
  resourceUrl: string,
  lang = 'en'
): PageData => {
  const resourceUrlObj = new URL(resourceUrl);
  const doc = cheerio.load(markup, { xmlMode: true });
  const language = lang || extractor.lang(doc);

  const pageData: PageData = {
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
export const lazy = (
  html: string,
  resourceUrl: string,
  language = 'en'
): LazyExtractor => {
  const resourceUrlObj = new URL(resourceUrl);

  return {
    author: () => {
      const doc = getParsedDoc.call(global, html);
      global.pageData.author = extractor.author(doc);
      return global.pageData.author;
    },
    canonicalLink: () => {
      const doc = getParsedDoc.call(global, html);
      global.pageData.canonicalLink = extractor.canonicalLink(doc, resourceUrl);
      return global.pageData.canonicalLink;
    },
    copyright: () => {
      const doc = getParsedDoc.call(global, html);
      global.pageData.copyright = extractor.copyright(doc);
      return global.pageData.copyright;
    },
    date: () => {
      const doc = getParsedDoc.call(global, html);
      global.pageData.date = extractor.date(doc);
      return global.pageData.date;
    },
    description: () => {
      const doc = getParsedDoc.call(global, html);
      global.pageData.description = extractor.description(doc);
      return global.pageData.description;
    },
    favicon: () => {
      const doc = getParsedDoc.call(global, html);
      global.pageData.favicon = extractor.favicon(doc, resourceUrlObj);
      return global.pageData.favicon;
    },
    image: () => {
      const doc = getParsedDoc.call(global, html);
      global.pageData.image = extractor.image(doc);
      return global.pageData.image;
    },
    jsonld: () => {
      const doc = getParsedDoc.call(global, html);
      global.pageData.jsonld = extractor.jsonld(doc);
      return global.pageData.jsonld;
    },
    keywords: () => {
      const doc = getParsedDoc.call(global, html);
      global.pageData.keywords = extractor.keywords(doc);
      return global.pageData.keywords;
    },
    lang: () => {
      const doc = getParsedDoc.call(global, html);
      global.pageData.lang = language || extractor.lang(doc);
      return global.pageData.lang;
    },
    locale: () => {
      const doc = getParsedDoc.call(global, html);
      global.pageData.locale = extractor.locale(doc);
      return global.pageData.locale;
    },
    links() {
      if (!global.pageData.links) {
        const doc = getParsedDoc.call(global, html);
        const topNode = getTopNode.call(global, doc, this.lang());
        global.pageData.links = extractor.links(doc, topNode, this.lang());
        return global.pageData.links;
      }
      return [];
    },
    origin: () => {
      global.pageData.origin = resourceUrlObj.origin;
      return global.pageData.origin;
    },
    publisher: () => {
      const doc = getParsedDoc.call(global, html);
      global.pageData.publisher = extractor.publisher(doc);
      return global.pageData.publisher;
    },
    siteName: () => {
      const doc = getParsedDoc.call(global, html);
      global.pageData.siteName = extractor.siteName(doc);
      return global.pageData.siteName;
    },
    softTitle: () => {
      const doc = getParsedDoc.call(global, html);
      global.pageData.softTitle = extractor.softTitle(doc);
      return global.pageData.softTitle;
    },
    tags: () => {
      const doc = getParsedDoc.call(global, html);
      global.pageData.tags = extractor.tags(doc);
      return global.pageData.tags;
    },
    text() {
      if (!global.pageData.text) {
        const doc = getParsedDoc.call(global, html);
        const topNode = getTopNode.call(global, doc, this.lang());
        global.pageData.text = extractor.text(doc, topNode, this.lang());
        return global.pageData.text;
      }
      return '';
    },
    title: () => {
      const doc = getParsedDoc.call(global, html);
      global.pageData.title = extractor.title(doc);
      return global.pageData.title;
    },
    type: () => {
      const doc = getParsedDoc.call(global, html);
      global.pageData.type = extractor.type(doc);
      return global.pageData.type;
    },
    videos() {
      if (!global.pageData.videos) {
        const doc = getParsedDoc.call(global, html);
        const topNode = getTopNode.call(global, doc, this.lang());
        global.pageData.videos = extractor.videos(doc, topNode);
        return global.pageData.videos;
      }
      return [];
    }
  };
};

function getCleanedDoc(html: string): cheerio.Root {
  if (!global.cleanedDoc) {
    const doc = getParsedDoc.call(global, html);
    global.cleanedDoc = cleaner(doc);
  }
  return global.cleanedDoc;
}

function getParsedDoc(html: string): cheerio.Root {
  return (global.doc = cheerio.load(html));
}

function getTopNode(doc: cheerio.Root, lang: string): cheerio.Cheerio {
  return (global.topNode = extractor.calculateBestNode(doc, lang));
}
