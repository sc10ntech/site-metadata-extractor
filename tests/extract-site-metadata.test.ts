import fs from 'fs';
import extractSiteMetadata, { lazy } from '../src/index';

const allFields: string[] = [
  'author',
  'canonicalLink',
  'copyright',
  'date',
  'description',
  'favicon',
  'image',
  'jsonld',
  'keywords',
  'lang',
  'links',
  'locale',
  'publisher',
  'siteName',
  'softTitle',
  'tags',
  'text',
  'title',
  'type',
  'videos'
];

const cleanTestingText = (text: string, originalTextLength: number) => {
  return text
    .replace(/\n\n/g, ' ')
    .replace(/\ \ /g, ' ')
    .slice(0, +(originalTextLength - 1) + 1 || 9e9);
};

const cleanOriginalText = (text: string) => {
  return text.replace(/\n\n/g, ' ');
};

const checkFixture = (site: string, fields = allFields) => {
  const html = fs.readFileSync(`tests/fixtures/test_${site}.html`).toString();
  const orig = JSON.parse(
    fs.readFileSync(`tests/fixtures/test_${site}.json`).toString()
  );

  const data = extractSiteMetadata(html, orig.url);
  const dataLazy = lazy(html, orig.url);

  fields.forEach((field) => {
    switch (field) {
      case 'title':
        expect(orig.expected.title).toEqual(data.title);
        expect(data.title).toEqual(dataLazy.title());
        break;
      case 'cleaned_text':
        const origText = cleanOriginalText(orig.expected.cleaned_text);
        const newText = cleanTestingText(
          data.text ? data.text : '',
          origText.length
        );
        const partialExtractText = cleanTestingText(
          dataLazy.text(),
          origText.length
        );

        expect(newText).toBeDefined();
        if (data && data.text) {
          expect(data.text.length).toBeGreaterThanOrEqual(
            orig.expected.cleaned_text.length
          );
        }

        expect(origText).toEqual(newText);
        expect(origText).toEqual(partialExtractText);
        break;
      case 'author':
        expect(orig.expected.author.sort()).toEqual(data.author.sort());
        expect(orig.expected.author.sort()).toEqual(dataLazy.author().sort());
        break;
      case 'copyright':
        expect(orig.expected.copyright).toEqual(data.copyright);
        expect(orig.expected.copyright).toEqual(dataLazy.copyright());
        break;
      case 'date':
        expect(orig.expected.date).toEqual(data.date);
        expect(orig.expected.date).toEqual(dataLazy.date());
        break;
      case 'locale':
        expect(orig.expected.locale).toEqual(data.locale);
        expect(orig.expected.locale).toEqual(dataLazy.locale());
        break;
      case 'origin':
        expect(orig.expected.origin).toEqual(data.origin);
        expect(orig.expected.origin).toEqual(dataLazy.origin());
        break;
      case 'link':
        expect(orig.expected.final_url).toEqual(data.canonicalLink);
        expect(data.canonicalLink).toEqual(dataLazy.canonicalLink());
        break;
      case 'image':
        expect(orig.expected.image).toEqual(data.image);
        expect(data.image).toEqual(dataLazy.image());
        break;
      case 'description':
        expect(orig.expected.meta_description).toEqual(data.description);
        expect(data.description).toEqual(dataLazy.description());
        break;
      case 'lang':
        expect(orig.expected.meta_lang).toEqual(data.lang);
        expect(data.lang).toEqual(dataLazy.lang());
        break;
      case 'keywords':
        expect(orig.expected.meta_keywords).toEqual(data.keywords);
        expect(data.keywords).toEqual(dataLazy.keywords());
        break;
      case 'favicon':
        expect(orig.expected.meta_favicon).toEqual(data.favicon);
        expect(data.favicon).toEqual(dataLazy.favicon());
        break;
      case 'tags':
        const sortedTags = data.tags.sort();
        expect(orig.expected.tags.sort()).toEqual(sortedTags);
        expect(sortedTags).toEqual(dataLazy.tags().sort());
        break;
      case 'type':
        expect(orig.expected.type).toEqual(data.type);
        expect(orig.expected.type).toEqual(dataLazy.type());
        break;
      case 'publisher':
        expect(orig.expected.publisher).toEqual(data.publisher);
        expect(orig.expected.publisher).toEqual(dataLazy.publisher());
        break;
      case 'links':
        const sortedLinks = data?.links?.sort();
        const sortedLazyLinks = dataLazy.links().sort();

        if (!orig.expected.links) {
          orig.expected.links = sortedLinks;
          fs.writeFileSync(
            `tests/fixtures/test_${site}.json`,
            JSON.stringify(orig, null, 4)
          );
        }

        expect(orig.expected.links.sort()).toEqual(sortedLinks);
        expect(orig.expected.links.sort()).toEqual(sortedLazyLinks);
        break;
      case 'siteName':
        expect(orig.expected.origin).toEqual(data.origin);
        expect(orig.expected.origin).toEqual(dataLazy.origin());
        break;
      case 'videos':
        const sortedVideos = data?.videos?.sort();
        expect(orig.expected.movies.sort()).toEqual(sortedVideos);
        expect(sortedVideos).toEqual(dataLazy.videos().sort());
        break;
      default:
        return;
    }
  });
};

