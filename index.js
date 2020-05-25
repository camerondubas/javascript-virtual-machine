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

// Map 0xFF bytes of the address space to an "output devcice" - just stdout
MM.map(createScreenDevice(), 0x3000, 0x30ff, true);

const writeableBytes = new Uint8Array(memory.buffer);

const cpu = new CPU(MM);

let i = 0;

const writeCharToScreen = (char, command, position) => {
  writeableBytes[i++] = instructions.MOV_LIT_REG;
  writeableBytes[i++] = command;
  writeableBytes[i++] = char.charCodeAt(0);
  writeableBytes[i++] = R1;

  writeableBytes[i++] = instructions.MOV_REG_MEM;
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
writeableBytes[i++] = instructions.HLT;

cpu.run();

// // Program 1
// writeableBytes[i++] = instructions.MOV_LIT_REG;
// writeableBytes[i++] = 0x12; // 0x1234
// writeableBytes[i++] = 0x34;
// writeableBytes[i++] = R1;

// writeableBytes[i++] = instructions.MOV_LIT_REG;
// writeableBytes[i++] = 0xab; // 0xABCD
// writeableBytes[i++] = 0xcd;
// writeableBytes[i++] = R2;

// writeableBytes[i++] = instructions.ADD_REG_REG;
// writeableBytes[i++] = R1;
// writeableBytes[i++] = R2;

// writeableBytes[i++] = instructions.MOV_REG_MEM;
// writeableBytes[i++] = ACCUMULATOR;
// writeableBytes[i++] = 0x01;
// writeableBytes[i++] = 0x00; //0x0100

// cpu.debug();
// cpu.viewMemoryAt(cpu.getRegister("instructionPointer"));
// cpu.viewMemoryAt(0x0100);

// cpu.step();
// cpu.debug();
// cpu.viewMemoryAt(cpu.getRegister("instructionPointer"));
// cpu.viewMemoryAt(0x0100);

// cpu.step();
// cpu.debug();
// cpu.viewMemoryAt(cpu.getRegister("instructionPointer"));
// cpu.viewMemoryAt(0x0100);

// cpu.step();
// cpu.debug();
// cpu.viewMemoryAt(cpu.getRegister("instructionPointer"));
// cpu.viewMemoryAt(0x0100);

// cpu.step();
// cpu.debug();
// cpu.viewMemoryAt(cpu.getRegister("instructionPointer"));
// cpu.viewMemoryAt(0x0100);

// // Program 2
// writeableBytes[i++] = instructions.MOV_MEM_REG;
// writeableBytes[i++] = 0x01;
// writeableBytes[i++] = 0x00;
// writeableBytes[i++] = R1;

// writeableBytes[i++] = instructions.MOV_LIT_REG;
// writeableBytes[i++] = 0x00;
// writeableBytes[i++] = 0x01;
// writeableBytes[i++] = R2;

// writeableBytes[i++] = instructions.ADD_REG_REG;
// writeableBytes[i++] = R1;
// writeableBytes[i++] = R2;

// writeableBytes[i++] = instructions.MOV_REG_MEM;
// writeableBytes[i++] = ACCUMULATOR;
// writeableBytes[i++] = 0x01;
// writeableBytes[i++] = 0x00;

// writeableBytes[i++] = instructions.JMP_NOT_EQ;
// writeableBytes[i++] = 0x00;
// writeableBytes[i++] = 0x03;
// writeableBytes[i++] = 0x00;
// writeableBytes[i++] = 0x00;

// // Program 3 - Push & Pop
// writeableBytes[i++] = instructions.MOV_LIT_REG;
// writeableBytes[i++] = 0x51;
// writeableBytes[i++] = 0x51;
// writeableBytes[i++] = R1;

// writeableBytes[i++] = instructions.MOV_LIT_REG;
// writeableBytes[i++] = 0x42;
// writeableBytes[i++] = 0x42;
// writeableBytes[i++] = R2;

// writeableBytes[i++] = instructions.PSH_REG;
// writeableBytes[i++] = R1;

// writeableBytes[i++] = instructions.PSH_REG;
// writeableBytes[i++] = R2;

// writeableBytes[i++] = instructions.POP;
// writeableBytes[i++] = R1;

// writeableBytes[i++] = instructions.POP;
// writeableBytes[i++] = R2;

// Program 4 - Subroutine
// writeableBytes[i++] = instructions.PSH_LIT;
// writeableBytes[i++] = 0x33;
// writeableBytes[i++] = 0x33;

// writeableBytes[i++] = instructions.PSH_LIT;
// writeableBytes[i++] = 0x22;
// writeableBytes[i++] = 0x22;

// writeableBytes[i++] = instructions.PSH_LIT;
// writeableBytes[i++] = 0x11;
// writeableBytes[i++] = 0x11;

// writeableBytes[i++] = instructions.MOV_LIT_REG;
// writeableBytes[i++] = 0x12;
// writeableBytes[i++] = 0x34;
// writeableBytes[i++] = R1;

// writeableBytes[i++] = instructions.MOV_LIT_REG;
// writeableBytes[i++] = 0x56;
// writeableBytes[i++] = 0x78;
// writeableBytes[i++] = R4;

// writeableBytes[i++] = instructions.PSH_LIT;
// writeableBytes[i++] = 0x00;
// writeableBytes[i++] = 0x00;

// writeableBytes[i++] = instructions.CAL_LIT;
// writeableBytes[i++] = 0x30;
// writeableBytes[i++] = 0x00;

// writeableBytes[i++] = instructions.PSH_LIT;
// writeableBytes[i++] = 0x44;
// writeableBytes[i++] = 0x44;

// // Subroutine...

// i = 0x3000;

// writeableBytes[i++] = instructions.PSH_LIT;
// writeableBytes[i++] = 0x01;
// writeableBytes[i++] = 0x02;

// writeableBytes[i++] = instructions.PSH_LIT;
// writeableBytes[i++] = 0x03;
// writeableBytes[i++] = 0x04;

// writeableBytes[i++] = instructions.PSH_LIT;
// writeableBytes[i++] = 0x05;
// writeableBytes[i++] = 0x06;

// writeableBytes[i++] = instructions.MOV_LIT_REG;
// writeableBytes[i++] = 0x07;
// writeableBytes[i++] = 0x08;
// writeableBytes[i++] = R1;

// writeableBytes[i++] = instructions.MOV_LIT_REG;
// writeableBytes[i++] = 0x09;
// writeableBytes[i++] = 0x0a;
// writeableBytes[i++] = R8;

// writeableBytes[i++] = instructions.RET;

// // Program 5 - Hello World
// "Hello World!".split("").forEach((char, index) => {
//   writeCharToScreen(char, index);
// });
