import stopwords from '../src/stopwords';

describe('Stop Words', () => {
  it('exists', () => {
    expect(stopwords).toBeDefined();
  });

  it('counts stopwords', () => {
    const data = stopwords('this is silly', 'en');
    expect(data.wordCount).toEqual(3);
    expect(data.stopWordCount).toEqual(2);
    expect(data.stopWords).toEqual(['this', 'is']);
  });

  it('strips punctuation', () => {
    const data = stopwords('this! is?? silly....', 'en');
    expect(data.wordCount).toEqual(3);
    expect(data.stopWordCount).toEqual(2);
    expect(data.stopWords).toEqual(['this', 'is']);
  });

  it('defaults to english', () => {
    const data = stopwords('this is fun');
    expect(data.wordCount).toEqual(3);
    expect(data.stopWordCount).toEqual(2);
    expect(data.stopWords).toEqual(['this', 'is']);
  });

  it('handles spanish', () => {
    const data = stopwords('este es rico', 'es');
    expect(data.wordCount).toEqual(3);
    expect(data.stopWordCount).toEqual(2);
    expect(data.stopWords).toEqual(['este', 'es']);
  });

  it('safely handles a bad language by falling back to english', () => {
    const data = stopwords('this is fun', 'fake-language-to-test-fallbacks');
    expect(data.wordCount).toEqual(3);
    expect(data.stopWordCount).toEqual(2);
    expect(data.stopWords).toEqual(['this', 'is']);
  });
});
