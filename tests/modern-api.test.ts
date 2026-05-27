import {
  extractFromHtml,
  extractLazy,
  extractMetadataOnly,
} from "../src/index";

describe("Modern typed extraction API", () => {
  const baseOptions = {
    finalUrl: "https://example.com/news/story.html?utm_source=test#section",
    inputUrl: "https://example.com/raw/story.html",
    maxStringLength: 64,
  };

  const html = `
    <!doctype html>
    <html lang="en-US">
      <head>
        <title>Typed Extraction: A useful page | Example News</title>
        <link rel="canonical" href="/news/canonical-story.html" />
        <link rel="icon" sizes="32x32" href="/favicon-32.png" />
        <link rel="shortcut icon" href="https://cdn.example.com/favicon.ico" />
        <link rel="apple-touch-icon" sizes="180x180" href="../apple-touch.png" />
        <meta property="og:title" content="Typed Extraction: A useful page" />
        <meta name="description" content="A short description for typed extraction." />
        <meta property="og:description" content="Open graph description." />
        <meta property="og:image" content="/images/primary.jpg" />
        <meta name="twitter:image" content="../images/twitter.jpg" />
        <meta property="og:site_name" content="Example News" />
        <meta property="og:locale" content="en_US" />
        <meta property="article:published_time" content="2026-05-20T10:00:00.000Z" />
        <meta property="article:modified_time" content="2026-05-21T11:30:00.000Z" />
        <meta name="author" content="Ada Lovelace" />
        <script type="application/ld+json">
          {"@context":"https://schema.org","@type":"NewsArticle","headline":"One"}
        </script>
        <script type="application/ld+json">
          [{"@type":"BreadcrumbList"},{"@type":"ImageObject","url":"/images/primary.jpg"}]
        </script>
        <script type="application/ld+json">{ bad json }</script>
        <script>window.secret = "<p>not article text</p>";</script>
        <style>.hidden { content: "not article text"; }</style>
      </head>
      <body>
        <main>
          <article>
            <h1>Typed Extraction: A useful page</h1>
            <p>
              This is a real article paragraph with enough ordinary words to be
              selected by the readability scoring logic.
              &lt;img src=x onerror=alert(1)&gt;
              It must remain inert text in the extracted output.
            </p>
            <p>
              A second paragraph links to
              <a href="/related/story" rel="bookmark" title="Related">related coverage</a>
              and embeds a useful media candidate.
            </p>
            <iframe src="/video/player.html" width="640" height="360"></iframe>
            <img src="/images/body.jpg" width="800" height="450" alt="Body image" />
          </article>
        </main>
      </body>
    </html>
  `;

  it("extracts stable typed output without fetching network resources", () => {
    const data = extractFromHtml(html, baseOptions);

    expect(data.inputUrl).toBe("https://example.com/raw/story.html");
    expect(data.finalUrl).toBe(
      "https://example.com/news/story.html?utm_source=test#section",
    );
    expect(data.normalizedUrl).toBe(
      "https://example.com/news/story.html?utm_source=test",
    );
    expect(data.domain).toBe("example.com");
    expect(data.canonicalUrl).toBe(
      "https://example.com/news/canonical-story.html",
    );
    expect(data.title).toBe("Typed Extraction");
    expect(data.softTitle).toBe("Typed Extraction: A useful page");
    expect(data.description).toBe("A short description for typed extraction.");
    expect(data.author).toEqual(["Ada Lovelace"]);
    expect(data.publisher).toBe("Example News");
    expect(data.siteName).toBe("Example News");
    expect(data.lang).toBe("en");
    expect(data.locale).toBe("en_US");
    expect(data.publishedAt).toBe("2026-05-20T10:00:00.000Z");
    expect(data.modifiedAt).toBe("2026-05-21T11:30:00.000Z");
    expect(data.jsonld).toHaveLength(3);
    expect(data.rawMeta["og:image"]).toEqual(["/images/primary.jpg"]);
    expect(data.extraction.packageVersion).toMatch(/^\d+\.\d+\.\d+/);
    expect(data.extraction.strategyVersion).toBe("2026-05-26.cheerio-v1");
    expect(data.extraction.warnings).toContain(
      "jsonld block 2 could not be parsed",
    );
    expect(data.extraction.confidence).toBeGreaterThan(0.8);
  });

  it("returns URL-resolved asset, link, and video candidates", () => {
    const data = extractFromHtml(html, baseOptions);

    expect(data.faviconCandidates.map((candidate) => candidate.url)).toEqual([
      "https://example.com/favicon-32.png",
      "https://cdn.example.com/favicon.ico",
      "https://example.com/apple-touch.png",
    ]);
    expect(data.imageCandidates.map((candidate) => candidate.url)).toContain(
      "https://example.com/images/primary.jpg",
    );
    expect(data.imageCandidates.map((candidate) => candidate.url)).toContain(
      "https://example.com/images/twitter.jpg",
    );
    expect(data.primaryImage?.url).toBe("https://example.com/images/primary.jpg");
    expect(data.links).toEqual([
      {
        rel: "bookmark",
        text: "related coverage",
        title: "Related",
        url: "https://example.com/related/story",
      },
    ]);
    expect(data.videos).toEqual([
      {
        height: 360,
        source: "iframe",
        url: "https://example.com/video/player.html",
        width: 640,
      },
    ]);
  });

  it("removes script/style noise but returns hostile text as text", () => {
    const data = extractFromHtml(html, baseOptions);

    expect(data.readableText).toContain("<img src=x onerror=alert(1)>");
    expect(data.readableText).toContain("It must remain inert text");
    expect(data.readableText).not.toContain("window.secret");
    expect(data.readableText).not.toContain(".hidden");
    expect(data.textStats.wordCount).toBeGreaterThan(10);
  });

  it("handles malformed HTML and bounds huge metadata values", () => {
    const hugeDescription = "x".repeat(200);
    const malformed = `
      <html><head>
        <title>Broken
        <meta name="description" content="${hugeDescription}">
        <meta property="og:image" content="./broken.jpg">
      <body><article><p>This malformed page still has enough words to extract.</p>
    `;

    const data = extractFromHtml(malformed, {
      finalUrl: "https://example.org/a/b/page",
      maxStringLength: 24,
    });

    expect(data.description).toBe("x".repeat(24));
    expect(data.rawMeta.description).toEqual(["x".repeat(24)]);
    expect(data.imageCandidates[0].url).toBe(
      "https://example.org/a/b/broken.jpg",
    );
    expect(data.extraction.warnings).toContain(
      "description exceeded 24 characters and was truncated",
    );
    expect(data.extraction.warnings).toContain(
      "rawMeta.description exceeded 24 characters and was truncated",
    );
  });

  it("supports metadata-only and instance-local lazy extraction", () => {
    const metadata = extractMetadataOnly(html, baseOptions);
    expect(metadata.readableText).toBe("");
    expect(metadata.links).toEqual([]);
    expect(metadata.videos).toEqual([]);

    const first = extractLazy(
      "<html><head><title>First title</title></head><body><p>First text has enough words for extraction.</p></body></html>",
      { finalUrl: "https://one.example/" },
    );
    const second = extractLazy(
      "<html><head><title>Second title</title></head><body><p>Second text has enough words for extraction.</p></body></html>",
      { finalUrl: "https://two.example/" },
    );

    expect(first.metadata().title).toBe("First title");
    expect(second.metadata().title).toBe("Second title");
    expect(first.extract().domain).toBe("one.example");
    expect(second.extract().domain).toBe("two.example");
  });
});
