const parser = require("./parser");
const instructions = require("../instructions");
const { instructionTypes } = require("../instructions/meta");
const registers = require("../registers");
const fs = require('fs');
const path = require('path');
const { program } = require('commander');

// Setup
program
  .argument("[program]", "something")
  .option('-e, --example <program>', 'assemble the provided example programs');
program.parse(process.argv);

const options = program.opts();
const [programPath] = program.args;

//Load Program
let file;
if (programPath) {
  file = fs.readFileSync(path.join(process.cwd(), programPath), {encoding: 'utf-8'});
} else if (options.example) {
  file = fs.readFileSync(`${__dirname}/../examples/${options.example}.asm`, {encoding: 'utf-8'});
} else {
  return
}

// Assemble Program
const parsedOutput = parser.run(file);

const registerMap = registers.reduce((acc, registerName, index) => {
  acc[registerName] = index;
  return acc;
}, {});

if (parsedOutput.isError) {
  throw new Error(parsedOutput.error);
}

// Big Endian Encoding System
// Most significant bytes come first
const machineCode = [];
const symbolicNames = {};
const structures = {};
let currentAddress = 0;


// Resolving symbolicNames
parsedOutput.result.forEach((node) => {
  switch (node.type) {
    case "LABEL": {
      if (node.value in symbolicNames || node.value in structures) {
        throw new Error(`Can't create label "${node.value}" because a binding with this name already exists`);
      }
      symbolicNames[node.value] = currentAddress;
      break
    }

    case "CONSTANT": {
      if (node.value.name in symbolicNames || node.value.name in structures) {
        throw new Error(`Can't create constant "${node.value.name}" because a binding with this name already exists`);
      }
      symbolicNames[node.value.name] = parseInt(node.value.value.value, 16) & 0xffff;
      break;
    }

    case "DATA": {
      if (node.value.name in symbolicNames || node.value.name in structures) {
        throw new Error(`Can't create data "${node.value.name}" because a binding with this name already exists`);
      }
      symbolicNames[node.value.name] = currentAddress;

      const sizeOfEachValueInBytes = node.value.size === 16 ? 2 : 1;
      const totalSizeInBytes = node.value.values.length * sizeOfEachValueInBytes;

      currentAddress += totalSizeInBytes;
      break;
    }

    case "STRUCTURE": {
      if (node.value.name in symbolicNames || node.value.name in structures) {
        throw new Error(`Can't create structure "${node.value.name}" because a binding with this name already exists`);
      }
      structures[node.value.name] = {
        members: {}
      };

      let offset = 0;

      for (let member of node.value.members) {
        const size = parseInt(member.value.value) & 0xffff;

        structures[node.value.name].members[member.key] = {
          offset,
          size
        };

        offset += size
      }
      break;
    }

    default: {
      const metadata = instructions[node.value.instruction];
      currentAddress += metadata.size;
    }
  }
});

const getNodeValue = node => {
  const radix = 16; // since it's a hexidecimal value

  switch (node.type) {
    case "INTERPRET_AS": {
      const structure = structures[node.value.structure];
      if (!structure) {
        throw new Error(`structure "${node.value.structure}" wasn't resolved.`)
      }

      const member = structure.members[node.value.property];
      if (!member) {
        throw new Error(`property "${node.value.property}" in structure "${node.value.structure}" wasn't resolved.`)
      }

      if (!(node.value.symbol in symbolicNames)) {
        throw new Error(`symbol "${node.value.symbol}" wasn't resolved.`)
      }

      const symbol = symbolicNames[node.value.symbol];

      return symbol + member.offset;
    }
    case "VARIABLE": {
      if (!(node.value in symbolicNames)) {
        throw new Error(`label "${node.value}" wasn't resolved.`);
      }
      return symbolicNames[node.value];
    }
    case "HEX_LITERAL": {
      return parseInt(node.value, radix);
    }
    default: {
      throw new Error(`Unsupported node type: ${node.type}`)
    }
  }
};

const encodeLitOrMem = (node) => {
  const hexVal = getNodeValue(node);
  const highByte = (hexVal & 0xff00) >> 8;
  const lowByte = hexVal & 0x00ff;
  machineCode.push(highByte, lowByte);
};

const encodeLit8 = (node) => {
  const hexVal = getNodeValue(node);
  const lowByte = hexVal & 0xff;
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
  if (node.type === "LABEL" || node.type === "CONSTANT" || node.type === "STRUCTURE") {
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

// Output Machine Code
console.log(machineCode.map(x => '0x' + x.toString(16).padStart(2, '0')).join(', '));
