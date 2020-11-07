import cheerio from 'cheerio';
import isEqual from 'lodash/isEqual';
import uniq from 'lodash/uniq';
import { NewsArticle, Article } from 'schema-dts';
import { URL } from 'url';
import formatter, { replaceCharacters } from './formatter';
import stopwords from './stopwords';

export interface LinkObj {
  href: string;
  text: string;
}

export interface VideoAttrs {
  height?: string;
  src?: string;
  width?: string;
}

export interface Extractor {
  author: (doc: cheerio.Root) => string[];
  calculateBestNode: (doc: cheerio.Root, lang: string) => cheerio.Cheerio;
  canonicalLink: (doc: cheerio.Root, resourceUrl: string) => string;
  copyright: (doc: cheerio.Root) => string;
  date: (doc: cheerio.Root) => string;
  description: (doc: cheerio.Root) => string;
  favicon: (doc: cheerio.Root, resourceUrlObj: URL) => string;
  image: (doc: cheerio.Root) => string;
  jsonld: (doc: cheerio.Root) => NewsArticle | Article | null;
  keywords: (doc: cheerio.Root) => string;
  lang: (doc: cheerio.Root) => string;
  links: (
    doc: cheerio.Root,
    topNode: cheerio.Cheerio,
    lang: string
  ) => LinkObj[];
  locale: (doc: cheerio.Root) => string;
  publisher: (doc: cheerio.Root) => string;
  siteName: (doc: cheerio.Root) => string;
  softTitle: (doc: cheerio.Root) => string;
  tags: (doc: cheerio.Root) => string[];
  text: (doc: cheerio.Root, topNode: cheerio.Cheerio, lang: string) => string;
  title: (doc: cheerio.Root) => string;
  type: (doc: cheerio.Root) => string;
  videos: (doc: cheerio.Root, topNode: cheerio.Cheerio) => VideoAttrs[];
}

function addSiblings(
  doc: cheerio.Root,
  topNode: cheerio.Cheerio,
  lang: string
): cheerio.Cheerio {
  const baselineScoreSiblingsPara = getSiblingsScore(doc, topNode, lang);
  const sibs = topNode.prevAll();

  sibs.each((_index: number, element: cheerio.Element) => {
    const currentNode = doc(element);
    const ps = getSiblingsContent(
      doc,
      lang,
      currentNode,
      baselineScoreSiblingsPara
    );

    if (ps) {
      ps.forEach((p: cheerio.Cheerio | string) => {
        topNode.prepend(`<p>${p}</p>`);
      });
    }
  });

  return topNode;
}

function biggestTitleChunk(title: string, splitter: string) {
  let largeTextIndex = 0;
  let largeTextLength = 0;

  const titlePieces = title.split(splitter);

  titlePieces.forEach((piece, index) => {
    if (piece.length > largeTextLength) {
      largeTextLength = piece.length;
      largeTextIndex = index;
    }
  });

  return titlePieces[largeTextIndex];
}

function cleanNull(text: string | undefined): string {
  if (text) {
    return text.replace(/^null$/g, '');
  }
  return '';
}

function cleanText(text: string): string {
  if (text) {
    return text
      .replace(/[\r\n\t]/g, ' ')
      .replace(/\s\s+/g, ' ')
      .replace(/<!--.+?-->/g, '')
      .replace(/�/g, '')
      .trim();
  }
  return text;
}

function cleanTitle(title: string, delimiters: string[]): string {
  let titleText = title || '';
  let usedDelimiter = false;

  delimiters.forEach((char) => {
    if (titleText.indexOf(char) >= 0 && !usedDelimiter) {
      titleText = biggestTitleChunk(titleText, char);
      usedDelimiter = true;
    }
  });

  return cleanText(titleText);
}

function doesNodeListContainNode(
  list: cheerio.Cheerio[],
  node: cheerio.Cheerio
): boolean {
  let contains = false;
  for (let i = 0; i < list.length; i++) {
    const nodeToCompare = list[i];
    if (isEqual(node, nodeToCompare)) {
      contains = true;
    }
  }
  return contains;
}

