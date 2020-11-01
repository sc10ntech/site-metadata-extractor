import cheerio from 'cheerio';

function cleanArticleTags(doc: cheerio.Root) {
  const articles = doc('article');
  articles.each((_index: number, element: cheerio.Element) => {
    doc(element).removeAttr('id');
    doc(element).removeAttr('name');
    doc(element).removeAttr('class');
  });
  return doc;
}

function cleanBadTags(doc: cheerio.Root) {
  const removeNodesRe =
    '^side$|combx|retweet|mediaarticlerelated|menucontainer|navbar|partner-gravity-ad|video-full-transcript|storytopbar-bucket|utility-bar|inline-share-tools|comment|PopularQuestions|contact|foot|footer|Footer|footnote|cnn_strycaptiontxt|cnn_html_slideshow|cnn_strylftcntnt|links|meta$|shoutbox|sponsor|tags|socialnetworking|socialNetworking|cnnStryHghLght|cnn_stryspcvbx|^inset$|pagetools|post-attributes|welcome_form|contentTools2|the_answers|communitypromo|runaroundLeft|subscribe|vcard|articleheadings|date|^print$|popup|author-dropdown|tools|socialtools|byline|konafilter|KonaFilter|breadcrumbs|^fn$|wp-caption-text|legende|ajoutVideo|timestamp|js_replies';
  const regex = new RegExp(removeNodesRe, 'i');

  const toRemove = doc('*').filter((_index, el) => {
    const idEl = doc(el).attr('id');
    const classEl = doc(el).attr('class');
    const nameEl = doc(el).attr('name');
    if (idEl) {
      return idEl.match(regex) !== null;
    } else if (classEl) {
      return classEl.match(regex) !== null;
    } else if (nameEl) {
      return nameEl.match(regex) !== null;
    }
    return false;
  });

  doc(toRemove).remove();
  return doc;
}

function cleanCodeBlocks(doc: cheerio.Root) {
  const nodes = doc("[class*='highlight-'], pre code, code, pre, ul.task-list");
  nodes.each((_index: number, element: cheerio.Element) => {
    doc(element).replaceWith(doc(element).text());
  });
  return doc;
}

function cleanEmTags(doc: cheerio.Root) {
  const ems = doc('em');
  ems.each((_index: number, element: cheerio.Element) => {
    const images = ems.find('img');
    if (images.length === 0) {
      const htmlEl = doc(element).html();
      if (htmlEl) {
        doc(element).replaceWith(htmlEl);
      }
    }
  });
  return doc;
}

function cleanErrantLineBreaks(doc: cheerio.Root) {
  doc('p').each((_index: number, element: cheerio.Element) => {
    const node = doc(element);
    const contents = node.contents();

    doc(contents).each((_cindex: number, cElement: cheerio.Element) => {
      const contentsNode = doc(cElement);
      if (contentsNode && contentsNode[0] && contentsNode[0].type === 'text') {
        contentsNode.replaceWith(
          contentsNode.text().replace(/([^\n])\n([^\n])/g, '$1 $2')
        );
      }
    });
  });
  return doc;
}

function cleanParaSpans(doc: cheerio.Root) {
  const nodes = doc('p span');
  nodes.each((_index: number, element: cheerio.Element) => {
    const htmlEl = doc(element).html();
    if (htmlEl) {
      doc(element).replaceWith(htmlEl);
    }
  });
  return doc;
}

function cleanUnderlines(doc: cheerio.Root) {
  const nodes = doc('u');
  nodes.each((_index: number, element: cheerio.Element) => {
    const htmlEl = doc(element).html();
    if (htmlEl) {
      doc(element).replaceWith(htmlEl);
    }
  });
  return doc;
}

function divToPara(doc: cheerio.Root, domType: string) {
  const divs = doc(domType);

  const tags = [
    'a',
    'blockquote',
    'dl',
    'div',
    'img',
    'ol',
    'p',
    'pre',
    'table',
    'ul'
  ];

  divs.each((_index: number, element: cheerio.Element) => {
    const div = doc(element);
    const items = div.find(tags.join(', '));

    if (items.length === 0) {
      replaceWithPara(doc, element);
    } else {
      const replaceNodes = getReplacementNodes(doc, div);

      let html = '';
      replaceNodes.forEach((node) => {
        if (node.text() !== '') {
          html += `<p>${node}</p>`;
        }
      });

      div.empty();
      doc(div).replaceWith(`${html}`);
    }
  });
  return doc;
}

