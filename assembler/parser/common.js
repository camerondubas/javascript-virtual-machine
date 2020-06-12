const A = require("arcsecond");
const TYPES = require("./types");
const { mapJoin } = require("./util");

const upperOrLowerString = (str) =>
  A.choice([A.str(str.toUpperCase()), A.str(str.toLowerCase())]);

const register = A.choice([
  upperOrLowerString("r1"),
  upperOrLowerString("r2"),
  upperOrLowerString("r3"),
  upperOrLowerString("r4"),
  upperOrLowerString("r5"),
  upperOrLowerString("r6"),
  upperOrLowerString("r7"),
  upperOrLowerString("r8"),
  upperOrLowerString("stack_pointer"),
  upperOrLowerString("frame_pointer"),
  upperOrLowerString("instruction_pointer"),
  upperOrLowerString("accumulator"),
]).map(TYPES.register);

// Any Char 0-9, A-F, a-f
const hexDigit = A.regex(/^[0-9A-Fa-f]/);

// Find "$" + many (at least one) hexDigits, join them as a string, then map to HEX_LITERAL type
// Ex. $47A3
const hexLiteral = A.char("$")
  .chain(() => mapJoin(A.many1(hexDigit)))
  .map(TYPES.hexLiteral);

// Find "&" + many (at least one) hexDigits, join them as a string, then map to ADDRESS type
// Ex. &47A3
const address = A.char("&")
  .chain(() => mapJoin(A.many1(hexDigit)))
  .map(TYPES.address);

// A valid identifier is a letter or underscore, optionally followed by a letter, number, or underscore
const validIdentifier = mapJoin(
  A.sequenceOf([
    A.regex(/^[a-zA-Z_]/),
    A.possibly(A.regex(/^[a-zA-Z0-9_]+/)).map((x) => (x === null ? "" : x)),
  ])
);

const label = A.sequenceOf([validIdentifier, A.char(":"), A.optionalWhitespace])
  .map(([labelName]) => labelName)
  .map(TYPES.label);

// Find "!" + a validIdentifier. Mapped to VARIABLE type
// Ex. !someVar
const variable = A.char("!")
  .chain(() => validIdentifier)
  .map(TYPES.variable);

const operator = A.choice([
  A.char("+").map(TYPES.opPlus),
  A.char("-").map(TYPES.opMinus),
  A.char("*").map(TYPES.opMulitply),
]);

// Lets us look at the next char without consuming it.
const peek = A.lookAhead(A.regex(/^./));

module.exports = {
  upperOrLowerString,
  register,
  hexLiteral,
  address,
  validIdentifier,
  variable,
  operator,
  peek,
  label,
};
