const { inspect } = require("util");
const A = require("arcsecond");

const deepLog = (x) =>
  console.log(
    inspect(x, {
      depth: Infinity,
      colors: true,
    })
  );

// Creates an object with a type and a value
const asType = (type) => (value) => ({ type, value });
const mapJoin = (parser) => parser.map((items) => items.join(""));

// Lets us look at the next char without consuming it.
const peek = A.lookAhead(A.regex(/^./));

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
  upperOrLowerString("stackPointer"),
  upperOrLowerString("framePointer"),
  upperOrLowerString("instructionPointer"),
  upperOrLowerString("accumulator"),
]).map(asType("REGISTER"));

// Any Char 0-9, A-F, a-f
const hexDigit = A.regex(/^[0-9A-Fa-f]/);

// Find "$" + many (at least one) hexDigits, join them as a string, then map to HEX_LITERAL type
// Ex. $47A3
const hexLiteral = A.char("$")
  .chain(() => mapJoin(A.many1(hexDigit)))
  .map(asType("HEX_LITERAL"));

const operator = A.choice([
  A.char("+").map(asType("OP_PLUS")),
  A.char("-").map(asType("OP_MINUS")),
  A.char("*").map(asType("OP_MULTIPLY")),
]);

// A valid identifier is a letter or underscore, optionally followed by a letter, number, or underscore
const validIdentifier = mapJoin(
  A.sequenceOf([
    A.regex(/^[a-zA-Z_]/),
    A.possibly(A.regex(/^[a-zA-Z0-9_]+/)).map((x) => (x === null ? "" : x)),
  ])
);

// Find "!" + a validIdentifier. Mapped to VARIABLE type
// Ex. !someVar
const variable = A.char("!")
  .chain(() => validIdentifier)
  .map(asType("VARIABLE"));

// TODO, next time
const bracketedExpression = () => {};

const squareBracketExpression = A.coroutine(function* () {
  yield A.char("[");
  yield A.optionalWhitespace;

  const states = {
    EXPECT_ELEMENT: 0,
    EXPECT_OPERATOR: 1,
  };

  const expression = [];
  let state = states.EXPECT_ELEMENT;

  while (true) {
    if (state === states.EXPECT_ELEMENT) {
      const result = yield A.choice([
        bracketedExpression,
        hexLiteral,
        variable,
      ]);
      expression.push(result);
      state = EXPECT_OPERATOR;
      yield A.optionalWhitespace;
    } else if (state === states.EXPECT_OPERATOR) {
      const nextChar = yield peek;
      if (nextChar === "]") {
        yield A.char("]");
        yield A.optionalWhitespace;
        break;
      }

      const result = yield operator;
      expression.push(result);
      state = states.EXPECT_ELEMENT;
      yield A.optionalWhitespace;
    }
  }

  return asType("SQUARE_BRACKET_EXPRESSION")(expression);
});

// mov [$42 + !loc - ($05 * $31)], r1
const movLitToReg = A.coroutine(function* () {
  yield upperOrLowerString("mov");
  yield A.whitespace;

  const arg1 = yield A.choice([hexLiteral, squareBracketExpression]);

  yield A.optionalWhitespace;
  yield A.char(",");
  yield A.optionalWhitespace;

  const arg2 = yield register;
  yield A.optionalWhitespace;

  return asType("INSTRUCTION")({
    instruction: "MOV_LIT_REG",
    args: [arg1, arg2],
  });
});

const res = movLitToReg.run("mov $42, r4");
deepLog(res);
