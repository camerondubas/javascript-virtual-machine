const instructionParser = require("./instructions");
const A = require("arcsecond");
const { label } = require("./common");

module.exports = A.many(A.choice([instructionParser, label]));
