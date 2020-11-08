import cheerio from 'cheerio';
import fs from 'fs';
import cleaner from '../src/cleaner';

describe('Cleaner', () => {
  it('exists', () => {
    expect(cleaner).toBeDefined();
  });

  it('removes body classes', () => {
    const html = fs
      .readFileSync('tests/fixtures/test_businessWeek1.html')
      .toString();
    const originalDoc = cheerio.load(html);

    expect(originalDoc('body')?.attr('class')?.trim()).toEqual('magazine');

    const newDoc = cleaner(originalDoc);
    expect(newDoc('body')?.attr('class')).toEqual('');
  });

  it('removes article attributes', () => {
    const html = fs
      .readFileSync('tests/fixtures/test_gizmodo1.html')
      .toString();
    const originalDoc = cheerio.load(html);

    expect(originalDoc('article')?.attr('class')?.trim()).toEqual(
      'row post js_post_item status-published commented js_amazon_module'
    );

    const newDoc = cleaner(originalDoc);
    expect(newDoc('article')?.attr('class')).toBeUndefined();
  });

  it('removes em tag from image-less ems', () => {
    const html = fs.readFileSync('tests/fixtures/test_gizmodo1.html');
    const originalDoc = cheerio.load(html);

    expect(originalDoc('em').length).toEqual(6);

    const newDoc = cleaner(originalDoc);
    expect(newDoc('em').length).toEqual(0);
  });

  it('removes scripts', () => {
    const html = fs
      .readFileSync('tests/fixtures/test_businessWeek1.html')
      .toString();
    const originalDoc = cheerio.load(html);

    expect(originalDoc('script').length).toEqual(40);

    const newDoc = cleaner(originalDoc);
    expect(newDoc('script').length).toEqual(0);
  });

  it('removes comments', () => {
    const html = fs
      .readFileSync('tests/fixtures/test_gizmodo1.html')
      .toString();
    const originalDoc = cheerio.load(html);

    const comments = originalDoc('*')
      .contents()
      .filter((_index, element) => {
        return element.type === 'comment';
      });

    expect(comments.length).toEqual(15);

    const newDoc = cleaner(originalDoc);
    const newComments = newDoc('*')
      .contents()
      .filter((_index, element) => {
        return element.type === 'comment';
      });

    expect(newComments.length).toEqual(0);
  });

  it('replaces childless divs with p tags', () => {
    const originalDoc = cheerio.load(
      '<html><body><div>text1</div></body></html>'
    );
    const newDoc = cleaner(originalDoc);

    expect(newDoc('div').length).toEqual(0);
    expect(newDoc('p').length).toEqual(1);
    expect(newDoc('p').text()).toEqual('text1');
  });

  it('replaces u tags with plain text', () => {
    const originalDoc = cheerio.load('<html><body><u>text1</u></body></html>');
    const newDoc = cleaner(originalDoc);

    expect(newDoc('u').length).toEqual(0);
    expect(newDoc('body').html()).toEqual('text1');
  });

  it('removes divs by regex (ex: /caption/)', () => {
    const html = fs.readFileSync('tests/fixtures/test_aolNews.html').toString();
    const originalDoc = cheerio.load(html);
    const captions = originalDoc('div.caption');
    expect(captions.length).toEqual(1);

    const newDoc = cleaner(originalDoc);
    const newCaptions = newDoc('div.caption');
    expect(newCaptions.length).toEqual(0);
  });

  it('removes naughty elements by regex (ex: /caption/)', () => {
    const html = fs.readFileSync('tests/fixtures/test_issue28.html').toString();
    const originalDoc = cheerio.load(html);
    const naughtyElements = originalDoc('.retweet');
    expect(naughtyElements.length).toEqual(2);

    const newDoc = cleaner(originalDoc);
    const newNaughtyElements = newDoc('.retweet');
    expect(newNaughtyElements.length).toEqual(0);
  });

  it("removes trash line breaks that wouldn't be rendered by the browser", () => {
    const html = fs.readFileSync('tests/fixtures/test_sec1.html').toString();
    const originalDoc = cheerio.load(html);
    const newDoc = cleaner(originalDoc);

    const pElements = newDoc('p');
    const cleanedParaText = pElements[9].children[0].data;
    expect(cleanedParaText?.trim()).toEqual(
      '“This transaction would not only strengthen our global presence, but also demonstrate our commitment to diversify and expand our U.S. commercial portfolio with meaningful new therapies,” said Russell Cox, executive vice president and chief operating officer of Jazz Pharmaceuticals plc. “We look forward to ongoing discussions with the FDA as we continue our efforts toward submission of an NDA for defibrotide in the U.S. Patients in the U.S. with severe VOD have a critical unmet medical need, and we believe that defibrotide has the potential to become an important treatment option for these patients.”'
    );
  });

  it('inlines code blocks as text', () => {
    const html = fs.readFileSync('tests/fixtures/test_github1.html').toString();
    const originalDoc = cheerio.load(html);
    const codeElements = originalDoc('code');
    expect(codeElements.length).toEqual(26);

    const newDoc = cleaner(originalDoc);
    const newCodeElements = newDoc('code');
    expect(newCodeElements.length).toEqual(0);

    expect(
      newDoc('body')
        .text()
        .indexOf("extractor = require('extract-site-metadata');")
    ).toBeGreaterThan(0);
  });
});
