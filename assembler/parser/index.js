const { inspect } = require("util");
const instructionParser = require("./instructions");

const deepLog = (x) =>
  console.log(
    inspect(x, {
      depth: Infinity,
      colors: true,
    })
  );

// const res = mov.run("mov $42, r4");
// const res = mov.run("mov accumulator, r1");
// const res = mov.run("mov accumulator, &[!loc + $4200]");
// const res = mov.run("mov &4200, r1");
// const res = mov.run("mov $42, &C0DE");
// const res = mov.run("mov &r3, accumulator");
// const res = mov.run("mov $42, &r1, r4");
// const res = mov.run(
//   "mov [$42 + !loc - ($05 * ($31 + !var) - $07)], r4"
// );

// const res = instructionParser.run("add r2, r4");
// const res = instructionParser.run("sub [!loc - $04], r4");
// const res = instructionParser.run("mul accumulator, stack_pointer");
// const res = instructionParser.run("lsf [!shiftAmount], r1");
// const res = instructionParser.run("xor $C0DE, r5");
// const res = instructionParser.run("jgt r2, $1DEA"); // Error
// const res = instructionParser.run("jgt r2, &1DEA"); // Fixed
// const res = instructionParser.run("psh r2");
// const res = instructionParser.run("pop accumulator");
// const res = instructionParser.run("ret");
const res = instructionParser.run("hlt");

deepLog(res);
