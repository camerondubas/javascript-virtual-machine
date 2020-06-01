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

const binaryOperation = asType("BINARY_OPERATION");
const disambiguateOrderOfOperations = (expression) => {
  if (
    expression.type !== "SQUARE_BRACKET_EXPRESSION" &&
    expression.type !== "BRACKETED_EXPRESSION"
  ) {
    return expression;
  }

  if (expression.value.length === 1) {
    return expression.value[0];
  }

  const priorities = {
    OP_MULTIPLY: 2,
    OP_PLUS: 1,
    OP_MINUS: 0,
  };

  let candidateExpression = {
    priority: -Infinity,
  };

  // Use index = 1 and index += 2 because this way "index" is always pointing at an operator
  // Ex: [$42, +, !loc, *, $31, -, $C0]
  for (let index = 1; index < expression.value.length; index += 2) {
    const operation = expression.value[index];
    const level = priorities[operation.type];

    if (level > candidateExpression.priority) {
      candidateExpression = {
        priority: level,
        leftHandSideOperand: index - 1, // Left-hand-side operand
        rightHandSideOperand: index + 1, // Right-hand-side operand
        operation,
      };
    }
  }

  const newExpression = asType("BRACKETED_EXPRESSION")([
    ...expression.value.slice(0, candidateExpression.leftHandSideOperand),
    binaryOperation({
      leftHandSideOperand: disambiguateOrderOfOperations(
        expression.value[candidateExpression.leftHandSideOperand]
      ),
      rightHandSideOperand: disambiguateOrderOfOperations(
        expression.value[candidateExpression.rightHandSideOperand]
      ),
      operation: candidateExpression.operation,
    }),
    ...expression.value.slice(candidateExpression.rightHandSideOperand + 1),
  ]);

  return disambiguateOrderOfOperations(newExpression);
};

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

// Returns the last element in an array
const last = (arr) => arr[arr.length - 1];

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

const typifyBracketedExpression = (expression) => {
  const asBracketed = asType("BRACKETED_EXPRESSION");

  return asBracketed(
    expression.map((element) => {
      if (Array.isArray(element)) {
        return typifyBracketedExpression(element);
      }
      return element;
    })
  );
};

const bracketedExpression = A.coroutine(function* () {
  const states = {
    OPEN_BRACKET: 0,
    OPERATOR_OR_CLOSING_BRACKET: 1,
    ELEMENT_OR_OPENING_BRACKET: 2,
    CLOSE_BRACKET: 3,
  };

  let state = states.ELEMENT_OR_OPENING_BRACKET;

  const expression = [];
  const stack = [expression];
  yield A.char("(");

  while (true) {
    const nextChar = yield peek;
    if (state === states.OPEN_BRACKET) {
      yield A.char("(");
      expression.push([]);
      stack.push(last(expression));
      yield A.optionalWhitespace;

      state = states.ELEMENT_OR_OPENING_BRACKET;
    } else if (state === states.CLOSE_BRACKET) {
      yield A.char(")");
      stack.pop();
      if (stack.length === 0) {
        // We've reached the end of the bracked expression
        break;
      }

      yield A.optionalWhitespace;
      state = states.OPERATOR_OR_CLOSING_BRACKET;
    } else if (state === states.ELEMENT_OR_OPENING_BRACKET) {
      if (nextChar === ")") {
        yield A.fail("Unexpected end of expression");
      }

      if (nextChar === "(") {
        state = states.OPEN_BRACKET;
      } else {
        last(stack).push(yield A.choice([hexLiteral, variable]));
        yield A.optionalWhitespace;
        state = states.OPERATOR_OR_CLOSING_BRACKET;
      }
    } else if (state === states.OPERATOR_OR_CLOSING_BRACKET) {
      if (nextChar === ")") {
        state = states.CLOSE_BRACKET;
        continue;
      }

      last(stack).push(yield operator);
      yield A.optionalWhitespace;
      state = states.ELEMENT_OR_OPENING_BRACKET;
    } else {
      // This shouldn't happen!
      throw new Error("Unknown state");
    }
  }

  return typifyBracketedExpression(expression);
});

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
      state = states.EXPECT_OPERATOR;
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
}).map(disambiguateOrderOfOperations);

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

// const res = movLitToReg.run("mov $42, r4");
const res = movLitToReg.run(
  "mov [$42 + !loc - ($05 * ($31 + !var) - $07)], r4"
);
deepLog(res);
