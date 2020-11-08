import cheerio from 'cheerio';
import fs from 'fs';
import extractor from '../src/extractor';

import cnbcjsonld from './fixtures/test_cnbc2_jsonld.json';
import engadetjsonld from './fixtures/test_engadget2_jsonld.json';

describe('Extractor', () => {
  it('exists', () => {
    expect(extractor).toBeDefined();
  });

  it('returns a blank title', () => {
    const doc = cheerio.load('<html><head><title></title></head></html>');
    const title = extractor.title(doc);
    expect(title).toEqual('');
  });

  it('returns a simple title', () => {
    const doc = cheerio.load('<html><head><title>Hello!</title></head></html>');
    const title = extractor.title(doc);
    expect(title).toEqual('Hello!');
  });

  it('returns a soft title chunk without truncation', () => {
    const doc = cheerio.load(
      '<html><head><title>University Budgets: Where Your Fees Go | Top Universities</title></head></html>'
    );
    const title = extractor.softTitle(doc);
    expect(title).toEqual('University Budgets: Where Your Fees Go');
  });

  it('prefers the meta tag title', () => {
    const doc = cheerio.load(
      '<html><head><title>This is my page - mysite</title><meta property="og:title" content="Open graph title"></head></html>'
    );
    const title = extractor.title(doc);
    expect(title).toEqual('Open graph title');
  });

  it('falls back to title if empty meta tag', () => {
    const doc = cheerio.load(
      '<html><head><title>This is my page - mysite</title><meta property="og:title" content=""></head></html>'
    );
    const title = extractor.title(doc);
    expect(title).toEqual('This is my page');
  });

  it('returns another simple title chunk', () => {
    const doc = cheerio.load(
      '<html><head><title>coolsite.com: This is my page</title></head></html>'
    );
    const title = extractor.title(doc);
    expect(title).toEqual('This is my page');
  });

  it('returns a title chunk without &#65533;', () => {
    const doc = cheerio.load(
      '<html><head><title>coolsite.com: &#65533; This&#65533; is my page</title></head></html>'
    );
    const title = extractor.title(doc);
    expect(title).toEqual('This is my page');
  });

  it('returns the first title', () => {
    const doc = cheerio.load(
      '<html><head><title>This is my page</title></head><svg xmlns="http://www.w3.org/2000/svg"><title>svg title</title></svg></html>'
    );
    const title = extractor.title(doc);
    expect(title).toEqual('This is my page');
  });

  it('handles missing favicons', () => {
    const urlObj = new URL('http://localhost');
    const doc = cheerio.load('<html><head><title></title></head></html>');
    const favicon = extractor.favicon(doc, urlObj);
    expect(favicon).toEqual('');
  });

  it('returns the article published meta data', () => {
    const doc = cheerio.load(
      '<html><head><meta property="article:published_time" content="2014-10-15T00:01:03+00:00" /></head></html>'
    );
    const date = extractor.date(doc);
    expect(date).toEqual('2014-10-15T00:01:03+00:00');
  });

  it('returns the article dublin core meta date', () => {
    const doc = cheerio.load(
      '<html><head><meta name="DC.date.issued" content="2014-10-15T00:01:03+00:00" /></head></html>'
    );
    const date = extractor.date(doc);
    expect(date).toEqual('2014-10-15T00:01:03+00:00');
  });

  it('returns the date in the <time> element', () => {
    const doc = cheerio.load(
      '<html><head></head><body><time>24 May, 2010</time></body></html>'
    );
    const date = extractor.date(doc);
    expect(date).toEqual('24 May, 2010');
  });

  it('returns the date in the <time> element datetime attribute', () => {
    const doc = cheerio.load(
      '<html><head></head><body><time datetime="2010-05-24T13:47:52+0000">24 May, 2010</time></body></html>'
    );
    const date = extractor.date(doc);
    expect(date).toEqual('2010-05-24T13:47:52+0000');
  });

  it('returns empty string if date eq "null"', () => {
    const doc = cheerio.load(
      '<html><head><meta property="article:published_time" content="null" /></head></html>'
    );
    const date = extractor.date(doc);
    expect(date).toEqual('');
  });

  it('returns the copyright line element', () => {
    const doc = cheerio.load(
      "<html><head></head><body><div>Some stuff</div><ul><li class='copyright'><!-- // some garbage -->© 2016 The World Bank Group, All Rights Reserved.</li></ul></body></html>"
    );
    const copyright = extractor.copyright(doc);
    expect(copyright).toEqual('2016 The World Bank Group');
  });

  it('returns the copyright found in the text', () => {
    const doc = cheerio.load(
      '<html><head></head><body><div>Some stuff</div><ul>© 2016 The World Bank Group, All Rights Reserved\nSome garbage following</li></ul></body></html>'
    );
    const copyright = extractor.copyright(doc);
    expect(copyright).toEqual('2016 The World Bank Group');
  });

  it('returns empty string if no copyright is in the text', () => {
    const doc = cheerio.load('<html><head></head><body></body></html>');
    const copyright = extractor.copyright(doc);
    expect(copyright).toEqual('');
  });

  it('returns the article published meta author', () => {
    const doc = cheerio.load(
      '<html><head><meta property="article:author" content="Joe Bloggs" /></head></html>'
    );
    const author = extractor.author(doc);
    expect(JSON.stringify(author)).toEqual(JSON.stringify(['Joe Bloggs']));
  });

  it('returns the meta author', () => {
    const doc = cheerio.load(
      '<html><head><meta property="article:author" content="Sarah Smith" /><meta name="author" content="Joe Bloggs" /></head></html>'
    );
    const author = extractor.author(doc);
    expect(JSON.stringify(author)).toEqual(
      JSON.stringify(['Sarah Smith', 'Joe Bloggs'])
    );
  });

  it('returns the named author in the text as fallback', () => {
    const doc = cheerio.load(
      '<html><head></head><body><span class="author"><a href="/author/gary-trust-6318" class="article__author-link">Gary Trust</a></span></body></html>'
    );
    const author = extractor.author(doc);
    expect(JSON.stringify(author)).toEqual(JSON.stringify(['Gary Trust']));
  });

  it('returns the meta author but ignore "null" value', () => {
    const doc = cheerio.load(
      '<html><head><meta property="article:author" content="null" /><meta name="author" content="Joe Bloggs" /></head></html>'
    );
    const author = extractor.author(doc);
    expect(JSON.stringify(author)).toEqual(JSON.stringify(['Joe Bloggs']));
  });

  it('returns the meta publisher', () => {
    const doc = cheerio.load(
      '<html><head><meta property="og:site_name" content="Polygon" /><meta name="author" content="Griffin McElroy" /></head></html>'
    );
    const publisher = extractor.publisher(doc);
    expect(publisher).toEqual('Polygon');
  });

  it('returns empty string if publisher equals "null"', () => {
    const doc = cheerio.load(
      '<html><head><meta property="og:site_name" content="null" /></head></html>'
    );
    const publisher = extractor.publisher(doc);
    expect(publisher).toEqual('');
  });

  it('returns empty string if image equals "null"', () => {
    const doc = cheerio.load(
      '<html><head><meta property="og:image" content="null" /></head></html>'
    );
    const image = extractor.image(doc);
    expect(image).toEqual('');
  });

  describe('Expanded Meta Data Extraction', () => {
    it('returns canonical url in link element', () => {
      const doc = cheerio.load(
        '<html><head><link rel="canonical" href="https://www.cnbc.com"/></head></html>'
      );
      const canonicalUrl = extractor.canonicalLink(doc, 'https://www.cnbc.com');
      expect(canonicalUrl).toEqual('https://www.cnbc.com');
    });

    it('returns canonical url in meta og:url element', () => {
      const doc = cheerio.load(
        '<html><head><meta property="og:url" content="https://www.cnbc.com"/></head></html>'
      );
      const canonicalUrl = extractor.canonicalLink(doc, 'https://www.cnbc.com');
      expect(canonicalUrl).toEqual('https://www.cnbc.com');
    });

    it('falls back to original url if no canonical url elements detected', () => {
      const doc = cheerio.load('<html><head><title>CNBC</title></head></html>');
      const canonicalUrl = extractor.canonicalLink(doc, 'https://www.cnbc.com');
      expect(canonicalUrl).toEqual('https://www.cnbc.com');
    });

    it('returns description from meta description', () => {
      const doc = cheerio.load(
        '<html><head><meta itemProp="description" name="description" content="CNBC is the world leader in business news and real-time financial market coverage. Find fast, actionable information."/></head></html>'
      );
      const description = extractor.description(doc);
      expect(description).toEqual(
        'CNBC is the world leader in business news and real-time financial market coverage. Find fast, actionable information.'
      );
    });

    it('returns description from meta open graph description', () => {
      const doc = cheerio.load(
        '<html><head><meta property="og:description" content="CNBC is the world leader in business news and real-time financial market coverage. Find fast, actionable information."/></head></html>'
      );
      const description = extractor.description(doc);
      expect(description).toEqual(
        'CNBC is the world leader in business news and real-time financial market coverage. Find fast, actionable information.'
      );
    });

    it('returns empty string if description equals "null"', () => {
      const doc = cheerio.load('<html><head><title>CNBC</title></head></html>');
      const description = extractor.description(doc);
      expect(description).toEqual('');
    });

    it('returns jsonld of article pages', () => {
      const html = fs
        .readFileSync('tests/fixtures/test_engadget2.html')
        .toString();
      const originalDoc = cheerio.load(html);

      const jsonld = extractor.jsonld(originalDoc);
      expect(JSON.stringify(jsonld)).toEqual(JSON.stringify(engadetjsonld));
    });

    it('returns jsonld of news article pages', () => {
      const html = fs.readFileSync('tests/fixtures/test_cnbc2.html').toString();
      const originalDoc = cheerio.load(html);

      const jsonld = extractor.jsonld(originalDoc);
      expect(true).toEqual(true);
      expect(JSON.stringify(jsonld)).toEqual(JSON.stringify(cnbcjsonld));
    });

    it('returns nothing if jsonld is neither of an article or news article page', () => {
      const doc = cheerio.load(
        '<html><head><meta property="og:site_name" content="Polygon" /><meta name="author" content="Griffin McElroy" /></head><body><p>Hello world!!</p></body></html>'
      );

      const jsonld = extractor.jsonld(doc);
      expect(jsonld).toBeNull();
    });

    it('returns keywords from meta element', () => {
      const doc = cheerio.load(
        '<html><head><meta itemProp="keywords" name="keywords" content="Select_Advice,Select_Monetized,Credit card services,Consumer spending,Personal finance,Approved for Apple"/></head></html>'
      );

      const keywords = extractor.keywords(doc);
      expect(keywords).toEqual(
        'Select_Advice,Select_Monetized,Credit card services,Consumer spending,Personal finance,Approved for Apple'
      );
    });

    it('returns empty string if keywords meta equals "null"', () => {
      const doc = cheerio.load(
        '<html><head><meta property="og:site_name" content="Polygon" /><meta name="author" content="Griffin McElroy" /></head><body><p>Hello world!!</p></body></html>'
      );
      const keywords = extractor.keywords(doc);
      expect(keywords).toEqual('');
    });

    it('returns locale from open graph meta element', () => {
      const doc = cheerio.load(
        '<html><head><meta property="og:locale" content="en_US" /><meta name="author" content="Griffin McElroy" /></head><body><p>Hello world!!</p></body></html>'
      );
      const locale = extractor.locale(doc);
      expect(locale).toEqual('en_US');
    });

    it('returns empty string if locale meta equals "null"', () => {
      const doc = cheerio.load(
        '<html><head><meta property="og:site_name" content="Polygon" /><meta name="author" content="Griffin McElroy" /></head><body><p>Hello world!!</p></body></html>'
      );
      const locale = extractor.locale(doc);
      expect(locale).toEqual('');
    });

    it('returns tags from anchors with rel attribute set to tag', () => {
      const doc = cheerio.load(
        '<!DOCTYPE html><head><title>Testing</title></head><body><div><ul><li><a href="/tag/hello-world" rel="tag">hello world</a></li><li><a href="/tag/extracting" rel="tag">extracting</a></li><li><a href="/regular-link">Regular link</a></li></ul></div></body></html>'
      );

      const tags = extractor.tags(doc);
      expect(tags).toEqual(['hello world', 'extracting']);
    });

    it('returns an empty list if tags are not found', () => {
      const doc = cheerio.load(
        '<html><head><meta property="og:site_name" content="Polygon" /><meta name="author" content="Griffin McElroy" /></head><body><p>Hello world!!</p></body></html>'
      );
      const tags = extractor.tags(doc);
      expect(tags).toEqual([]);
    });

    it('returns site type from open graph meta element', () => {
      const doc = cheerio.load(
        '<!DOCTYPE html><head><title>Testing</title><meta property="og:type" content="website"/></head><body><div><ul><li><a href="/tag/hello-world" rel="tag">hello world</a></li><li><a href="/tag/extracting" rel="tag">extracting</a></li><li><a href="/regular-link">Regular link</a></li></ul></div></body></html>'
      );

      const type = extractor.type(doc);
      expect(type).toEqual('website');
    });

    it('returns empty string if type meta is "null"', () => {
      const doc = cheerio.load(
        '<!DOCTYPE html><head><title>Testing</title></head><body><div><ul><li><a href="/tag/hello-world" rel="tag">hello world</a></li><li><a href="/tag/extracting" rel="tag">extracting</a></li><li><a href="/regular-link">Regular link</a></li></ul></div></body></html>'
      );

      const type = extractor.type(doc);
      expect(type).toEqual('');
    });
  });
});
