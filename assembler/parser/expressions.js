const A = require("arcsecond");
const TYPES = require("./types");

const { peek, hexLiteral, operator, variable } = require("./common");

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

  const newExpression = TYPES.bracketedExpression([
    ...expression.value.slice(0, candidateExpression.leftHandSideOperand),
    TYPES.binaryOperation({
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

// Returns the last element in an array
const last = (arr) => arr[arr.length - 1];

const typifyBracketedExpression = (expression) => {
  return TYPES.bracketedExpression(
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

  return TYPES.squareBracketExpression(expression);
}).map(disambiguateOrderOfOperations);

module.exports = {
  bracketedExpression,
  squareBracketExpression,
};
