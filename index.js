const readline = require("readline");
const createMemory = require("./create-memory");
const CPU = require("./cpu");
const instructions = require("./instructions");
const MemoryMapper = require("./memory-mapper");
const createScreenDevice = require("./screen-device");

const INSTRUCTION_POINTER = 0;
const ACCUMULATOR = 1;
const R1 = 2;
const R2 = 3;
const R3 = 4;
const R4 = 5;
const R5 = 6;
const R6 = 7;
const R7 = 8;
const R8 = 9;
const STACK_POINTER = 10;
const FRAME_POINTER = 11;

const MM = new MemoryMapper();

const memory = createMemory(256 * 256);
MM.map(memory, 0, 0xffff);

// Map 0xFF bytes of the address space to an "output device" - just stdout
MM.map(createScreenDevice(), 0x3000, 0x30ff, true);

const writeableBytes = new Uint8Array(memory.buffer);

const cpu = new CPU(MM);

let i = 0;

const writeCharToScreen = (char, command, position) => {
  writeableBytes[i++] = instructions.MOV_LIT_REG.opcode;
  writeableBytes[i++] = command;
  writeableBytes[i++] = char.charCodeAt(0);
  writeableBytes[i++] = R1;

  writeableBytes[i++] = instructions.MOV_REG_MEM.opcode;
  writeableBytes[i++] = R1;
  writeableBytes[i++] = 0x30;
  writeableBytes[i++] = position;
};

//.Program 6 - Format Text
// Clear screen
writeCharToScreen("*", 0xff, 0);

for (let index = 0; index <= 0xff; index++) {
  const command =
    index % 2 === 0
      ? 0x01 // bold text
      : 0x02; // regular text
  writeCharToScreen("*", command, index);
}
writeableBytes[i++] = instructions.HLT.opcode;

cpu.run();
