const A = require('arcsecond');
const {
  validIdentifier,
} = require('./common');

const t = require('./types');

const interpretAsParser = A.coroutine(function* () {
  yield A.char('<');
  const structure = yield validIdentifier;
  yield A.char('>');

  yield A.optionalWhitespace;
  const symbol = yield validIdentifier;
  yield A.char('.');
  const property = yield validIdentifier;
  yield A.optionalWhitespace;

  return t.interpretAs({
    structure,
    symbol,
    property
  });

});

module.exports = interpretAsParser;
