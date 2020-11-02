import cheerio from 'cheerio';
import { PageData } from '../index';

declare global {
  namespace NodeJS {
    interface Global {
      cleanedDoc: cheerio.Root;
      doc: cheerio.Root;
      pageData: PageData;
      topNode: cheerio.Cheerio;
    }
  }
}
