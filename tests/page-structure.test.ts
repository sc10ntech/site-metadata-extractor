import { extractFromHtml, extractMetadataOnly } from "../src/index";

describe("Page structure and structured metadata regressions", () => {
  const options = { finalUrl: "https://example.test/story" };
  const paragraph = "When we study the night sky, we record nebular observations in our notebooks so that we can compare what we saw with the observations from the previous night.";

  it.each(["html", "body", "main"])("preserves %s despite layout attributes matching noise rules", (tag) => {
    const attribute = ' id="page-tools-layout" class="footer-feature-enabled"';
    const html = `<html${tag === "html" ? attribute : ""}><head><title>Sky journal</title></head>
      <body${tag === "body" ? attribute : ""}><main${tag === "main" ? attribute : ""}>
      <p>${paragraph}</p><p>${paragraph}</p>
      <div class="footer">UNWANTED FOOTER</div><div class="tools">UNWANTED TOOLBAR</div>
      <script>UNWANTED SCRIPT</script><style>UNWANTED STYLE</style>
      </main></body></html>`;
    const result = extractFromHtml(html, options);
    expect(result.readableText).toContain("nebular observations");
    expect(result.readableText).not.toContain("UNWANTED");
    expect(result.textStats.wordCount).toBeGreaterThan(20);
  });

  function htmlFor(value: unknown, head = ""): string {
    return `<html><head>${head}<script type="application/ld+json">${JSON.stringify(value)}</script></head><body><p>${paragraph}</p></body></html>`;
  }
  const article = {
    "@type": "Article", url: options.finalUrl, headline: "Structured headline",
    description: "Structured description", author: [{ name: "Author One" }, "Author Two"],
    publisher: { name: "Example Publisher" }, datePublished: "2026-09-20T10:00:00Z",
    dateModified: "2026-09-21T10:00:00Z"
  };

  it("fills missing metadata from the matching page entity in a JSON-LD graph", () => {
    const result = extractMetadataOnly(htmlFor({ "@graph": [
      { "@type": "Person", name: "Unrelated person" },
      { ...article, url: "https://example.test/another", headline: "Wrong page" }, article
    ] }), options);
    expect(result).toMatchObject({ title: article.headline, description: article.description,
      author: ["Author One", "Author Two"], publisher: "Example Publisher",
      publishedAt: article.datePublished, modifiedAt: article.dateModified });
  });

  it("preserves explicit HTML metadata ahead of structured fallbacks", () => {
    const head = `<title>HTML title</title><meta name="author" content="HTML author">
      <meta name="description" content="HTML description"><meta property="og:site_name" content="HTML publisher">
      <meta property="article:published_time" content="2026-09-22T10:00:00Z">
      <meta property="article:modified_time" content="2026-09-23T10:00:00Z">`;
    const result = extractMetadataOnly(htmlFor(article, head), options);
    expect(result).toMatchObject({ title: "HTML title", description: "HTML description",
      author: ["HTML author"], publisher: "HTML publisher", publishedAt: "2026-09-22T10:00:00Z",
      modifiedAt: "2026-09-23T10:00:00Z" });
  });

  it("does not borrow fields from ambiguous or unrelated JSON-LD entities", () => {
    const result = extractMetadataOnly(htmlFor([null, 42, { "@type": "Person", name: "Not a page" },
      { ...article, url: "/other-one" }, { ...article, url: "/other-two" }]), options);
    expect(result.author).toEqual([]);
    expect(result.publisher).toBe("");
    expect(result.title).toBe("");
  });

  it("bounds structured strings and ignores non-string fields", () => {
    const result = extractMetadataOnly(htmlFor({ ...article, headline: {}, author: [{ name: 4 }, "A".repeat(100)],
      publisher: false, description: "D".repeat(100), datePublished: false }), { ...options, maxStringLength: 12 });
    expect(result.title).toBe("");
    expect(result.description).toBe("D".repeat(12));
    expect(result.author).toEqual(["A".repeat(12)]);
    expect(result.publisher).toBe("");
    expect(result.publishedAt).toBe("");
    expect(result.extraction.warnings).toContain("description exceeded 12 characters and was truncated");
  });
});
