import { uniq } from 'lodash';
import formatter, { replaceCharacters } from './formatter';
import stopwords from './stopwords';

function addSiblings(doc: any, topNode: any, lang: string) {
  const baselineScoreSiblingsPara = getSiblingsScore(doc, topNode, lang);
  const sibs = topNode.prevAll();

  sibs.each((_index: number, element: any) => {
    const currentNode = doc(element);
    const ps = getSiblingsContent(
      doc,
      lang,
      currentNode,
      baselineScoreSiblingsPara
    );

    if (ps) {
      ps.forEach(p => {
        topNode.prepend('<p>#{p}</p>');
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

function cleanNull(text: string) {
  if (text) {
    return text.replace(/^null$/g, '');
  }
  return null;
}

function cleanText(text: string) {
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

function cleanTitle(title: string, delimiters: string[]) {
  let titleText = title || '';
  let usedDelimiter = false;

  delimiters.forEach(char => {
    if (titleText.indexOf(char) >= 0 && !usedDelimiter) {
      titleText = biggestTitleChunk(titleText, char);
      usedDelimiter = true;
    }
  });
  return cleanText(titleText);
}

function getObjectTag(doc: any, node: any) {
  const srcNode = node.find('param[name=movie');
  if (srcNode.length > 0) {
    const src = srcNode.attr('value');
    const video = getVideoAttrs(doc, node);
    video.src = src;
    return video;
  }
  return null;
}

function getSiblingsContent(
  doc: any,
  lang: string,
  currentSibling: any,
  baselineScoreSiblingsPara: any
) {
  if (currentSibling[0].name === 'p' && currentSibling.text().length > 0) {
    return [currentSibling];
  } else {
    const potentialParagraphs = currentSibling.find('p');
    if (potentialParagraphs === null) {
      return null;
    } else {
      const ps: string[] = [];
      potentialParagraphs.each((_index: number, element: any) => {
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

function getSiblingsScore(doc: any, topNode: any, lang: string) {
  const nodesToCheck = topNode.find('p');
  let base = 100000;
  let paragraphsNumber = 0;
  let paragraphScore = 0;

  nodesToCheck.each((_index: number, element: any) => {
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

function getScore(node: any) {
  const gravityScoreString = node.attr('gravityScore');
  if (!gravityScoreString) {
    return 0;
  } else {
    return parseInt(gravityScoreString, 10);
  }
}

function getVideoAttrs(doc: any, node: any) {
  const el = doc(node);
  return {
    height: el.attr('height'),
    src: el.attr('src'),
    width: el.attr('width')
  };
}

function isBoostable(doc: any, node: any, lang: string) {
  const minimumStopWordCount = 5;
  const maxStepsAwayFromNode = 3;
  let stepsAway = 0;

  const nodes = node.prevAll();
  let boostable = false;

  nodes.each((_index: number, element: any) => {
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

function isHighLinkDensity(doc: any, node: any) {
  const links = node.find('a');
  if (links.length > 0) {
    const text = node.text();
    const words = text.split(' ');
    const numberOfWords = words.length;

    const sb: string[] = [];
    links.each((_index: number, element: any) => {
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

function isNodeScoreThresholdMet(_doc: any, node: any, e: any) {
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

function isTableAndNoParaExist(doc: any, e: any) {
  const subParagraphs = e.find('p');

  subParagraphs.each((_index: number, element: any) => {
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

function postCleanup(doc: any, targetNode: any, lang: any) {
  const node = addSiblings(doc, targetNode, lang);

  node.children().each((_index: number, element: any) => {
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

function rawTitle(doc: any) {
  let gotTitle = false;
  let titleText = '';

  [
    doc('meta[property="og:title"]')
      .first()
      .attr('content'),
    doc('h1[class*="title"]')
      .first()
      .text(),
    doc('title')
      .first()
      .text(),
    doc('h1')
      .first()
      .text(),
    doc('h2')
      .first()
      .text()
  ].forEach(candidate => {
    if (candidate && candidate.trim() && !gotTitle) {
      titleText = candidate.trim();
      gotTitle = true;
    }
  });
  return titleText;
}

function updateNodeCount(node: any, addToCount: number) {
  const countString = node.attr('gravityNodes');
  let currentScore = 0;

  if (countString) {
    currentScore = parseInt(countString, 10);
  }

  const newScore = currentScore + addToCount;
  node.attr('gravityNodes', newScore);
}

function updateScore(node: any, addToScore: number) {
  const scoreString = node.attr('gravityScore');
  let currentScore = 0;

  if (scoreString) {
    currentScore = parseInt(scoreString, 10);
  }

  const newScore = currentScore + addToScore;
  node.attr('gravityScore', newScore);
}

const extractor = {
  author: (doc: any) => {
    const authorCandidates = doc(
      "meta[property='article:author'], meta[property='og:article:author'], meta[name='author'], meta[name='dcterms.creator'], meta[name='DC.creator'], meta[name='DC.Creator'], meta[name='dc.creator'], meta[name='creator']"
    );

    const authorList = [];

    authorCandidates.each((_index: number, element: any) => {
      const author = cleanNull(doc(element).attr('content'));
      if (author) {
        authorList.push(author.trim());
      }
    });

    // fallback to a named author div
    if (authorList.length === 0) {
      const fallbackAuthor =
        doc("span[class*='author']")
          .first()
          .text() ||
        doc("p[class*='author']")
          .first()
          .text() ||
        doc("div[class*='author']")
          .first()
          .text() ||
        doc("span[class*='byline']")
          .first()
          .text() ||
        doc("p[class*='byline']")
          .first()
          .text() ||
        doc("div[class*='byline']")
          .first()
          .text();
      if (fallbackAuthor) {
        authorList.push(cleanText(fallbackAuthor));
      }
    }
    return authorList;
  },
  calculateBestNode: (doc: any, lang: string) => {
    let topNode: any = null;
    const nodesToCheck = doc('p, pre, td');

    const parentNodes: object[] = [];
    const nodesWithText: object[] = [];
    let startingBoost = 1.0;
    let cnt = 0;
    let i = 0;

    nodesToCheck.each((_index: number, element: any) => {
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

    nodesWithText.forEach((node: any) => {
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

      if (parentNodes.indexOf(parentNode[0]) === -1) {
        parentNodes.push(parentNode[0]);
      }

      const parentParentNode = parentNode.parent();
      if (parentParentNode) {
        updateScore(parentParentNode, upScore / 2);
        updateNodeCount(parentParentNode, 1);

        if (parentNodes.indexOf(parentParentNode[0]) === -1) {
          parentNodes.push(parentParentNode[0]);
        }
      }

      cnt += 1;
      i += 1;
    });

    let topNodeScore = 0;

    parentNodes.forEach(el => {
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
  canonicalLink: (doc: any, resourceUrl: any) => {
    const canonicalLinkTag = doc(
      "link[rel='canonical'], meta[property='og:url']"
    );
    if (canonicalLinkTag) {
      // check if it is link or meta
      if (canonicalLinkTag[0] && canonicalLinkTag[0].name === 'link') {
        const cleanedCanonicalLink = cleanNull(
          canonicalLinkTag.first().attr('href')
        );
        return cleanedCanonicalLink;
      } else if (canonicalLinkTag[0] && canonicalLinkTag[0].name === 'meta') {
        const cleanedCanonicalMeta = cleanNull(
          canonicalLinkTag.attr('content')
        );
        return cleanedCanonicalMeta;
      }
    }
    // return original url
    return resourceUrl.href;
  },
  copyright: (doc: any) => {
    const copyrightCandidates = doc(
      "p[class*='copyright'], div[class*='copyright'], span[class*='copyright'], li[class*='copyright'], p[id*='copyright'], div[id*='copyright'], span[id*='copyright'], li[id*='copyright']"
    );
    let text = copyrightCandidates.first().text();
    if (!text) {
      text = doc('body')
        .text()
        .replace(/\s*[\r\n]+\s*/g, '. ');
      if (text.indexOf('©') > 0) {
        const copyright = text
          .replace(/.*?©(\s*copyright)?([^,;:.|\r\n]+).*/gi, '$2')
          .trim();
        return cleanText(copyright);
      }
    }
    return null;
  },
  date(doc: any) {
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
    if (dateCandidates) {
      const dateContentCandidate = cleanNull(
        dateCandidates.first().attr('content')
      );
      const dateTimeCandidate = cleanNull(
        dateCandidates.first().attr('datetime')
      );
      const dateTextCandidate = cleanText(dateCandidates.first().text());
      if (dateContentCandidate) {
        return dateContentCandidate.trim();
      } else if (dateTimeCandidate) {
        return dateTimeCandidate.trim();
      } else if (dateTextCandidate) {
        return dateTextCandidate.trim();
      }
    }

    const jsonldData = this.jsonld(doc);
    if (jsonldData) {
      if (jsonldData.NewsArticle) {
        return jsonldData.NewsArticle[0].datePublished.trim();
      } else if (jsonldData.Article) {
        return jsonldData.Article[0].datePublished.trim();
      }
    }

    return null;
  },
  description: (doc: any) => {
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
  favicon: (doc: any) => {
    const tag = doc('link').filter((_index: number, element: any) => {
      if (doc(element).attr('rel')) {
        return doc(element)
          .attr('rel')
          .toLowerCase()
          .includes('icon');
      }
    });
    return tag.attr('href');
  },
  image: (doc: any) => {
    const images = doc(
      "meta[property='og:image'], meta[property='og:image:url'], meta[itemprop=image], meta[name='twitter:image:src'], meta[name='twitter:image'], meta[name='twitter:image0']"
    );

    if (images.length > 0 && cleanNull(images.first().attr('content'))) {
      const cleanedImages = cleanNull(images.first().attr('content')) || '';
      return cleanedImages.trim();
    }
    return null;
  },
  jsonld: (doc: any) => {
    const jsonldData: any = {};
    const jsonldTag = doc('script[type="application/ld+json"]');
    if (jsonldTag) {
      try {
        let parsedJSON = JSON.parse(jsonldTag.html());
        if (parsedJSON) {
          if (!Array.isArray(parsedJSON)) {
            parsedJSON = [parsedJSON];
          }
          parsedJSON.forEach((obj: any) => {
            const type = obj['@type'];
            jsonldData[type] = jsonldData[type] || [];
            jsonldData[type].push(obj);
          });
        }
      } catch (e) {
        console.log(`Error in jsonld parse - ${e}`);
      }
      return jsonldData;
    }
  },
  keywords: (doc: any) => {
    const keywordsTag = doc('meta[name="keywords"]');
    if (keywordsTag) {
      const cleansedKeywords = cleanNull(keywordsTag.attr('content'));
      if (cleansedKeywords) {
        return cleansedKeywords.trim();
      }
    }
    return '';
  },
  lang: (doc: any) => {
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
    return null;
  },
  links: (doc: any, topNode: any, lang: string | undefined | null) => {
    const links: object[] = [];

    const gatherLinks = () => {
      const nodes = topNode.find('a');
      nodes.each((_index: number, element: any) => {
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
  locale: (doc: any) => {
    const localeTag = doc("meta[property='og:locale']");
    if (localeTag) {
      const cleanedLocale = cleanNull(localeTag.first().attr('content'));
      if (cleanedLocale) {
        return cleanedLocale.trim();
      }
    }
  },
  publisher: (doc: any) => {
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
    return null;
  },
  siteName: (doc: any) => {
    const siteNameTag = doc(
      "meta[property='og:site_name'], meta[itemprop=name]"
    );
    if (siteNameTag) {
      const cleanedSiteName = cleanNull(siteNameTag.first().attr('content'));
      if (cleanedSiteName) {
        return cleanedSiteName.trim();
      }
    }
  },
  // Grab the title with soft truncation
  softTitle: (doc: any) => {
    const titleText = rawTitle(doc);
    return cleanTitle(titleText, ['|', ' - ', '»']);
  },
  tags: (doc: any) => {
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
    elements.each((_index: number, element: any) => {
      const tag = doc(element);
      const tagText = tag.text().trim();
      tagText.replace(/[\s\t\n]+/g, '');

      if (tagText && tagText.length > 0) {
        tags.push(tagText);
      }
    });

    return uniq(tags);
  },
  text: (doc: any, topNode: any, lang: string | undefined | null) => {
    if (topNode) {
      topNode = postCleanup(doc, topNode, lang);
      return formatter(doc, topNode, lang);
    } else {
      return '';
    }
  },
  // Grab the title of an html doc (excluding junk)
  // Hard-truncates titles containing colon or spaced dash
  title: (doc: any) => {
    const titleText = rawTitle(doc);
    const cleanedTitle = cleanTitle(titleText, ['|', ' - ', '»', ':']);
    return replaceCharacters(cleanedTitle, false, true);
  },
  type: (doc: any) => {
    const typeTag = doc("meta[name=type], meta[property='og:type']");
    if (typeTag) {
      const cleanedType = cleanNull(typeTag.first().attr('content'));
      if (cleanedType) {
        return cleanedType.trim();
      }
    }
    return '';
  },
  videos: (doc: any, topNode: any) => {
    const videolist: any = [];
    const videoCandidates = doc(topNode).find('iframe, embed, object, video');

    videoCandidates.each((_index: number, element: any) => {
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
    const results: any = [];
    videolist.forEach((vid: any) => {
      if (vid && vid.height && vid.width && urls.indexOf(vid.src) === -1) {
        results.push(vid);
        urls.push(vid.src);
      }
    });
    return results;
  }
};

export default extractor;
