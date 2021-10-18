const A = require("arcsecond");
const instructionParser = require("./instructions");
const { data16, data8 } = require("./data");
const constantParser = require("./constant");
const { label } = require("./common");

module.exports = A.many(A.choice([
  data8,
  data16,
  constantParser,
  instructionParser,
  label
])).chain(result => A.endOfInput.map(() => result))
