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
    keywords?: string | null;
    lang?: string | null;
    links?: object[] | null;
    publisher?: string | null;
    softTitle?: string | null;
    tags?: string[] | null,
    text?: string | null;
    title?: string | null;
    topNode?: object | null;
    videos?: string[] | null;
  }
}
