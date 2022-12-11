import cheerio from "cheerio";
import fs from "fs";
import formatter from "../src/formatter";

describe("Formatter", () => {
  it("exists", () => {
    expect(formatter).toBeDefined();
  });

  it("replaces links with plain text", () => {
    const html = fs
      .readFileSync("tests/fixtures/test_businessWeek1.html")
      .toString();
    const originalDoc = cheerio.load(html);

    expect(originalDoc("a").length).toEqual(223);

    formatter(originalDoc, originalDoc("body"), "en");
    expect(originalDoc("a").length).toEqual(0);
  });

  it("doesn't drop text nodes accidentally", () => {
    const html = fs
      .readFileSync("tests/fixtures/test_wikipedia1.html")
      .toString();
    const doc = cheerio.load(html);

    formatter(doc, doc("body"), "en");
    const newHtml = doc.html();
    expect(
      /is a thirteen episode anime series directed by Akitaro Daichi and written by Hideyuki Kurata/.test(
        newHtml
      )
    ).toBeTruthy();
  });
});
