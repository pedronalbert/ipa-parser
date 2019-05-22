const fs = require('fs');
const CSVParse = require('csv-parse');
const axios = require('axios');
const async = require('async');
const cheerio = require('cheerio');

const RESULTS_FILE = './results.csv';
const ENTRY_FILE = './words.csv';

const clearResultsFile = () => {
  fs.writeFileSync(RESULTS_FILE, '', () => {
    console.log('results file: ' + RESULTS_FILE + ' cleaned!');
  });
};

const getCSVContent = () => fs.readFileSync(ENTRY_FILE).toString();

const parseWordsArray = wordsArray => wordsArray.map(entry => ({
  english: entry[0],
  spanish: entry[1] || '',
  ipa: '',
}));

const getWordsFromCSVContent = CSVContent => new Promise((resolve, reject) => {
  const parser = CSVParse({ delimeter: ',' }, (err, results) => {
    if(err) reject(err)
    else resolve(results);
  });

  parser.write(CSVContent);
  parser.end();
});

const getWords = () => new Promise((resolve, reject) => {
  getWordsFromCSVContent(getCSVContent())
    .then(parseWordsArray)
    .then(resolve)
    .catch(reject);
});

const writeResult = word => {
  const entry = `${word.english},${word.spanish},${word.ipa}`;

  fs.appendFile(RESULTS_FILE, entry + '\n', () => {
    console.log('word saved: ' + entry);
  });
};

const findIPAfromHtml = html => new Promise((resolve, reject) => {
  const $ = cheerio.load(html);
  const IPANode = $('body').find('.us .ipa');

  if(IPANode.length) resolve('/' + IPANode.first().text() + '/');
  else reject('NOT_FOUND');

});

const getIPA = englishWord => new Promise((resolve, reject) => {
  const URL = 'https://dictionary.cambridge.org/es/diccionario/ingles/' +  englishWord;

  axios.get(URL)
    .then(response => findIPAfromHtml(response.data || ''))
    .then(resolve)
    .catch(resolve);
});

// INIT

(() => {
  clearResultsFile();

  getWords().then(words => {
    async.eachSeries(words, (word, next) => {
      getIPA(word.english)
        .then(ipa => writeResult({ ...word, ipa }))
        .then(next)
        .catch(console.error)
    }, () => console.log('Finished'));
  });
})();
