/* eslint-disable no-var */
import type { Cheerio, CheerioAPI } from "cheerio";
import type { AnyNode, Element } from "domhandler";
import { PageData } from "../index";

declare global {
  var cleanedDoc: CheerioAPI;
  var doc: CheerioAPI;
  var lazyPageData: PageData;
  var topNode: Cheerio<AnyNode>;
}
