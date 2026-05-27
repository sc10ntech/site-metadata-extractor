/* eslint-disable no-unused-vars */
/* eslint-disable @typescript-eslint/no-unused-vars */
import * as cheerio from "cheerio";
import type { Cheerio, CheerioAPI, CheerioOptions } from "cheerio";
import type { AnyNode, Element } from "domhandler";
import { NewsArticle, Article } from "schema-dts";
import { URL } from "url";

import cleaner from "./cleaner";
import extractor, { LinkObj, VideoAttrs } from "./extractor";

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

export interface ExtractOptions {
  inputUrl?: string;
  finalUrl?: string;
  lang?: string;
  maxStringLength?: number;
  maxCandidates?: number;
  maxReadableTextLength?: number;
}

export interface AssetCandidate {
  url: string;
  source: string;
  rel?: string;
  type?: string;
  sizes?: string;
  width?: number;
  height?: number;
  alt?: string;
}

export interface ExtractedLink {
  url: string;
  text: string;
  rel?: string;
  title?: string;
}

export interface ExtractedVideo {
  url: string;
  source: string;
  width?: number;
  height?: number;
  type?: string;
}

export interface TextStats {
  charCount: number;
  wordCount: number;
  sentenceCount: number;
  truncated: boolean;
}

export interface ExtractionMetadata {
  packageVersion: string;
  strategyVersion: string;
  warnings: string[];
  confidence: number;
}

export interface ExtractedResource {
  inputUrl: string;
  finalUrl: string;
  canonicalUrl: string;
  normalizedUrl: string;
  domain: string;
  title: string;
  softTitle: string;
  description: string;
  author: string[];
  publisher: string;
  siteName: string;
  lang: string;
  locale: string;
  publishedAt: string;
  modifiedAt: string;
  faviconCandidates: AssetCandidate[];
  imageCandidates: AssetCandidate[];
  primaryImage: AssetCandidate | null;
  jsonld: unknown[];
  rawMeta: Record<string, string[]>;
  links: ExtractedLink[];
  videos: ExtractedVideo[];
  readableText: string;
  textStats: TextStats;
  extraction: ExtractionMetadata;
}

export interface LazyExtractedResource {
  metadata: () => ExtractedResource;
  readableText: () => string;
  links: () => ExtractedLink[];
  videos: () => ExtractedVideo[];
  extract: () => ExtractedResource;
}

const STRATEGY_VERSION = "2026-05-26.cheerio-v1";
const DEFAULT_MAX_STRING_LENGTH = 4096;
const DEFAULT_MAX_CANDIDATES = 25;
const DEFAULT_MAX_READABLE_TEXT_LENGTH = 200000;

const packageVersion = require("../package.json").version as string;

function getTagName(node: Cheerio<AnyNode>): string {
  const element = node.get(0) as Element | undefined;
  return element?.tagName || "";
}

function getBaseUrl(options: ExtractOptions): string {
  return options.finalUrl || options.inputUrl || "";
}

function getUrlParts(url: string): { normalizedUrl: string; domain: string } {
  if (!url) {
    return { normalizedUrl: "", domain: "" };
  }

  try {
    const urlObj = new URL(url);
    urlObj.hash = "";
    return {
      domain: urlObj.hostname,
      normalizedUrl: urlObj.href,
    };
  } catch (_error) {
    return { normalizedUrl: url, domain: "" };
  }
}

function resolveHttpUrl(value: string | undefined, baseUrl: string): string {
  const trimmed = (value || "").trim();
  if (!trimmed) {
    return "";
  }

  try {
    const resolved = baseUrl ? new URL(trimmed, baseUrl) : new URL(trimmed);
    if (resolved.protocol === "http:" || resolved.protocol === "https:") {
      return resolved.href;
    }
  } catch (_error) {
    return "";
  }

  return "";
}

function toNumber(value: string | undefined): number | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function cleanBounded(
  value: string | undefined,
  field: string,
  warnings: string[],
  maxLength: number,
): string {
  const cleaned = (value || "")
    .replace(/[\r\n\t]/g, " ")
    .replace(/\s\s+/g, " ")
    .trim();

  if (cleaned.length > maxLength) {
    warnings.push(`${field} exceeded ${maxLength} characters and was truncated`);
    return cleaned.slice(0, maxLength);
  }

  return cleaned;
}