function getObjectTag(doc: cheerio.Root, node: cheerio.Cheerio) {
  const srcNode = node.find('param[name=movie]');
  if (srcNode.length > 0) {
    const src = srcNode.attr('value');
    const video = getVideoAttrs(doc, node);
    video.src = src;
    return video;
  }
  return {};
}

function getSiblingsContent(
  doc: cheerio.Root,
  lang: string,
  currentSibling: cheerio.Cheerio,
  baselineScoreSiblingsPara: number
) {
  if (currentSibling[0].name === 'p' && currentSibling.text().length > 0) {
    return [currentSibling];
  } else {
    const potentialParagraphs = currentSibling.find('p');
    if (potentialParagraphs === null) {
      return null;
    } else {
      const ps: string[] = [];
      potentialParagraphs.each((_index: number, element: cheerio.Element) => {
        const firstParagraph = doc(element);
        const text = firstParagraph.text();

        if (text.length > 0) {
          const wordStats = stopwords(text, lang);
          const paragraphScore = wordStats.stopWordCount;
          const siblingBaselineScore = 0.3;
          const highLinkDensity = isHighLinkDensity(doc, firstParagraph);
          const score = baselineScoreSiblingsPara * siblingBaselineScore;

          if (score < paragraphScore && !highLinkDensity) {
            ps.push(text);
          }
        }
      });
      return ps;
    }
  }
}

function getSiblingsScore(
  doc: cheerio.Root,
  topNode: cheerio.Cheerio,
  lang: string
): number {
  const nodesToCheck = topNode.find('p');
  let base = 100000;
  let paragraphsNumber = 0;
  let paragraphScore = 0;

  nodesToCheck.each((_index: number, element: cheerio.Element) => {
    const node = doc(element);
    const textNode = node.text();
    const wordStats = stopwords(textNode, lang);
    const highLinkDensity = isHighLinkDensity(doc, node);

    if (wordStats.stopWordCount > 2 && !highLinkDensity) {
      paragraphsNumber++;
      paragraphScore += wordStats.stopWordCount;
    }
  });

  if (paragraphsNumber > 0) {
    base = paragraphScore / paragraphsNumber;
  }
  return base;
}

function getScore(node: cheerio.Cheerio): number {
  const gravityScoreString = node.attr('gravityScore');
  if (!gravityScoreString) {
    return 0;
  } else {
    return parseInt(gravityScoreString, 10);
  }
}

function getVideoAttrs(doc: cheerio.Root, node: cheerio.Cheerio): VideoAttrs {
  const el = doc(node);
  return {
    height: el.attr('height'),
    src: el.attr('src'),
    width: el.attr('width')
  };
}

function isAbsoluteUrl(url: string): boolean {
  if (typeof url !== 'string') {
    throw new TypeError(`Expected a \`string\`, got \`${typeof url}\``);
  }

  // Don't match Windows paths `c:\`
  if (/^[a-zA-Z]:\\/.test(url)) {
    return false;
  }

  // Scheme: https://tools.ietf.org/html/rfc3986#section-3.1
  // Absolute URL: https://tools.ietf.org/html/rfc3986#section-4.3
  return /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(url);
}

function isBoostable(
  doc: cheerio.Root,
  node: cheerio.Cheerio,
  lang: string
): boolean {
  const minimumStopWordCount = 5;
  const maxStepsAwayFromNode = 3;
  let stepsAway = 0;

  const nodes = node.prevAll();
  let boostable = false;

  nodes.each((_index: number, element: cheerio.Element) => {
    const currentNode = doc(element);
    const currentNodeTag = currentNode[0].name;

    if (currentNodeTag === 'p') {
      if (stepsAway >= maxStepsAwayFromNode) {
        boostable = false;
        return false;
      }

      const paraText = currentNode.text();
      const wordStats = stopwords(paraText, lang);

      if (wordStats.stopWordCount > minimumStopWordCount) {
        boostable = true;
        return false;
      }

      stepsAway++;
    }
  });

  return boostable;
}

