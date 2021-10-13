const parser = require("./parser");
const instructions = require("../instructions");
const { instructionTypes } = require("../instructions/meta");
const registers = require("../registers");

const registerMap = registers.reduce((acc, registerName, index) => {
  acc[registerName] = index;
  return acc;
}, {});

const exampleProgram = [
  "start:",
  "  mov $0A, &0050",
  "loop: ",
  "  mov &0050, accumulator",
  "  dec accumulator",
  "  mov accumulator, &0050",
  "  inc r2",
  "  inc r2",
  "  inc r2",
  "  jne $00, &[!loop]",
  "end:",
  "  hlt",
].join("\n");

const parsedOutput = parser.run(exampleProgram);
const labels = {};
let currentAddress = 0;

parsedOutput.result.forEach((instructionOrLabel) => {
  if (instructionOrLabel.type === "LABEL") {
    labels[instructionOrLabel.value] = currentAddress;
  } else {
    const metadata = instructions[instructionOrLabel.value.instruction];
    currentAddress += metadata.size;
  }
});

// Big Endian Encoding System
// Most significant bytes come first
const machineCode = [];

const encodeLitOrMem = (lit) => {
  const radix = 16; // since it's a hexidecimal value
  let hexVal;
  if (lit.type === "VARIABLE") {
    if (!(lit.value in labels)) {
      throw new Error(`label "${lit.value}" wasn't resolved.`);
    }
    hexVal = labels[lit.value];
  } else {
    hexVal = parseInt(lit.value, radix);
  }

  const highByte = (hexVal & 0xff00) >> 8;
  const lowByte = hexVal & 0x00ff;
  machineCode.push(highByte, lowByte);
};

const encodeLit8 = (lit) => {
  const radix = 16; // since it's a hexidecimal value
  let hexVal;
  if (lit.type === "VARIABLE") {
    if (!(lit.value in labels)) {
      throw new Error(`label "${lit.value}" wasn't resolved.`);
    }
    hexVal = labels[lit.value];
  } else {
    hexVal = parseInt(lit.value, radix);
  }
  const lowByte = hexVal & 0x00ff;
  machineCode.push(lowByte);
};

const encodeReg = (reg) => {
  const mappedRegister = registerMap[reg.value];
  machineCode.push(mappedRegister);
};

parsedOutput.result.forEach((instruction) => {
  if (instruction.type !== "INSTRUCTION") {
    return; // The "instruction" is actually a label
  }

  const metadata = instructions[instruction.value.instruction];
  machineCode.push(metadata.opcode);

  if (
    [instructionTypes.litReg, instructionTypes.memReg].includes(metadata.type)
  ) {
    encodeLitOrMem(instruction.value.args[0]);
    encodeReg(instruction.value.args[1]);
  }

  if (
    [instructionTypes.regLit, instructionTypes.regMem].includes(metadata.type)
  ) {
    encodeReg(instruction.value.args[0]);
    encodeLitOrMem(instruction.value.args[1]);
  }

  if (instructionTypes.regLit8 === metadata.type) {
    encodeReg(instruction.value.args[0]);
    encodeLit8(instruction.value.args[1]);
  }

  if (
    [instructionTypes.regReg, instructionTypes.regPtrReg].includes(
      metadata.type
    )
  ) {
    encodeReg(instruction.value.args[0]);
    encodeReg(instruction.value.args[1]);
  }

  if (instructionTypes.litMem === metadata.type) {
    encodeLitOrMem(instruction.value.args[0]);
    encodeLitOrMem(instruction.value.args[1]);
  }

  if (instructionTypes.litOffReg === metadata.type) {
    encodeLitOrMem(instruction.value.args[0]);
    encodeReg(instruction.value.args[1]);
    encodeReg(instruction.value.args[2]);
  }

  if (instructionTypes.singleReg === metadata.type) {
    encodeReg(instruction.value.args[0]);
  }

  if (instructionTypes.singleLit === metadata.type) {
    encodeLitOrMem(instruction.value.args[0]);
  }
});

console.log(machineCode.join(" "));
