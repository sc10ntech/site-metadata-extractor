import xregexp from 'xregexp';
import stopwords from './stopwords';

const addNewlineToBr = (doc, topNode) => {
  const brs = topNode.find('br');

  brs.each(() => {
    const br = doc(this);
    br.replaceWith('\n\n');
  });

  return doc;
};

const cleanParagraphText = rawText => {
  const text = rawText.trim();
  text.replace(/[\s\t]+/g, ' ');
  return text;
};

const convertToText = (doc, topNode) => {
  let texts = [];
  const nodes = topNode.contents();

  let hangingText = '';

  nodes.each(() => {
    const node = doc(this);
    const nodeType = node[0].type;
    const nodeName = node[0].name;

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

  texts = texts.map(text => {
    return text.trim();
  });

  const regex = xregexp('[\\p{Number}\\p{Letter}]');
  texts = texts.filter(text => {
    return regex.test(text);
  });
  texts.join('\n\n');

  return doc;
};

const linksToText = (doc, topNode) => {
  const nodes = topNode.find('a');
  nodes.each(() => {
    doc(this).replaceWith(doc(this).html());
  });
  return doc;
};

const removeFewWordsParagraphs = (doc, topNode, lang) => {
  const allNodes = topNode.find('*');

  allNodes.each(() => {
    const el = doc(this);
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

const removeNegativescoresNodes = (doc, topNode) => {
  const gravityItems = topNode.find('*[gravityScore]');

  gravityItems.each(() => {
    const item = doc(this);
    const score = parseInt(item.attr('gravityScore'), 10) || 0;

    if (score < 1) {
      doc(item).remove();
    }
  });

  return doc;
};

const replaceWithText = (doc, topNode) => {
  const nodes = topNode.find('b, strong, i, br, sup');
  nodes.each(() => {
    doc(this).replaceWith(doc(this).text());
  });
  return doc;
};

const ulToText = (doc, node) => {
  const nodes = node.find('li');
  let text = '';

  nodes.each(() => {
    text = `${text}\n * ${doc(this).text()}`;
  });
  text = `${text}\n`;
  return text;
};

const formatter = (doc, topNode, lang) => {
  removeNegativescoresNodes(doc, topNode);
  linksToText(doc, topNode);
  addNewlineToBr(doc, topNode);
  replaceWithText(doc, topNode);
  removeFewWordsParagraphs(doc, topNode, lang);
  return convertToText(doc, topNode);
};

export default formatter;
