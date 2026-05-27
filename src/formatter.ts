import type { Cheerio, CheerioAPI } from "cheerio";
import type { AnyNode, Element } from "domhandler";
import xregexp from "xregexp";
import stopwords from "./stopwords";

function getTagName(node: Cheerio<AnyNode>): string {
  const element = node.get(0) as Element | undefined;
  return element?.tagName || "";
}

export const addNewlineToBr = (
  doc: CheerioAPI,
  topNode: Cheerio<AnyNode>,
): CheerioAPI => {
  const brs = topNode.find("br");

  brs.each((_index: number, element: AnyNode) => {
    const br = doc(element);
    br.replaceWith("\n\n");
  });

  return doc;
};

export const cleanParagraphText = (rawText: string): string => {
  const text = rawText.trim();
  text.replace(/[\s\t]+/g, " ");
  return text;
};

export const convertToText = (
  doc: CheerioAPI,
  topNode: Cheerio<AnyNode>,
): string => {
  let texts: string[] = [];
  const nodes = topNode.contents();

  let hangingText = "";

  nodes.each((_index: number, element: AnyNode) => {
    const node = doc(element);
    const firstNode = node.get(0);
    const nodeType = firstNode ? firstNode.type : null;
    const nodeName = getTagName(node);

    if (nodeType === "text") {
      hangingText += node.text();
      return true;
    } else if (nodeName === "ul") {
      hangingText += ulToText(doc, node);
      return true;
    }

    if (hangingText.length > 0) {
      const txt = cleanParagraphText(hangingText);
      texts = texts.concat(txt.split(/\r?\n/));
      hangingText = "";
    }

    let text = cleanParagraphText(node.text());
    text = text.replace(/(\w+\.)([A-Z]+)/, "$1 $2");
    texts = texts.concat(text.split(/\r?\n/));
  });

  if (hangingText.length > 0) {
    const text = cleanParagraphText(hangingText);
    texts = texts = texts.concat(text.split(/\r?\n/));
  }

  texts = texts.map((txt) => {
    return txt.trim();
  });

  const regex = xregexp("[\\p{Number}\\p{Letter}]");
  texts = texts.filter((txt) => {
    return regex.test(txt);
  });

  return texts.join("\n\n");
};

export const linksToText = (
  doc: CheerioAPI,
  topNode: Cheerio<AnyNode>,
): CheerioAPI => {
  const nodes = topNode.find("a");
  nodes.each((_index: number, element: AnyNode) => {
    const htmlEl = doc(element).html();
    if (htmlEl) {
      doc(element).replaceWith(htmlEl);
    }
  });
  return doc;
};

export const removeFewWordsParagraphs = (
  doc: CheerioAPI,
  topNode: Cheerio<AnyNode>,
  lang: string,
): CheerioAPI => {
  const allNodes = topNode.find("*");

  allNodes.each((_index: number, element: AnyNode) => {
    const el = doc(element);
    const tag = getTagName(el);
    const text = el.text();

    const stopWords = stopwords(text, lang);
    if (
      (tag !== "br" || text !== "\\r") &&
      stopWords.stopWordCount < 3 &&
      el.find("object").length === 0 &&
      el.find("embed").length === 0
    ) {
      doc(el).remove();
    } else {
      const trimmed = text.trim();
      if (trimmed[0] === "(" && trimmed[trimmed.length - 1] === ")") {
        doc(el).remove();
      }
    }
  });

  return doc;
};

export const removeNegativescoresNodes = (
  doc: CheerioAPI,
  topNode: Cheerio<AnyNode>,
): CheerioAPI => {
  const gravityItems = topNode.find("*[gravityScore]");

  gravityItems.each((_index: number, element: AnyNode) => {
    let score = 0;
    const item = doc(element);
    const gravityScore = item.attr("gravityScore");
    if (gravityScore) {
      score = parseInt(gravityScore, 10) || 0;
    }

    if (score < 1) {
      doc(item).remove();
    }
  });

  return doc;
};

export const replaceCharacters = (
  text: string,
  html: boolean,
  chars: boolean,
): string => {
  let processedText = text;
  // if element does not match any in map and starts with & and ends with ;, replace with empty string
  const htmlEntities: Record<string, string> = {
    "&amp;": "&",
    "&apos;": "'",
    "&cent;": "¢",
    "&copy;": "©",
    "&euro;": "€",
    "&gt;": ">",
    "&lt;": "<",
    "&nbsp;": " ",
    "&pound;": "£",
    "&quot;": '"',
    "&reg;": "®",
    "&yen;": "¥",
  };

  const escapeChars: Record<string, string> = {
    '"': '"',
    "'": "'",
    // tslint:disable-next-line: object-literal-sort-keys
    "\n": " ",
    "\r": " ",
  };

  if (html) {
    for (const key of Object.keys(htmlEntities)) {
      const htmlregex = new RegExp(key, "g");
      processedText = processedText.replace(htmlregex, htmlEntities[key]);
    }
  }

  if (chars) {
    for (const key of Object.keys(escapeChars)) {
      const escapeCharsRegex = new RegExp(key, "g");
      processedText = processedText.replace(escapeCharsRegex, escapeChars[key]);
    }
  }

  return processedText;
};

export const replaceWithText = (
  doc: CheerioAPI,
  topNode: Cheerio<AnyNode>,
): CheerioAPI => {
  const nodes = topNode.find("b, strong, i, br, sup");
  nodes.each((_index: number, element: AnyNode) => {
    doc(element).replaceWith(doc(element).text());
  });
  return doc;
};

export const ulToText = (doc: CheerioAPI, node: Cheerio<AnyNode>): string => {
  const nodes = node.find("li");
  let text = "";

  nodes.each((_index: number, element: AnyNode) => {
    text = `${text}\n * ${doc(element).text()}`;
  });
  text = `${text}\n`;
  return text;
};

const formatter = (
  doc: CheerioAPI,
  topNode: Cheerio<AnyNode>,
  lang: string,
): string => {
  removeNegativescoresNodes(doc, topNode);
  linksToText(doc, topNode);
  addNewlineToBr(doc, topNode);
  replaceWithText(doc, topNode);
  removeFewWordsParagraphs(doc, topNode, lang);
  const convertedText = convertToText(doc, topNode).replace(/\n/g, " ");
  return replaceCharacters(convertedText, false, true);
};

export default formatter;
