const A = require("arcsecond");
const constantParser = require("./constant");
const { label } = require("./common");
const { data16, data8 } = require("./data");
const instructionParser = require("./instructions");
const structureParser = require("./structure");

module.exports = A.many(A.choice([
  data8,
  data16,
  constantParser,
  structureParser,
  instructionParser,
  label
])).chain(result => A.endOfInput.map(() => result))