function pushUniqueCandidate(
  candidates: AssetCandidate[],
  candidate: AssetCandidate,
  maxCandidates: number,
): void {
  if (
    candidate.url &&
    candidates.length < maxCandidates &&
    !candidates.some((existing) => existing.url === candidate.url)
  ) {
    candidates.push(candidate);
  }
}

function getRawMeta(
  doc: CheerioAPI,
  warnings: string[],
  maxLength: number,
): Record<string, string[]> {
  const rawMeta: Record<string, string[]> = {};

  doc("meta").each((_index: number, element: AnyNode) => {
    const meta = doc(element);
    const key =
      meta.attr("property") ||
      meta.attr("name") ||
      meta.attr("itemprop") ||
      meta.attr("http-equiv");
    const content = meta.attr("content");

    if (!key || content === undefined) {
      return;
    }

    const normalizedKey = key.trim().toLowerCase();
    const bounded = cleanBounded(
      content,
      `rawMeta.${normalizedKey}`,
      warnings,
      maxLength,
    );

    if (!rawMeta[normalizedKey]) {
      rawMeta[normalizedKey] = [];
    }
    rawMeta[normalizedKey].push(bounded);
  });

  return rawMeta;
}

function firstMetaValue(
  rawMeta: Record<string, string[]>,
  keys: string[],
): string {
  for (const key of keys) {
    const value = rawMeta[key]?.[0];
    if (value) {
      return value;
    }
  }
  return "";
}

function getDateValue(
  doc: CheerioAPI,
  rawMeta: Record<string, string[]>,
  keys: string[],
): string {
  const metaValue = firstMetaValue(
    rawMeta,
    keys.map((key) => key.toLowerCase()),
  );
  if (metaValue) {
    return metaValue;
  }

  for (const key of keys) {
    const itemprop = key.replace(/^article:/, "");
    const dateElement = doc(`[itemprop='${itemprop}'], [property='${itemprop}']`)
      .first();
    const datetime = dateElement.attr("datetime");
    const content = dateElement.attr("content");
    const text = dateElement.text();
    const value = cleanBounded(content || datetime || text, key, [], 256);
    if (value) {
      return value;
    }
  }

  return "";
}

function getFaviconCandidates(
  doc: CheerioAPI,
  baseUrl: string,
  maxCandidates: number,
): AssetCandidate[] {
  const candidates: AssetCandidate[] = [];

  doc("link").each((_index: number, element: AnyNode) => {
    const link = doc(element);
    const rel = (link.attr("rel") || "").toLowerCase();
    if (!/\b(icon|apple-touch-icon|mask-icon)\b/.test(rel)) {
      return;
    }

    const url = resolveHttpUrl(link.attr("href"), baseUrl);
    pushUniqueCandidate(
      candidates,
      {
        rel,
        sizes: link.attr("sizes"),
        source: "link",
        type: link.attr("type"),
        url,
      },
      maxCandidates,
    );
  });

  if (candidates.length === 0) {
    const fallback = resolveHttpUrl("/favicon.ico", baseUrl);
    pushUniqueCandidate(
      candidates,
      { rel: "icon", source: "default", url: fallback },
      maxCandidates,
    );
  }

  return candidates;
}

function getImageCandidates(
  doc: CheerioAPI,
  baseUrl: string,
  maxCandidates: number,
): AssetCandidate[] {
  const candidates: AssetCandidate[] = [];
  const metaSelectors = [
    "meta[property='og:image']",
    "meta[property='og:image:url']",
    "meta[property='og:image:secure_url']",
    "meta[name='twitter:image']",
    "meta[name='twitter:image:src']",
    "meta[itemprop='image']",
  ];

  metaSelectors.forEach((selector) => {
    doc(selector).each((_index: number, element: AnyNode) => {
      const meta = doc(element);
      const url = resolveHttpUrl(meta.attr("content"), baseUrl);
      pushUniqueCandidate(
        candidates,
        {
          source:
            meta.attr("property") || meta.attr("name") || meta.attr("itemprop") || "meta",
          url,
        },
        maxCandidates,
      );
    });
  });

  doc("link[rel='image_src']").each((_index: number, element: AnyNode) => {
    const link = doc(element);
    const url = resolveHttpUrl(link.attr("href"), baseUrl);
    pushUniqueCandidate(
      candidates,
      { rel: "image_src", source: "link", url },
      maxCandidates,
    );
  });

  doc("img").each((_index: number, element: AnyNode) => {
    const img = doc(element);
    const url = resolveHttpUrl(
      img.attr("src") || img.attr("data-src") || img.attr("data-original"),
      baseUrl,
    );
    pushUniqueCandidate(
      candidates,
      {
        alt: img.attr("alt"),
        height: toNumber(img.attr("height")),
        source: "img",
        url,
        width: toNumber(img.attr("width")),
      },
      maxCandidates,
    );
  });

  return candidates;
}

