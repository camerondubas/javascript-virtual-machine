const parser = require("./parser");
const instructions = require("../instructions");
const { instructionTypes } = require("../instructions/meta");
const registers = require("../registers");

const registerMap = registers.reduce((acc, registerName, index) => {
  acc[registerName] = index;
  return acc;
}, {});

const exampleProgram = `
constant code_constant = $C0DE

+data8 bytes = { $01, $02, $03, $04 }
data16 words = { $0506, $0708, $090A, $0B0C }

code:
  mov [!code_constant], &1234
`.trim();

const parsedOutput = parser.run(exampleProgram);

if (parsedOutput.isError) {
  throw new Error(parsedOutput.error);
}

// Big Endian Encoding System
// Most significant bytes come first
const machineCode = [];
const symbolicNames = {};
let currentAddress = 0;


// Resolving symbolicNames
parsedOutput.result.forEach((node) => {
  switch (node.type) {
    case "LABEL": {
      symbolicNames[node.value] = currentAddress;
      break
    }

    case "CONSTANT": {
      symbolicNames[node.value.name] = parseInt(node.value.value.value, 16) & 0xffff;
      break;
    }

    case "DATA": {
      symbolicNames[node.value.name] = currentAddress;

      const sizeOfEachValueInBytes = node.value.size === 16 ? 2 : 1;
      const totalSizeInBytes = node.value.values.length * sizeOfEachValueInBytes;

      currentAddress += totalSizeInBytes;
      break;
    }

    default: {
      const metadata = instructions[node.value.instruction];
      currentAddress += metadata.size;
    }
  }
});



const encodeLitOrMem = (lit) => {
  const radix = 16; // since it's a hexidecimal value
  let hexVal;
  if (lit.type === "VARIABLE") {
    if (!(lit.value in symbolicNames)) {
      throw new Error(`label "${lit.value}" wasn't resolved.`);
    }
    hexVal = symbolicNames[lit.value];
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
    if (!(lit.value in symbolicNames)) {
      throw new Error(`label "${lit.value}" wasn't resolved.`);
    }
    hexVal = symbolicNames[lit.value];
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

const encodeData8 = node => {
  for (let byte of node.value.values) {
    const parsed = parseInt(byte.value, 16);
    machineCode.push(parsed & 0xff);
  }
}

const encodeData16 = node => {
  for (let byte of node.value.values) {
    const parsed = parseInt(byte.value, 16);
    machineCode.push((parsed & 0xff00) >> 8);
    machineCode.push(parsed & 0xff);
  }
}

parsedOutput.result.forEach((node) => {
  // ignore symbolicNames
  if (node.type === "LABEL" || node.type === "CONSTANT") {
    return; // The "node" is actually a label
  }

  if (node.type === "DATA") {
    if (node.value.size === 8) {
      encodeData8(node);
    } else {
      encodeData16(node);
    }
    return;
  }

  const metadata = instructions[node.value.instruction];
  machineCode.push(metadata.opcode);

  if (
    [instructionTypes.litReg, instructionTypes.memReg].includes(metadata.type)
  ) {
    encodeLitOrMem(node.value.args[0]);
    encodeReg(node.value.args[1]);
  }

  if (
    [instructionTypes.regLit, instructionTypes.regMem].includes(metadata.type)
  ) {
    encodeReg(node.value.args[0]);
    encodeLitOrMem(node.value.args[1]);
  }

  if (instructionTypes.regLit8 === metadata.type) {
    encodeReg(node.value.args[0]);
    encodeLit8(node.value.args[1]);
  }

  if (
    [instructionTypes.regReg, instructionTypes.regPtrReg].includes(
      metadata.type
    )
  ) {
    encodeReg(node.value.args[0]);
    encodeReg(node.value.args[1]);
  }

  if (instructionTypes.litMem === metadata.type) {
    encodeLitOrMem(node.value.args[0]);
    encodeLitOrMem(node.value.args[1]);
  }

  if (instructionTypes.litOffReg === metadata.type) {
    encodeLitOrMem(node.value.args[0]);
    encodeReg(node.value.args[1]);
    encodeReg(node.value.args[2]);
  }

  if (instructionTypes.singleReg === metadata.type) {
    encodeReg(node.value.args[0]);
  }

  if (instructionTypes.singleLit === metadata.type) {
    encodeLitOrMem(node.value.args[0]);
  }
});

console.log(machineCode.map(x => '0x' + x.toString(16).padStart(2, '0')).join(', '));
