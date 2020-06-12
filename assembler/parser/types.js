const { asType } = require("./util");

const register = asType("REGISTER");
const hexLiteral = asType("HEX_LITERAL");
const variable = asType("VARIABLE");
const address = asType("ADDRESS");

const opPlus = asType("OP_PLUS");
const opMinus = asType("OP_MINUS");
const opMulitply = asType("OP_MULTIPLY");

const binaryOperation = asType("BINARY_OPERATION");
const bracketedExpression = asType("BRACKETED_EXPRESSION");
const squareBracketExpression = asType("SQUARE_BRACKET_EXPRESSION");

const instruction = asType("INSTRUCTION");
const label = asType("LABEL");

module.exports = {
  register,
  hexLiteral,
  variable,
  opPlus,
  opMinus,
  opMulitply,
  binaryOperation,
  bracketedExpression,
  squareBracketExpression,
  instruction,
  address,
  label,
};