function isHighLinkDensity(doc: cheerio.Root, node: cheerio.Cheerio): boolean {
  const links = node.find('a');
  if (links.length > 0) {
    const text = node.text();
    const words = text.split(' ');
    const numberOfWords = words.length;

    const sb: string[] = [];
    links.each((_index: number, element: cheerio.Element) => {
      sb.push(doc(element).text());
    });

    const linkText = sb.join(' ');
    const linkWords = linkText.split(' ');
    const numberOfLinkWords = linkWords.length;
    const numberofLinks = links.length;
    const percentLinkWords = numberOfLinkWords / numberOfWords;
    const score = percentLinkWords * numberofLinks;

    if (score >= 1.0) {
      return true;
    }
  }
  return false;
}

function isNodeScoreThresholdMet(
  _doc: cheerio.Root,
  node: cheerio.Cheerio,
  e: cheerio.Cheerio
): boolean {
  const topNodeScore = getScore(node);
  const currentNodeScore = getScore(e);
  const thresholdScore = topNodeScore * 0.08;

  const elIsTdUlOlOrBlockQ = ['td', 'ul', 'ol', 'blockquote'].includes(
    e[0].name
  );
  if (currentNodeScore < thresholdScore && !elIsTdUlOlOrBlockQ) {
    return false;
  }

  return true;
}

function isTableAndNoParaExist(doc: cheerio.Root, e: cheerio.Cheerio): boolean {
  const subParagraphs = e.find('p');

  subParagraphs.each((_index: number, element: cheerio.Element) => {
    const p = doc(element);
    const text = p.text();

    if (text.length < 25) {
      doc(p).remove();
    }
  });

  const subParagraphsTwo = e.find('p');
  const elIsTdUlOrOl = ['td', 'ul', 'ol'].includes(e[0].name);
  if (subParagraphsTwo.length === 0 && !elIsTdUlOrOl) {
    return true;
  }
  return false;
}

function isValidDate(d: string): boolean {
  const parsedDate = Date.parse(d);
  return new Date(d).toString() !== 'Invalid Date' && !isNaN(parsedDate);
}

function postCleanup(
  doc: cheerio.Root,
  targetNode: cheerio.Cheerio,
  lang: string
): cheerio.Cheerio {
  const node = addSiblings(doc, targetNode, lang);

  node.children().each((_index: number, element: cheerio.Element) => {
    const el = doc(element);
    const elTag = el[0].name;
    if (!['p', 'a'].includes(elTag)) {
      if (
        isHighLinkDensity(doc, el) ||
        isTableAndNoParaExist(doc, el) ||
        !isNodeScoreThresholdMet(doc, node, el)
      ) {
        doc(el).remove();
      }
    }
  });

  return node;
}

function rawTitle(doc: cheerio.Root) {
  let gotTitle = false;
  let titleText = '';

  [
    doc('meta[property="og:title"]').first().attr('content'),
    doc('h1[class*="title"]').first().text(),
    doc('title').first().text(),
    doc('h1').first().text(),
    doc('h2').first().text()
  ].forEach((candidate) => {
    if (candidate && candidate.trim() && !gotTitle) {
      titleText = candidate.trim();
      gotTitle = true;
    }
  });
  return titleText;
}

function updateNodeCount(node: cheerio.Cheerio, addToCount: number): void {
  const countString = node.attr('gravityNodes');
  let currentScore = 0;

  if (countString) {
    currentScore = parseInt(countString, 10);
  }

  const newScore = currentScore + addToCount;
  node.attr('gravityNodes', `${newScore}`);
}

function updateScore(node: cheerio.Cheerio, addToScore: number): void {
  const scoreString = node.attr('gravityScore');
  let currentScore = 0;

  if (scoreString) {
    currentScore = parseInt(scoreString, 10);
  }

  const newScore = currentScore + addToScore;
  node.attr('gravityScore', `${newScore}`);
}

