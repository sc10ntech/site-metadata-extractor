import fs from 'fs';
import path from 'path';

const cache: any = {};

const candiateWords = (strippedInput: string) => {
  return strippedInput.split(' ');
};

const getFilePath = (lang: string) => {
  return path.resolve(
    __dirname,
    '..',
    'data',
    'stopwords',
    `stopwords-${lang}.txt`
  );
};

const removePunctuation = (content: string) => {
  return content.replace(
    /[\|\@\<\>\[\]\"\'\.,-\/#\?!$%\^&\*\+;:{}=\-_`~()]/g,
    ''
  );
};

const stopwords = (content: any, lang: any = 'en') => {
  let filePath = getFilePath(lang);
  let stopWords: any;

  if (!fs.existsSync(filePath)) {
    console.error(
      `WARNING: No stopwords file found for '${lang}' - defaulting to English!`
    );
    filePath = getFilePath('en');
  }

  if (cache.hasOwnProperty(lang)) {
    stopWords = cache[lang];
  } else {
    stopWords = fs
      .readFileSync(filePath)
      .toString()
      .split('\n')
      .filter(str => {
        return str.length > 0;
      });
    cache[lang] = stopWords;
  }

  const strippedInput = removePunctuation(content);
  const words = candiateWords(strippedInput);
  const overlappingStopwords: string[] = [];
  let count = 0;

  words.forEach(word => {
    count++;
    if (stopWords.indexOf(word.toLowerCase()) > -1) {
      overlappingStopwords.push(word.toLowerCase());
    }
  });

  return {
    stopWordCount: overlappingStopwords.length,
    stopWords: overlappingStopwords,
    wordCount: count
  };
};

export default stopwords;