function getReplacementNodes(
  doc: cheerio.Root,
  div: cheerio.Cheerio
): cheerio.Cheerio[] {
  let replacementText: string[] = [];
  const nodesToReturn: cheerio.Cheerio[] = [];
  const nodesToRemove: cheerio.Cheerio[] = [];
  const children = div.contents();

  children.each((_index: number, element: cheerio.Element) => {
    const child = doc(element);

    if (child[0] && child[0].name === 'p' && replacementText.length > 0) {
      const text = replacementText.join('');
      const textNodeLoad = cheerio.load(`<p>${text}</p>`);
      const textNode = doc(textNodeLoad);
      // create a node out of text and push
      nodesToReturn.push(textNode);
      replacementText = [];
      const childEl = doc(element);
      if (childEl) {
        nodesToReturn.push(childEl);
      }
    } else if (child[0] && child[0].type === 'text') {
      const childTextNode = child;
      const childText = child.text();
      const replaceText = childText
        .replace(/\n/g, '\n\n')
        .replace(/\t/g, '')
        .replace(/^\s+$/g, '');

      if (replaceText.length > 1) {
        let previousSiblingNode = childTextNode.prev();

        while (
          previousSiblingNode[0] &&
          previousSiblingNode[0].name === 'a' &&
          previousSiblingNode.attr('grv-usedalready') !== 'yes'
        ) {
          const outer = ' ' + doc.html(previousSiblingNode) + ' ';
          replacementText.push(outer);
          nodesToRemove.push(previousSiblingNode);
          previousSiblingNode.attr('grv-usedalready', 'yes');
          previousSiblingNode = previousSiblingNode.prev();
        }

        replacementText.push(replaceText);
        const nextSiblingNode = childTextNode.next();

        while (
          nextSiblingNode[0] &&
          nextSiblingNode[0].name === 'a' &&
          nextSiblingNode.attr('grv-usedalready') !== 'yes'
        ) {
          const outer = ' ' + doc.html(nextSiblingNode) + ' ';
          replacementText.push(outer);
          nodesToRemove.push(nextSiblingNode);
          nextSiblingNode.attr('grv-usedalready', 'yes');
          previousSiblingNode = nextSiblingNode.next();
        }
      }
      // otherwise
    } else {
      const childEl = doc(child);
      if (childEl) {
        nodesToReturn.push(childEl);
      }
    }
  });

  // flush out anything still remaining
  if (replacementText.length > 0) {
    const text = replacementText.join('');
    const textNodeLoad = cheerio.load(`<p>${text}</p>`);
    const textNode = doc(textNodeLoad);
    nodesToReturn.push(textNode);
    replacementText = [];
  }

  nodesToRemove.forEach((node: cheerio.Cheerio) => {
    doc(node).remove();
  });

  return nodesToReturn;
}

function removeBodyClasses(doc: cheerio.Root): cheerio.Root {
  doc('body').removeClass();
  return doc;
}

function removeDropCaps(doc: cheerio.Root): cheerio.Root {
  const nodes = doc('span[class~=dropcap], span[class~=drop_cap]');
  nodes.each((_index: number, element: cheerio.Element) => {
    const htmlEl = doc(element).html();
    if (htmlEl) {
      doc(element).replaceWith(htmlEl);
    }
  });
  return doc;
}

function removeNodesRegex(doc: cheerio.Root, pattern: RegExp) {
  const toRemove = doc('div').filter((_index, element) => {
    const idEl = doc(element).attr('id');
    const classEl = doc(element).attr('class');
    if (idEl) {
      return idEl.match(pattern) !== null;
    } else if (classEl) {
      return classEl.match(pattern) !== null;
    }
    return false;
  });
  doc(toRemove).remove();
  return doc;
}

function removeScriptsStyles(doc: cheerio.Root): cheerio.Cheerio {
  doc('script').remove();
  doc('style').remove();

  const comments = doc('*')
    .contents()
    .filter((_index: number, element: cheerio.Element) => {
      return element.type === 'comment';
    });

  return doc(comments).remove();
}

function replaceWithPara(
  doc: cheerio.Root,
  div: cheerio.Element
): cheerio.Root {
  const divContent = doc(div).html();
  doc(div).replaceWith(`<p>${divContent}</p>`);
  return doc;
}

const cleaner = (doc: cheerio.Root): cheerio.Root => {
  removeBodyClasses(doc);
  cleanArticleTags(doc);
  cleanEmTags(doc);
  cleanCodeBlocks(doc);
  removeDropCaps(doc);
  removeScriptsStyles(doc);
  cleanBadTags(doc);
  removeNodesRegex(doc, /^caption$/);
  removeNodesRegex(doc, / google /);
  removeNodesRegex(doc, /^[^entry-]more.*$/);
  removeNodesRegex(doc, /[^-]facebook/);
  removeNodesRegex(doc, /facebook-broadcasting/);
  removeNodesRegex(doc, /[^-]twitter/);
  cleanParaSpans(doc);
  cleanUnderlines(doc);
  cleanErrantLineBreaks(doc);
  divToPara(doc, 'div');
  divToPara(doc, 'span');
  return doc;
};

export default cleaner;
