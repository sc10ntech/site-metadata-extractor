import cheerio from "cheerio";
import { PageData } from "../index";

declare global {
  const cleanedDoc: cheerio.Root;
  const doc: cheerio.Root;
  const lazyPageData: PageData;
  const topNode: cheerio.Cheerio;
}