function parseJsonLd(doc: CheerioAPI, warnings: string[]): unknown[] {
  const jsonld: unknown[] = [];

  doc('script[type="application/ld+json"]').each(
    (index: number, element: AnyNode) => {
      const raw = doc(element).html() || "";
      const trimmed = raw.trim();
      if (!trimmed) {
        return;
      }

      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          jsonld.push(...parsed);
        } else {
          jsonld.push(parsed);
        }
      } catch (_error) {
        warnings.push(`jsonld block ${index} could not be parsed`);
      }
    },
  );

  return jsonld;
}

function getTextStats(text: string, truncated: boolean): TextStats {
  const words = text.match(/\S+/g) || [];
  const sentences = text.match(/[.!?](\s|$)/g) || [];

  return {
    charCount: text.length,
    sentenceCount: sentences.length,
    truncated,
    wordCount: words.length,
  };
}

function protectEscapedTagText(html: string): {
  html: string;
  restore: (text: string) => string;
} {
  const replacements: string[] = [];
  const protectedHtml = html.replace(/&lt;([^<>]{1,1000}?)&gt;/gi, (_match, inner) => {
    const placeholder = `SME_ESCAPED_TEXT_${replacements.length}_`;
    replacements.push(`<${inner}>`);
    return placeholder;
  });

  return {
    html: protectedHtml,
    restore: (text: string) =>
      replacements.reduce(
        (restored, replacement, index) =>
          restored.replace(
            new RegExp(`SME_ESCAPED_TEXT_${index}_`, "g"),
            replacement,
          ),
        text,
      ),
  };
}

function getReadableParts(
  html: string,
  lang: string,
  baseUrl: string,
  maxReadableTextLength: number,
  warnings: string[],
): Pick<ExtractedResource, "links" | "readableText" | "textStats" | "videos"> {
  try {
    const protectedText = protectEscapedTagText(html);
    const doc = cheerio.load(protectedText.html, { xmlMode: false });
    cleaner(doc);
    const topNode = extractor.calculateBestNode(doc, lang);

    if (!topNode || topNode.length === 0) {
      return {
        links: [],
        readableText: "",
        textStats: getTextStats("", false),
        videos: [],
      };
    }

    const links = getLinks(doc, topNode, baseUrl);
    const videos = getVideos(doc, topNode, baseUrl);
    let readableText = protectedText.restore(extractor.text(doc, topNode, lang));
    let truncated = false;

    if (readableText.length > maxReadableTextLength) {
      readableText = readableText.slice(0, maxReadableTextLength);
      truncated = true;
      warnings.push(
        `readableText exceeded ${maxReadableTextLength} characters and was truncated`,
      );
    }

    return {
      links,
      readableText,
      textStats: getTextStats(readableText, truncated),
      videos,
    };
  } catch (_error) {
    warnings.push("readable text extraction failed");
    return {
      links: [],
      readableText: "",
      textStats: getTextStats("", false),
      videos: [],
    };
  }
}

function getLinks(
  doc: CheerioAPI,
  topNode: Cheerio<AnyNode>,
  baseUrl: string,
): ExtractedLink[] {
  const links: ExtractedLink[] = [];

  topNode.find("a").each((_index: number, element: AnyNode) => {
    const anchor = doc(element);
    const url = resolveHttpUrl(anchor.attr("href"), baseUrl);
    const text = anchor.text().replace(/\s\s+/g, " ").trim();

    if (url && text && !links.some((link) => link.url === url)) {
      links.push({
        rel: anchor.attr("rel"),
        text,
        title: anchor.attr("title"),
        url,
      });
    }
  });

  return links;
}

