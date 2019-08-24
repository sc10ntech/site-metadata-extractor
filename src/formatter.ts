import xregexp from 'xregexp';
import stopwords from './stopwords';

const addNewlineToBr = (doc: any, topNode: any) => {
  const brs = topNode.find('br');

  brs.each((_index: number, element: any) => {
    const br = doc(element);
    br.replaceWith('\n\n');
  });

  return doc;
};

const cleanParagraphText = (rawText: string) => {
  const text = rawText.trim();
  text.replace(/[\s\t]+/g, ' ');
  return text;
};

const convertToText = (doc: any, topNode: any) => {
  let texts: string[] = [];
  const nodes = topNode.contents();

  let hangingText = '';

  nodes.each((_index: number, element: any) => {
    const node = doc(element);
    const nodeType = node[0] ? node[0].type : null;
    const nodeName = node[0] ? node[0].name : null;

    if (nodeType === 'text') {
      hangingText += node.text();
      return true;
    } else if (nodeName === 'ul') {
      hangingText += ulToText(doc, node);
      return true;
    }

    if (hangingText.length > 0) {
      const txt = cleanParagraphText(hangingText);
      texts = texts.concat(txt.split(/\r?\n/));
      hangingText = '';
    }

    let text = cleanParagraphText(node.text());
    text = text.replace(/(\w+\.)([A-Z]+)/, '$1 $2');
    texts = texts.concat(text.split(/\r?\n/));
  });

  if (hangingText.length > 0) {
    const text = cleanParagraphText(hangingText);
    texts = texts = texts.concat(text.split(/\r?\n/));
  }

  texts = texts.map(txt => {
    return txt.trim();
  });

  const regex = xregexp('[\\p{Number}\\p{Letter}]');
  texts = texts.filter(txt => {
    return regex.test(txt);
  });

  return texts.join('\n\n');
};

const linksToText = (doc: any, topNode: any) => {
  const nodes = topNode.find('a');
  nodes.each((_index: number, element: any) => {
    doc(element).replaceWith(doc(element).html());
  });
  return doc;
};

const removeFewWordsParagraphs = (
  doc: any,
  topNode: any,
  lang: string | undefined | null
) => {
  const allNodes = topNode.find('*');

  allNodes.each((_index: number, element: any) => {
    const el = doc(element);
    const tag = el[0].name;
    const text = el.text();

    const stopWords = stopwords(text, lang);
    if (
      (tag !== 'br' || text !== '\\r') &&
      stopWords.stopWordCount < 3 &&
      el.find('object').length === 0 &&
      el.find('embed').length === 0
    ) {
      doc(el).remove();
    } else {
      const trimmed = text.trim();
      if (trimmed[0] === '(' && trimmed[trimmed.length - 1] === ')') {
        doc(el).remove();
      }
    }
  });

  return doc;
};

const removeNegativescoresNodes = (doc: any, topNode: any) => {
  const gravityItems = topNode.find('*[gravityScore]');

  gravityItems.each((_index: number, element: any) => {
    const item = doc(element);
    const score = parseInt(item.attr('gravityScore'), 10) || 0;

    if (score < 1) {
      doc(item).remove();
    }
  });

  return doc;
};

const replaceWithText = (doc: any, topNode: any) => {
  const nodes = topNode.find('b, strong, i, br, sup');
  nodes.each((_index: number, element: any) => {
    doc(element).replaceWith(doc(element).text());
  });
  return doc;
};

const ulToText = (doc: any, node: any) => {
  const nodes = node.find('li');
  let text = '';

  nodes.each((_index: number, element: any) => {
    text = `${text}\n * ${doc(element).text()}`;
  });
  text = `${text}\n`;
  return text;
};

const formatter = (doc: any, topNode: any, lang: string | undefined | null) => {
  removeNegativescoresNodes(doc, topNode);
  linksToText(doc, topNode);
  addNewlineToBr(doc, topNode);
  replaceWithText(doc, topNode);
  removeFewWordsParagraphs(doc, topNode, lang);
  return convertToText(doc, topNode).replace(/\n/g, ' ');
};

export default formatter;