const extractor: Extractor = {
  author: (doc: cheerio.Root): string[] => {
    const authorCandidates = doc(
      "meta[property='article:author'], meta[property='og:article:author'], meta[name='author'], meta[name='dcterms.creator'], meta[name='DC.creator'], meta[name='DC.Creator'], meta[name='dc.creator'], meta[name='creator']"
    );

    const authorList = [];

    authorCandidates.each((_index: number, element: cheerio.Element) => {
      const author = cleanNull(doc(element).attr('content'));
      if (author) {
        authorList.push(author.trim());
      }
    });

    // fallback to a named author div
    if (authorList.length === 0) {
      const fallbackAuthor =
        doc("span[class*='author']").first().text() ||
        doc("p[class*='author']").first().text() ||
        doc("div[class*='author']").first().text() ||
        doc("span[class*='byline']").first().text() ||
        doc("p[class*='byline']").first().text() ||
        doc("div[class*='byline']").first().text();
      if (fallbackAuthor) {
        authorList.push(cleanText(fallbackAuthor));
      }
    }
    return authorList;
  },
  calculateBestNode: (doc: cheerio.Root, lang: string): cheerio.Cheerio => {
    let topNode: cheerio.Cheerio | null = null;
    const nodesToCheck = doc('p, pre, td');

    const parentNodes: cheerio.Cheerio[] = [];
    const nodesWithText: cheerio.Cheerio[] = [];
    let startingBoost = 1.0;
    let cnt = 0;
    let i = 0;

    nodesToCheck.each((_index: number, element: cheerio.Element) => {
      const node = doc(element);

      const textNode = node.text();
      const wordStats = stopwords(textNode, lang);
      const highLinkDensity = isHighLinkDensity(doc, node);

      if (wordStats.stopWordCount > 2 && !highLinkDensity) {
        nodesWithText.push(node);
      }
    });

    const nodesNumber = nodesWithText.length;
    const bottomNegativeScoreNodes = nodesNumber * 0.25;
    const negativeScoring = 0;

    nodesWithText.forEach((node: cheerio.Cheerio) => {
      let boostScore = 0.0;

      if (isBoostable(doc, node, lang) === true) {
        if (cnt >= 0) {
          boostScore = (1.0 / startingBoost) * 50;
          startingBoost += 1;
        }
      }

      if (nodesNumber > 15) {
        if (nodesNumber - i <= bottomNegativeScoreNodes) {
          const booster = bottomNegativeScoreNodes - (nodesNumber - i);
          boostScore = -1.0 * Math.pow(booster, 2);
          const negScore = Math.abs(boostScore) + negativeScoring;

          if (negScore > 40) {
            boostScore = 5.0;
          }
        }
      }

      const textNode = node.text();
      const wordStats = stopwords(textNode, lang);
      const upScore = Math.floor(wordStats.stopWordCount + boostScore);

      const parentNode = node.parent();
      updateScore(parentNode, upScore);
      updateNodeCount(parentNode, 1);

      if (!doesNodeListContainNode(parentNodes, parentNode)) {
        parentNodes.push(parentNode);
      }

      // if (parentNodes.indexOf(parentNode[0]) === -1) {
      //   parentNodes.push(parentNode[0]);
      // }

      const parentParentNode = parentNode.parent();
      if (parentParentNode) {
        updateScore(parentParentNode, upScore / 2);
        updateNodeCount(parentParentNode, 1);

        if (!doesNodeListContainNode(parentNodes, parentParentNode)) {
          parentNodes.push(parentParentNode);
        }

        // if (parentNodes.indexOf(parentParentNode[0]) === -1) {
        //   parentNodes.push(parentParentNode[0]);
        // }
      }

      cnt += 1;
      i += 1;
    });

    let topNodeScore = 0;

    parentNodes.forEach((el) => {
      const score = getScore(doc(el));

      if (score > topNodeScore) {
        topNode = el;
        topNodeScore = score;
      }

      if (topNode === null) {
        topNode = el;
      }
    });

    return doc(topNode);
  },
  // if it gets to the end without one of these links or meta tags, return the original url as canonical
  canonicalLink: (doc: cheerio.Root, resourceUrl: string): string => {
    const canonicalLinkTag = doc(
      "link[rel='canonical'], meta[property='og:url']"
    );
    if (canonicalLinkTag) {
      const resourceUrlObj = new URL(resourceUrl);
      // check if it is link or meta
      if (canonicalLinkTag[0] && canonicalLinkTag[0].name === 'link') {
        const cleanedCanonicalLink = cleanNull(
          canonicalLinkTag.first().attr('href')
        );
        // check if link is a relative url, if so, append origin
        if (!isAbsoluteUrl(cleanedCanonicalLink)) {
          return `${resourceUrlObj.origin}${cleanedCanonicalLink}`;
        }
        return cleanedCanonicalLink;
      } else if (canonicalLinkTag[0] && canonicalLinkTag[0].name === 'meta') {
        let cleanedCanonicalMeta = cleanNull(canonicalLinkTag.attr('content'));
        // check if resourceUrl protocol is https? if so, use that
        const urlProtocol = resourceUrlObj.protocol;
        if (urlProtocol === 'https:') {
          cleanedCanonicalMeta = cleanedCanonicalMeta.replace(
            /^http:\/\//i,
            'https://'
          );
          return cleanedCanonicalMeta;
        }
        return cleanedCanonicalMeta;
      }
    }
    // return original url
    return resourceUrl;
  },
  copyright: (doc: cheerio.Root): string => {
    const copyrightCandidates = doc(
      "p[class*='copyright'], div[class*='copyright'], span[class*='copyright'], li[class*='copyright'], p[id*='copyright'], div[id*='copyright'], span[id*='copyright'], li[id*='copyright']"
    );
    let text = copyrightCandidates?.first()?.text();
    if (!text) {
      // try to find copyright in text
      text = doc('body')
        .text()
        .replace(/\s*[\r\n]+\s*/g, '. ');
    }
    if (text.indexOf('©') > -1) {
      const copyright = text
        .replace(/.*?©(\s*copyright)?([^,;:.|\r\n]+).*/gi, '$2')
        .trim();
      return cleanText(copyright);
    }
    return '';
  },
  date: (doc: cheerio.Root): string => {
    const dateCandidates = doc(
      "meta[property='article:published_time'], \
    meta[itemprop*='datePublished'], meta[name='dcterms.modified'], \
    meta[name='dcterms.date'], \
    meta[name='DC.date.issued'],  meta[name='dc.date.issued'], \
    meta[name='dc.date.modified'], meta[name='dc.date.created'], \
    meta[name='DC.date'], \
    meta[name='DC.Date'], \
    meta[name='dc.date'], \
    meta[name='date'], \
    time[itemprop*='pubDate'], \
    time[itemprop*='pubdate'], \
    span[itemprop*='datePublished'], \
    span[property*='datePublished'], \
    p[itemprop*='datePublished'], \
    p[property*='datePublished'], \
    div[itemprop*='datePublished'], \
    div[property*='datePublished'], \
    li[itemprop*='datePublished'], \
    li[property*='datePublished'], \
    time, \
    span[class*='date'], \
    p[class*='date'], \
    div[class*='date']"
    );

    let dateToReturn = '';

    if (dateCandidates) {
      const dateContentCandidate = cleanNull(
        dateCandidates.first().attr('content')
      );
      const dateTimeCandidate = cleanNull(
        dateCandidates.first().attr('datetime')
      );
      const dateTextCandidate = cleanText(dateCandidates.first().text());

      if (dateContentCandidate) {
        dateToReturn = dateContentCandidate.trim();
      } else if (dateTimeCandidate) {
        dateToReturn = dateTimeCandidate.trim();
      } else if (dateTextCandidate) {
        dateToReturn = dateTextCandidate.trim();
      }
    }

    if (isValidDate(dateToReturn)) {
      return dateToReturn;
    }

    // finally try jsonld date
    const jsonldBlob = extractor.jsonld(doc);
    if (jsonldBlob && jsonldBlob.datePublished) {
      dateToReturn = jsonldBlob.datePublished as string;
    }

    return dateToReturn;
  },
  description: (doc: cheerio.Root): string => {
    const descriptionTag = doc(
      "meta[name=description], meta[property='og:description']"
    );
    if (descriptionTag) {
      const cleanedDescription = cleanNull(
        descriptionTag.first().attr('content')
      );
      if (cleanedDescription) {
        return replaceCharacters(cleanedDescription.trim(), false, true);
      }
    }
    return '';
  },
  favicon: (doc: cheerio.Root, resourceUrlObj: URL): string => {
    const tag = doc('link').filter(
      (_index, el) =>
        doc(el).attr('rel')?.toLowerCase() === 'shortcut icon' ||
        doc(el).attr('rel')?.toLowerCase() === 'icon'
    );
    const faviconLink = tag.attr('href') || '';
    // ensure the url returned from favicon is absolute url
    if (faviconLink && !isAbsoluteUrl(faviconLink)) {
      // add the origin to the faviconLink
      return `${resourceUrlObj.origin}${faviconLink}`;
    }
    return faviconLink;
  },
  image: (doc: cheerio.Root): string => {
    const images = doc(
      "meta[property='og:image'], meta[property='og:image:url'], meta[itemprop=image], meta[name='twitter:image:src'], meta[name='twitter:image'], meta[name='twitter:image0']"
    );

    if (images.length > 0 && cleanNull(images.first().attr('content'))) {
      const cleanedImages = cleanNull(images.first().attr('content')) || '';
      return cleanedImages.trim();
    }
    return '';
  },
  jsonld: (doc: cheerio.Root): NewsArticle | Article | null => {
    const jsonldTag = doc('script[type="application/ld+json"]');
    if (jsonldTag) {
      // convert jsonldTag to html
      const jsonldObj = jsonldTag.html() || JSON.stringify('');
      try {
        const parsedJSON: NewsArticle | Article = JSON.parse(jsonldObj);
        if (parsedJSON) {
          if (!Array.isArray(parsedJSON)) {
            return parsedJSON;
          }
        }
      } catch (e) {
        console.error(`Error in jsonld parse - ${e}`);
      }
    }
    return null;
  },
  keywords: (doc: cheerio.Root): string => {
    const keywordsTag = doc('meta[name="keywords"]');
    if (keywordsTag) {
      const cleansedKeywords = cleanNull(keywordsTag.attr('content'));
      if (cleansedKeywords) {
        return cleansedKeywords.trim();
      }
    }
    return '';
  },
  lang: (doc: cheerio.Root): string => {
    let language = doc('html').attr('lang');
    if (!language) {
      const tag =
        doc('meta[name=lang]') || doc('meta[http-equiv=content-language]');
      language = tag.attr('content');
    }

    if (language) {
      const value = language[0] + language[1];
      const regex = /^[A-Za-z]{2}$/;
      if (regex.test(value)) {
        return value.toLowerCase();
      }
    }
    return '';
  },
  links: (
    doc: cheerio.Root,
    topNode: cheerio.Cheerio,
    lang: string
  ): LinkObj[] => {
    const links: LinkObj[] = [];

    const gatherLinks = () => {
      const nodes = topNode.find('a');
      nodes.each((_index: number, element: cheerio.Element) => {
        const href = doc(element).attr('href');
        const text = doc(element).html();
        if (href && text) {
          links.push({
            href,
            text
          });
        }
      });
    };

    if (topNode) {
      topNode = postCleanup(doc, topNode, lang);
      gatherLinks();
    }
    return links;
  },
  locale: (doc: cheerio.Root): string => {
    const localeTag = doc("meta[property='og:locale']");
    if (localeTag) {
      const cleanedLocale = cleanNull(localeTag.first().attr('content'));
      if (cleanedLocale) {
        return cleanedLocale.trim();
      }
    }
    return '';
  },
  publisher: (doc: cheerio.Root): string => {
    const publisherCandidates = doc(
      "meta[property='og:site_name'], meta[itemprop=name], meta[name='dc.publisher'], meta[name='DC.publisher'], meta[name='DC.Publisher']"
    );
    if (publisherCandidates) {
      const cleanedPublisher = cleanNull(
        publisherCandidates.first().attr('content')
      );
      if (cleanedPublisher) {
        return cleanedPublisher.trim();
      }
    }
    return '';
  },
  siteName: (doc: cheerio.Root): string => {
    const siteNameTag = doc(
      "meta[property='og:site_name'], meta[itemprop=name]"
    );
    if (siteNameTag) {
      const cleanedSiteName = cleanNull(siteNameTag.first().attr('content'));
      if (cleanedSiteName) {
        return cleanedSiteName.trim();
      }
    }
    return '';
  },
  // Grab the title with soft truncation
  softTitle: (doc: cheerio.Root): string => {
    const titleText = rawTitle(doc);
    return cleanTitle(titleText, ['|', ' - ', '»']);
  },
  tags: (doc: cheerio.Root): string[] => {
    let elements = doc("a[rel='tag']");
    if (elements.length === 0) {
      elements = doc(
        "a[href*='/tag/'], a[href*='/tags/'], a[href*='/topic/'], a[href*='?keyword=']"
      );
      if (elements.length === 0) {
        return [];
      }
    }

    const tags: string[] = [];
    elements.each((_index: number, element: cheerio.Element) => {
      const tag = doc(element);
      const tagText = tag.text().trim();
      tagText.replace(/[\s\t\n]+/g, '');

      if (tagText && tagText.length > 0) {
        tags.push(tagText);
      }
    });

    return uniq(tags);
  },
  text: (doc: cheerio.Root, topNode: cheerio.Cheerio, lang: string): string => {
    if (topNode) {
      topNode = postCleanup(doc, topNode, lang);
      return formatter(doc, topNode, lang);
    } else {
      return '';
    }
  },
  // Grab the title of an html doc (excluding junk)
  // Hard-truncates titles containing colon or spaced dash
  title: (doc: cheerio.Root): string => {
    const titleText = rawTitle(doc);
    const cleanedTitle = cleanTitle(titleText, ['|', ' - ', '»', ':']);
    return replaceCharacters(cleanedTitle, false, true);
  },
  type: (doc: cheerio.Root): string => {
    const typeTag = doc("meta[property='og:type']");
    if (typeTag) {
      const cleanedType = cleanNull(typeTag.first().attr('content'));
      if (cleanedType) {
        return cleanedType.trim();
      }
    }
    return '';
  },
  videos: (doc: cheerio.Root, topNode: cheerio.Cheerio): VideoAttrs[] => {
    const videolist: VideoAttrs[] = [];
    const videoCandidates = doc(topNode).find('iframe, embed, object, video');

    videoCandidates.each((_index: number, element: cheerio.Element) => {
      const candidate = doc(element);
      const tag = candidate[0].name;

      if (tag === 'embed') {
        if (candidate.parent() && candidate.parent()[0].name === 'object') {
          videolist.push(getObjectTag(doc, candidate));
        } else {
          videolist.push(getVideoAttrs(doc, candidate));
        }
      } else if (tag === 'object') {
        videolist.push(getObjectTag(doc, candidate));
      } else if (tag === 'iframe' || tag === 'video') {
        videolist.push(getVideoAttrs(doc, candidate));
      }
    });

    const urls: string[] = [];
    const results: VideoAttrs[] = [];
    videolist.forEach((vid: VideoAttrs) => {
      if (vid.src) {
        if (vid && vid.height && vid.width && urls.indexOf(vid.src) === -1) {
          results.push(vid);
          urls.push(vid.src);
        }
      }
    });
    return results;
  }
};

export default extractor;
