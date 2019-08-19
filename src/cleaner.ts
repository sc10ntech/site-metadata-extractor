import DOMPurify from 'dompurify';

function cleanArticleTags(doc) {
  const articles = doc('article');
  articles.each(() => {
    doc(this).removeAttr('id');
    doc(this).removeAttr('name');
    doc(this).removeAttr('class');
  });
  return doc;
}

function cleanBadTags(doc) {
  const removeNodesRe =
    '^side$|combx|retweet|mediaarticlerelated|menucontainer|navbar|partner-gravity-ad|video-full-transcript|storytopbar-bucket|utility-bar|inline-share-tools|comment|PopularQuestions|contact|foot|footer|Footer|footnote|cnn_strycaptiontxt|cnn_html_slideshow|cnn_strylftcntnt|links|meta$|shoutbox|sponsor|tags|socialnetworking|socialNetworking|cnnStryHghLght|cnn_stryspcvbx|^inset$|pagetools|post-attributes|welcome_form|contentTools2|the_answers|communitypromo|runaroundLeft|subscribe|vcard|articleheadings|date|^print$|popup|author-dropdown|tools|socialtools|byline|konafilter|KonaFilter|breadcrumbs|^fn$|wp-caption-text|legende|ajoutVideo|timestamp|js_replies';
  const regex = new RegExp(removeNodesRe, 'i');

  const toRemove = doc('*').filter(() => {
    return (
      doc(this)
        .attr('id')
        .match(regex) ||
      doc(this)
        .attr('class')
        .match(regex) ||
      doc(this)
        .attr('name')
        .match(regex)
    );
  });

  doc(toRemove).remove();
  return doc;
}

function cleanCodeBlocks(doc) {
  const nodes = doc("[class*='highlight-'], pre code, code, pre, ul.task-list");
  nodes.each(() => {
    doc(this).replaceWith(doc(this).text());
  });
  return doc;
}

function cleanEmTags(doc) {
  const ems = doc('em');
  ems.each(() => {
    const images = ems.find('img');
    if (images.length === 0) {
      doc(this).replaceWith(doc(this).html());
    }
  });
  return doc;
}

function cleanErrantLineBreaks(doc) {
  doc('p').each(() => {
    const node = doc(this);
    const contents = node.contents();

    doc(contents).each(() => {
      const contentsNode = doc(this);
      if (contentsNode[0].type === 'text') {
        contentsNode.replaceWith(
          contentsNode.text().replace(/([^\n])\n([^\n])/g, '$1 $2')
        );
      }
    });
  });
  return doc;
}

function cleanParaSpans(doc) {
  const nodes = doc('p span');
  nodes.each(() => {
    doc(this).replaceWith(doc(this).html());
  });
  return doc;
}

function cleanUnderlines(doc) {
  const nodes = doc('u');
  nodes.each(() => {
    doc(this).replaceWith(doc(this).html());
  });
  return doc;
}

function divToPara(doc, domType) {
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

  divs.each(() => {
    const div = doc(this);
    const items = div.find(tags.join(', '));

    if (items.length === 0) {
      replaceWithPara(doc, this);
    } else {
      const replaceNodes = getReplacementNodes(doc, div);

      let html = '';
      replaceNodes.forEach(node => {
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

function getReplacementNodes(doc, div) {
  let replacementText = [];
  const nodesToReturn = [];
  const nodesToRemove = [];
  const children = div.contents();

  children.each(() => {
    const child = doc(this);

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
        // otherwise
      } else {
        nodesToReturn.push(doc(child).html());
      }
    }
  });

  // flush out anything still remaining
  if (replacementText.length > 0) {
    const text = replacementText.join('');
    nodesToReturn.push(text);
    replacementText = [];
  }

  nodesToRemove.forEach(node => {
    doc(node).remove();
  });

  return nodesToReturn;
}

function removeBodyClass(doc) {
  doc('body').removeClass();
  return doc;
}

function removeDropCaps(doc) {
  const nodes = doc('span[class~=dropcap], span[class~=drop_cap]');
  nodes.each(() => {
    doc(this).replaceWith(doc(this).html());
  });
  return doc;
}

function removeNodesRegex(doc, pattern) {
  const toRemove = doc('div').filter(() => {
    return (
      doc(this)
        .attr('id')
        .match(pattern) ||
      doc(this)
        .attr('class')
        .match(pattern)
    );
  });

  doc(toRemove).remove();
  return doc;
}

function removeScriptsStyles(doc) {
  doc('script').remove();
  doc('style').remove();

  const comments = doc('*')
    .contents()
    .filter(() => {
      return this.type === 'comment';
    });

  return doc;
}

function replaceWithPara(doc, div) {
  const divContent = doc(div).html();
  doc(div).replaceWith(`<p>${divContent}</p>`);
  return doc;
}

const cleaner = doc => {};

export default cleaner;