describe('Extract Link Metadata', () => {
  it('exists', () => {
    expect(extractSiteMetadata).toBeDefined();
  });

  it('lazy version exists', () => {
    expect(lazy).toBeDefined();
  });

  it('reads title', () => {
    checkFixture('polygon', ['title']);
  });

  it('reads favicon', () => {
    checkFixture('aolNews', ['favicon']);
  });

  it('reads description', () => {
    checkFixture('allnewlyrics1', ['description']);
  });

  it('reads open graph description', () => {
    checkFixture('twitter', ['description']);
  });

  it('reads keywords', () => {
    checkFixture('allnewlyrics1', ['keywords']);
  });

  it('reads lang', () => {
    checkFixture('allnewlyrics1', ['lang']);
  });

  it('reads canonical link', () => {
    checkFixture('allnewlyrics1', ['link']);
  });

  it('reads author', () => {
    checkFixture('engadget2', ['author']);
    checkFixture('cnbc2', ['author']);
  });

  it('reads copyright', () => {
    checkFixture('engadget2', ['copyright']);
    checkFixture('cnbc2', ['copyright']);
  });

  it('reads locale', () => {
    checkFixture('engadget2', ['locale']);
  });

  it('reads type', () => {
    checkFixture('cnbc2', ['type']);
  });

  it('reads publisher', () => {
    checkFixture('engadget2', ['publisher']);
    checkFixture('cnbc2', ['publisher']);
  });

  it('reads tags', () => {
    checkFixture('tags_kexp', ['tags']);
    checkFixture('tags_deadline', ['tags']);
    checkFixture('tags_wnyc', ['tags']);
    checkFixture('tags_cnet', ['tags']);
    checkFixture('tags_abcau', ['tags']);
  });

  it('reads videos', () => {
    checkFixture('embed', ['videos']);
    checkFixture('iframe', ['videos']);
    checkFixture('object', ['videos']);
  });

  it('reads links', () => {
    checkFixture('polygon', ['links']);
  });

  it('reads origin', () => {
    checkFixture('cnbc2', ['origin']);
  });

  it('reads site name', () => {
    checkFixture('cnbc2', ['siteName']);
  });

  it('reads images', () => {
    checkFixture('aolNews', ['image']);
    checkFixture('polygon', ['image']);
    checkFixture('theverge1', ['image']);
  });

  it('gets cleaned text - Polygon', () => {
    checkFixture('polygon', [
      'cleaned_text',
      'title',
      'link',
      'description',
      'lang',
      'favicon'
    ]);
  });

  it('gets cleaned text - The Verge', () => {
    checkFixture('theverge1', [
      'cleaned_text',
      'title',
      'link',
      'description',
      'lang',
      'favicon'
    ]);
  });

  it('gets cleaned tags- The Verge', () => {
    checkFixture('theverge2', ['tags']);
  });

  it('gets cleaned text - McSweeneys', () => {
    checkFixture('mcsweeney', ['cleaned_text', 'link', 'lang', 'favicon']);
  });

  it('gets cleaned text - CNN', () => {
    checkFixture('cnn1', ['cleaned_text']);
  });

  it('gets cleaned text - MSN', () => {
    checkFixture('msn1', ['cleaned_text']);
  });

  it('gets cleaned text - Time', () => {
    checkFixture('time2', ['cleaned_text']);
  });

  it('gets cleaned text - BI', () => {
    checkFixture('businessinsider1', ['cleaned_text']);
    checkFixture('businessinsider3', ['cleaned_text']);
  });

  it('gets cleaned text - CNBC', () => {
    checkFixture('cnbc1', ['cleaned_text']);
  });

  it('gets cleaned text - CBS Local', () => {
    checkFixture('cbslocal', ['cleaned_text']);
  });

  it('gets cleaned text - Business Week', () => {
    checkFixture('businessWeek1', ['cleaned_text']);
    checkFixture('businessWeek2', ['cleaned_text']);
    checkFixture('businessWeek3', ['cleaned_text']);
  });

  it('gets cleaned text - Techcrunch', () => {
    checkFixture('techcrunch1', ['cleaned_text']);
  });

  it('gets cleaned text - Fox News', () => {
    checkFixture('foxNews', ['cleaned_text']);
  });

  it('gets cleaned text - Huff Po', () => {
    checkFixture('huffingtonPost2', ['cleaned_text']);
    checkFixture('testHuffingtonPost', [
      'cleaned_text',
      'description',
      'title'
    ]);
  });

  it('gets cleaned text - ESPN', () => {
    checkFixture('espn', ['cleaned_text']);
  });

  it('gets cleaned text - Time', () => {
    checkFixture('time', ['cleaned_text']);
  });

  it('gets cleaned text - CNet', () => {
    checkFixture('cnet', ['cleaned_text']);
  });

  it('gets cleaned text - Yahoo', () => {
    checkFixture('yahoo', ['cleaned_text']);
  });

  it('gets cleaned text - Politico', () => {
    checkFixture('politico', ['cleaned_text']);
  });

  it('gets cleaned text - Goose Regressions', () => {
    checkFixture('issue25', ['cleaned_text']);
    checkFixture('issue28', ['cleaned_text']);
  });

  it('gets cleaned text - Gizmodo', () => {
    checkFixture('gizmodo1', ['cleaned_text', 'description', 'keywords']);
  });

  it('gets cleaned text - Mashable', () => {
    checkFixture('mashable_issue_74', ['cleaned_text']);
  });

  it('gets cleaned text - USA Today', () => {
    checkFixture('usatoday1', ['cleaned_text']);
  });
});