function getVideos(
  doc: CheerioAPI,
  topNode: Cheerio<AnyNode>,
  baseUrl: string,
): ExtractedVideo[] {
  const videos: ExtractedVideo[] = [];

  topNode.find("iframe, embed, object, video, source").each(
    (_index: number, element: AnyNode) => {
      const candidate = doc(element);
      const tag = getTagName(candidate);
      const src =
        candidate.attr("src") ||
        candidate.attr("data-src") ||
        candidate.find("param[name='movie']").attr("value");
      const url = resolveHttpUrl(src, baseUrl);

      if (url && !videos.some((video) => video.url === url)) {
        videos.push({
          height: toNumber(candidate.attr("height")),
          source: tag,
          type: candidate.attr("type"),
          url,
          width: toNumber(candidate.attr("width")),
        });
      }
    },
  );

  return videos;
}

function buildMetadata(
  html: string,
  options: ExtractOptions,
  includeReadable: boolean,
): ExtractedResource {
  const warnings: string[] = [];
  const maxStringLength =
    options.maxStringLength || DEFAULT_MAX_STRING_LENGTH;
  const maxCandidates = options.maxCandidates || DEFAULT_MAX_CANDIDATES;
  const maxReadableTextLength =
    options.maxReadableTextLength || DEFAULT_MAX_READABLE_TEXT_LENGTH;
  const inputUrl = options.inputUrl || options.finalUrl || "";
  const finalUrl = options.finalUrl || inputUrl;
  const baseUrl = getBaseUrl(options);
  const { domain, normalizedUrl } = getUrlParts(finalUrl || inputUrl);

  const doc = cheerio.load(html, { xmlMode: true });
  const docForJsonLd = cheerio.load(html, {
    decodeEntities: false,
    xmlMode: true,
  } as CheerioOptions);
  const rawMeta = getRawMeta(doc, warnings, maxStringLength);
  const language = options.lang || extractor.lang(doc) || "";
  const canonicalCandidate =
    firstMetaValue(rawMeta, ["og:url"]) ||
    doc("link[rel='canonical']").first().attr("href") ||
    finalUrl ||
    inputUrl;
  const canonicalUrl =
    resolveHttpUrl(canonicalCandidate, baseUrl) || canonicalCandidate || "";
  const faviconCandidates = getFaviconCandidates(doc, baseUrl, maxCandidates);
  const imageCandidates = getImageCandidates(doc, baseUrl, maxCandidates);
  const title = cleanBounded(extractor.title(doc), "title", warnings, maxStringLength);
  const softTitle = cleanBounded(
    extractor.softTitle(doc),
    "softTitle",
    warnings,
    maxStringLength,
  );
  const description = cleanBounded(
    extractor.description(doc),
    "description",
    warnings,
    maxStringLength,
  );
  const readableParts = includeReadable
    ? getReadableParts(
        html,
        language || "en",
        baseUrl,
        maxReadableTextLength,
        warnings,
      )
    : {
        links: [],
        readableText: "",
        textStats: getTextStats("", false),
        videos: [],
      };

  const confidenceSignals = [
    title,
    description,
    canonicalUrl,
    imageCandidates.length > 0 ? "image" : "",
    readableParts.readableText.length > 0 ? "text" : "",
  ].filter(Boolean).length;

  return {
    author: extractor
      .author(doc)
      .map((author) =>
        cleanBounded(author, "author", warnings, maxStringLength),
      )
      .filter(Boolean),
    canonicalUrl,
    description,
    domain,
    extraction: {
      confidence: Math.min(1, confidenceSignals / 5),
      packageVersion,
      strategyVersion: STRATEGY_VERSION,
      warnings,
    },
    faviconCandidates,
    finalUrl,
    imageCandidates,
    inputUrl,
    jsonld: parseJsonLd(docForJsonLd, warnings),
    lang: language,
    links: readableParts.links,
    locale: cleanBounded(extractor.locale(doc), "locale", warnings, maxStringLength),
    modifiedAt: getDateValue(doc, rawMeta, [
      "article:modified_time",
      "og:updated_time",
      "dcterms.modified",
      "dc.date.modified",
      "dateModified",
    ]),
    normalizedUrl,
    primaryImage: imageCandidates[0] || null,
    publishedAt: getDateValue(doc, rawMeta, [
      "article:published_time",
      "date",
      "dcterms.date",
      "dc.date",
      "dc.date.issued",
      "datePublished",
    ]),
    publisher: cleanBounded(
      extractor.publisher(doc),
      "publisher",
      warnings,
      maxStringLength,
    ),
    rawMeta,
    readableText: readableParts.readableText,
    siteName: cleanBounded(
      extractor.siteName(doc),
      "siteName",
      warnings,
      maxStringLength,
    ),
    softTitle,
    textStats: readableParts.textStats,
    title,
    videos: readableParts.videos,
  };
}

