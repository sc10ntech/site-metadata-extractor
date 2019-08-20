declare namespace NodeJS {
  export interface Global {
    author?: string[] | null;
    canonicalLink?: string | null;
    cleanedDoc?: object | null;
    copyright?: string | null;
    date?: string | null;
    description?: string | null;
    doc?: object | null;
    favicon?: string | null;
    image?: string | null;
    jsonld?: any | null;
    keywords?: string | null;
    lang?: string | null;
    links?: object[] | null;
    locale?: string | null;
    publisher?: string | null;
    siteName?: string | null;
    softTitle?: string | null;
    tags?: string[] | null,
    text?: string | null;
    title?: string | null;
    topNode?: object | null;
    type?: string | null;
    videos?: string[] | null;
  }
}
