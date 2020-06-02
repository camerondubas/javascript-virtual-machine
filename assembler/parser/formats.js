const A = require("arcsecond");
const TYPES = require("./types");
const {
  address,
  register,
  hexLiteral,
  upperOrLowerString,
} = require("./common");
const { squareBracketExpression } = require("./expressions");

// mov [$42 + !loc - ($05 * $31)], r1
const litReg = (mnemonic, type) =>
  A.coroutine(function* () {
    yield upperOrLowerString(mnemonic);
    yield A.whitespace;

    const literal1 = yield A.choice([hexLiteral, squareBracketExpression]);

    yield A.optionalWhitespace;
    yield A.char(",");
    yield A.optionalWhitespace;

    const register1 = yield register;
    yield A.optionalWhitespace;

    return TYPES.instruction({
      instruction: type,
      args: [literal1, register1],
    });
  });

const regReg = (mnemonic, type) =>
  A.coroutine(function* () {
    yield upperOrLowerString(mnemonic);
    yield A.whitespace;

    const register1 = yield register;

    yield A.optionalWhitespace;
    yield A.char(",");
    yield A.optionalWhitespace;

    const register2 = yield register;
    yield A.optionalWhitespace;

    return TYPES.instruction({
      instruction: type,
      args: [register1, register2],
    });
  });

const regMem = (mnemonic, type) =>
  A.coroutine(function* () {
    yield upperOrLowerString(mnemonic);
    yield A.whitespace;

    const register1 = yield register;

    yield A.optionalWhitespace;
    yield A.char(",");
    yield A.optionalWhitespace;

    const address1 = yield A.choice([
      address,
      A.char("&").chain(() => squareBracketExpression),
    ]);
    yield A.optionalWhitespace;

    return TYPES.instruction({
      instruction: type,
      args: [register1, address1],
    });
  });

const memReg = (mnemonic, type) =>
  A.coroutine(function* () {
    yield upperOrLowerString(mnemonic);
    yield A.whitespace;

    const address1 = yield A.choice([
      address,
      A.char("&").chain(() => squareBracketExpression),
    ]);

    yield A.optionalWhitespace;
    yield A.char(",");
    yield A.optionalWhitespace;

    const register1 = yield register;

    yield A.optionalWhitespace;

    return TYPES.instruction({
      instruction: type,
      args: [address1, register1],
    });
  });

const litMem = (mnemonic, type) =>
  A.coroutine(function* () {
    yield upperOrLowerString(mnemonic);
    yield A.whitespace;

    const literal1 = yield A.choice([hexLiteral, squareBracketExpression]);

    yield A.optionalWhitespace;
    yield A.char(",");
    yield A.optionalWhitespace;

    const address1 = yield A.choice([
      address,
      A.char("&").chain(() => squareBracketExpression),
    ]);
    yield A.optionalWhitespace;

    return TYPES.instruction({
      instruction: type,
      args: [literal1, address1],
    });
  });

const regPtrReg = (mnemonic, type) =>
  A.coroutine(function* () {
    yield upperOrLowerString(mnemonic);
    yield A.whitespace;

    const register1 = yield A.char("&").chain(() => register);

    yield A.optionalWhitespace;
    yield A.char(",");
    yield A.optionalWhitespace;

    const register2 = yield register;
    yield A.optionalWhitespace;

    return TYPES.instruction({
      instruction: type,
      args: [register1, register2],
    });
  });

const litOffReg = (mnemonic, type) =>
  A.coroutine(function* () {
    yield upperOrLowerString(mnemonic);
    yield A.whitespace;

    const literal1 = yield A.choice([hexLiteral, squareBracketExpression]);

    yield A.optionalWhitespace;
    yield A.char(",");
    yield A.optionalWhitespace;

    const register1 = yield A.char("&").chain(() => register);

    yield A.optionalWhitespace;
    yield A.char(",");
    yield A.optionalWhitespace;

    const register2 = yield register;

    yield A.optionalWhitespace;

    return TYPES.instruction({
      instruction: type,
      args: [literal1, register1, register2],
    });
  });

const noArgs = (mnemonic, type) =>
  A.coroutine(function* () {
    yield upperOrLowerString(mnemonic);
    yield A.optionalWhitespace;

    return TYPES.instruction({
      instruction: type,
      args: [],
    });
  });

const singleReg = (mnemonic, type) =>
  A.coroutine(function* () {
    yield upperOrLowerString(mnemonic);
    yield A.whitespace;

    const register1 = yield register;
    yield A.optionalWhitespace;

    return TYPES.instruction({
      instruction: type,
      args: [register1],
    });
  });

const singleLit = (mnemonic, type) =>
  A.coroutine(function* () {
    yield upperOrLowerString(mnemonic);
    yield A.whitespace;

    const literal1 = yield A.choice([hexLiteral, squareBracketExpression]);

    yield A.optionalWhitespace;

    return TYPES.instruction({
      instruction: type,
      args: [literal1],
    });
  });

module.exports = {
  litReg,
  regReg,
  memReg,
  regMem,
  litMem,
  regPtrReg,
  litOffReg,
  noArgs,
  singleReg,
  singleLit,
};
