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

const extractSiteMetadata = (
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

export default extractSiteMetadata;

// Allow access to document properties with lazy evaluation
export const lazy = (
  html: string,
  resourceUrl: string,
  language = 'en'
): LazyExtractor => {
  const resourceUrlObj = new URL(resourceUrl);
  global.lazyPageData = global.lazyPageData || {};

  return {
    author: () => {
      const doc = getParsedDoc.call(global, html);
      global.lazyPageData.author = extractor.author(doc);
      return global.lazyPageData.author;
    },
    canonicalLink: () => {
      const doc = getParsedDoc.call(global, html);
      global.lazyPageData.canonicalLink = extractor.canonicalLink(
        doc,
        resourceUrl
      );
      return global.lazyPageData.canonicalLink;
    },
    copyright: () => {
      const doc = getParsedDoc.call(global, html);
      global.lazyPageData.copyright = extractor.copyright(doc);
      return global.lazyPageData.copyright;
    },
    date: () => {
      const doc = getParsedDoc.call(global, html);
      global.lazyPageData.date = extractor.date(doc);
      return global.lazyPageData.date;
    },
    description: () => {
      const doc = getParsedDoc.call(global, html);
      global.lazyPageData.description = extractor.description(doc);
      return global.lazyPageData.description;
    },
    favicon: () => {
      const doc = getParsedDoc.call(global, html);
      global.lazyPageData.favicon = extractor.favicon(doc, resourceUrlObj);
      return global.lazyPageData.favicon;
    },
    image: () => {
      const doc = getParsedDoc.call(global, html);
      global.lazyPageData.image = extractor.image(doc);
      return global.lazyPageData.image;
    },
    jsonld: () => {
      const doc = getParsedDoc.call(global, html);
      global.lazyPageData.jsonld = extractor.jsonld(doc);
      return global.lazyPageData.jsonld;
    },
    keywords: () => {
      const doc = getParsedDoc.call(global, html);
      global.lazyPageData.keywords = extractor.keywords(doc);
      return global.lazyPageData.keywords;
    },
    lang: () => {
      const doc = getParsedDoc.call(global, html);
      global.lazyPageData.lang = language || extractor.lang(doc);
      return global.lazyPageData.lang;
    },
    locale: () => {
      const doc = getParsedDoc.call(global, html);
      global.lazyPageData.locale = extractor.locale(doc);
      return global.lazyPageData.locale;
    },
    links() {
      let doc = getParsedDoc.call(global, html);
      const topNode = getTopNode.call(global, doc, this.lang());
      doc = cleaner(doc);
      global.lazyPageData.links = extractor.links(doc, topNode, this.lang());
      return global.lazyPageData.links;
    },
    origin: () => {
      global.lazyPageData.origin = resourceUrlObj.origin;
      return global.lazyPageData.origin;
    },
    publisher: () => {
      const doc = getParsedDoc.call(global, html);
      global.lazyPageData.publisher = extractor.publisher(doc);
      return global.lazyPageData.publisher;
    },
    siteName: () => {
      const doc = getParsedDoc.call(global, html);
      global.lazyPageData.siteName = extractor.siteName(doc);
      return global.lazyPageData.siteName;
    },
    softTitle: () => {
      const doc = getParsedDoc.call(global, html);
      global.lazyPageData.softTitle = extractor.softTitle(doc);
      return global.lazyPageData.softTitle;
    },
    tags: () => {
      const doc = getParsedDoc.call(global, html);
      global.lazyPageData.tags = extractor.tags(doc);
      return global.lazyPageData.tags;
    },
    text() {
      let doc = getParsedDoc.call(global, html);
      doc = cleaner(doc);
      const topNode = getTopNode.call(global, doc, this.lang());
      const textData = extractor.text(doc, topNode, this.lang());
      global.lazyPageData.text = textData;
      return textData;
    },
    title: () => {
      const doc = getParsedDoc.call(global, html);
      global.lazyPageData.title = extractor.title(doc);
      return global.lazyPageData.title;
    },
    type: () => {
      const doc = getParsedDoc.call(global, html);
      global.lazyPageData.type = extractor.type(doc);
      return global.lazyPageData.type;
    },
    videos() {
      let doc = getParsedDoc.call(global, html);
      doc = cleaner(doc);
      const topNode = getTopNode.call(global, doc, this.lang());
      global.lazyPageData.videos = extractor.videos(doc, topNode);
      return global.lazyPageData.videos;
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
  global.topNode = extractor.calculateBestNode(doc, lang);
  return global.topNode;
}
