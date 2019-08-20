function cleanArticleTags(doc: any) {
  const articles = doc('article');
  articles.each((_index: number, element: any) => {
    doc(element).removeAttr('id');
    doc(element).removeAttr('name');
    doc(element).removeAttr('class');
  });
  return doc;
}

function cleanBadTags(doc: any) {
  const removeNodesRe =
    '^side$|combx|retweet|mediaarticlerelated|menucontainer|navbar|partner-gravity-ad|video-full-transcript|storytopbar-bucket|utility-bar|inline-share-tools|comment|PopularQuestions|contact|foot|footer|Footer|footnote|cnn_strycaptiontxt|cnn_html_slideshow|cnn_strylftcntnt|links|meta$|shoutbox|sponsor|tags|socialnetworking|socialNetworking|cnnStryHghLght|cnn_stryspcvbx|^inset$|pagetools|post-attributes|welcome_form|contentTools2|the_answers|communitypromo|runaroundLeft|subscribe|vcard|articleheadings|date|^print$|popup|author-dropdown|tools|socialtools|byline|konafilter|KonaFilter|breadcrumbs|^fn$|wp-caption-text|legende|ajoutVideo|timestamp|js_replies';
  const regex = new RegExp(removeNodesRe, 'i');

  const toRemove = doc('*').filter((_index: number, element: any) => {
    const idEl = doc(element).attr('id');
    const classEl = doc(element).attr('class');
    const nameEl = doc(element).attr('name');
    if (!!idEl) {
      return idEl.match(regex);
    } else if (!!classEl) {
      return classEl.match(regex);
    } else if (!!nameEl) {
      return nameEl.match(regex);
    }
  });

  doc(toRemove).remove();
  return doc;
}

function cleanCodeBlocks(doc: any) {
  const nodes = doc("[class*='highlight-'], pre code, code, pre, ul.task-list");
  nodes.each((_index: number, element: any) => {
    doc(element).replaceWith(doc(element).text());
  });
  return doc;
}

function cleanEmTags(doc: any) {
  const ems = doc('em');
  ems.each((_index: number, element: any) => {
    const images = ems.find('img');
    if (images.length === 0) {
      doc(element).replaceWith(doc(element).html());
    }
  });
  return doc;
}

function cleanErrantLineBreaks(doc: any) {
  doc('p').each((_index: number, element: any) => {
    const node = doc(element);
    const contents = node.contents();

    doc(contents).each((_cindex: number, cElement: any) => {
      const contentsNode = doc(cElement);
      if (contentsNode[0].type === 'text') {
        contentsNode.replaceWith(
          contentsNode.text().replace(/([^\n])\n([^\n])/g, '$1 $2')
        );
      }
    });
  });
  return doc;
}

function cleanParaSpans(doc: any) {
  const nodes = doc('p span');
  nodes.each((_index: number, element: any) => {
    doc(element).replaceWith(doc(element).html());
  });
  return doc;
}

function cleanUnderlines(doc: any) {
  const nodes = doc('u');
  nodes.each((_index: number, element: any) => {
    doc(element).replaceWith(doc(element).html());
  });
  return doc;
}

function divToPara(doc: any, domType: any) {
  const divs = doc(domType);
  const lastCount = divs.length + 1;

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

  divs.each((_index: number, element: any) => {
    const div = doc(element);
    const items = div.find(tags.join(', '));

    if (items.length === 0) {
      replaceWithPara(doc, element);
    } else {
      const replaceNodes = getReplacementNodes(doc, div);

      let html = '';
      replaceNodes.forEach((node: any) => {
        if (node !== '') {
          html += `<p>${node}</p>`;
        }
      });

      div.empty();
      doc(div).replaceWith(`${html}`);
    }
  });
  return doc;
}

function getReplacementNodes(doc: any, div: any) {
  let replacementText: string[] = [];
  const nodesToReturn: any = [];
  const nodesToRemove: any = [];
  const children = div.contents();

  children.each((_index: number, element: any) => {
    const child = doc(element);

    if (child[0].name === 'p' && replacementText.length > 0) {
      const text = replacementText.join('');
      nodesToReturn.push(text);
      replacementText = [];
      nodesToReturn.push(doc(child).html());
    } else if (child[0].type === 'text') {
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
      nodesToReturn.push(doc(child).html());
    }
  });

  // flush out anything still remaining
  if (replacementText.length > 0) {
    const text = replacementText.join('');
    nodesToReturn.push(text);
    replacementText = [];
  }

  nodesToRemove.forEach((node: any) => {
    doc(node).remove();
  });

  return nodesToReturn;
}

function removeBodyClasses(doc: any) {
  doc('body').removeClass();
  return doc;
}

function removeDropCaps(doc: any) {
  const nodes = doc('span[class~=dropcap], span[class~=drop_cap]');
  nodes.each((_index: number, element: any) => {
    doc(element).replaceWith(doc(element).html());
  });
  return doc;
}

function removeNodesRegex(doc: any, pattern: any) {
  const toRemove = doc('div').filter((_index: number, element: any) => {
    const idEl = doc(element).attr('id');
    const classEl = doc(element).attr('class');
    if (!!idEl) {
      return idEl.match(pattern);
    } else if (!!classEl) {
      return classEl.match(pattern);
    }
  });

  doc(toRemove).remove();
  return doc;
}

function removeScriptsStyles(doc: any) {
  doc('script').remove();
  doc('style').remove();

  const comments = doc('*')
    .contents()
    .filter((_index: number, element: any) => {
      return element.type === 'comment';
    });

  return doc;
}

function replaceWithPara(doc: any, div: any) {
  const divContent = doc(div).html();
  doc(div).replaceWith(`<p>${divContent}</p>`);
  return doc;
}

const cleaner = (doc: any) => {
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