export function extractFromHtml(
  html: string,
  options: ExtractOptions = {},
): ExtractedResource {
  return buildMetadata(html, options, true);
}

export function extractMetadataOnly(
  html: string,
  options: ExtractOptions = {},
): ExtractedResource {
  return buildMetadata(html, options, false);
}

export function extractLazy(
  html: string,
  options: ExtractOptions = {},
): LazyExtractedResource {
  let metadataCache: ExtractedResource | null = null;
  let fullCache: ExtractedResource | null = null;

  const metadata = () => {
    if (!metadataCache) {
      metadataCache = extractMetadataOnly(html, options);
    }
    return metadataCache;
  };

  const extract = () => {
    if (!fullCache) {
      fullCache = extractFromHtml(html, options);
    }
    return fullCache;
  };

  return {
    extract,
    links: () => extract().links,
    metadata,
    readableText: () => extract().readableText,
    videos: () => extract().videos,
  };
}

const siteMetadataExtractor = (
  markup: string,
  resourceUrl: string,
  lang = "en",
): PageData => {
  const resourceUrlObj = new URL(resourceUrl);
  const doc = cheerio.load(markup, { xmlMode: true });

  // Separate instance with decodeEntities: false specifically for JSON-LD extraction
  const docForJsonLd = cheerio.load(markup, {
    xmlMode: true,
    decodeEntities: false,
  } as CheerioOptions);

  const docForText = cheerio.load(markup, { xmlMode: false });

  const language = lang || extractor.lang(doc);

  const pageData: PageData = {
    author: extractor.author(doc),
    canonicalLink: extractor.canonicalLink(doc, resourceUrl),
    copyright: extractor.copyright(doc),
    date: extractor.date(doc),
    description: extractor.description(doc),
    favicon: extractor.favicon(doc, resourceUrlObj),
    image: extractor.image(doc),
    jsonld: extractor.jsonld(docForJsonLd),
    keywords: extractor.keywords(doc),
    lang: language,
    locale: extractor.locale(doc),
    origin: resourceUrlObj.origin,
    publisher: extractor.publisher(doc),
    siteName: extractor.siteName(doc),
    softTitle: extractor.softTitle(doc),
    tags: extractor.tags(doc),
    title: extractor.title(doc),
    type: extractor.type(doc),
  };

  // Step 1: Clean the doc
  cleaner(doc);

  // Step 2: Find the doc node with the best text
  const topNode = extractor.calculateBestNode(docForText, language);

  // Step 3: Extract text ,videos, images, link
  pageData.videos = extractor.videos(doc, topNode);
  pageData.links = extractor.links(doc, topNode, language);
  pageData.text = extractor.text(doc, topNode, language);

  return pageData;
};

export default siteMetadataExtractor;

// Allow access to document properties with lazy evaluation
export const lazy = (
  html: string,
  resourceUrl: string,
  language = "en",
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
        resourceUrl,
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
      let doc = getParsedDocForText.call(global, html);
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
      let doc = getParsedDocForText.call(global, html);
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
      let doc = getParsedDocForText.call(global, html);
      doc = cleaner(doc);
      const topNode = getTopNode.call(global, doc, this.lang());
      global.lazyPageData.videos = extractor.videos(doc, topNode);
      return global.lazyPageData.videos;
    },
  };
};

export function getCleanedDoc(html: string): CheerioAPI {
  if (!global.cleanedDoc) {
    const doc = getParsedDoc.call(global, html);
    global.cleanedDoc = cleaner(doc);
  }
  return global.cleanedDoc;
}

export function getParsedDoc(html: string): CheerioAPI {
  return (global.doc = cheerio.load(html));
}

export function getParsedDocForText(html: string): CheerioAPI {
  return (global.doc = cheerio.load(html, { xmlMode: false }));
}

export function getTopNode(doc: CheerioAPI, lang: string): Cheerio<AnyNode> {
  global.topNode = extractor.calculateBestNode(doc, lang);
  return global.topNode;
}
