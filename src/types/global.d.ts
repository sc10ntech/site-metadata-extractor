/* eslint-disable no-var */
import cheerio from "cheerio";
import { PageData } from "../index";

declare global {
  var cleanedDoc: cheerio.Root;
  var doc: cheerio.Root;
  var lazyPageData: PageData;
  var topNode: cheerio.Cheerio;
}
