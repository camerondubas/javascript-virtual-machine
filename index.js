const readline = require("readline");
const createMemory = require("./create-memory");
const CPU = require("./cpu");
const instructions = require("./instructions");

const INSTRUCTION_POINTER = 0;
const ACCUMULATOR = 1;
const R1 = 2;
const R2 = 3;

const memory = createMemory(256 * 256);
const writeableBytes = new Uint8Array(memory.buffer);

const cpu = new CPU(memory);

let i = 0;

writeableBytes[i++] = instructions.MOV_MEM_REG;
writeableBytes[i++] = 0x01;
writeableBytes[i++] = 0x00;
writeableBytes[i++] = R1;

writeableBytes[i++] = instructions.MOV_LIT_REG;
writeableBytes[i++] = 0x00;
writeableBytes[i++] = 0x01;
writeableBytes[i++] = R2;

writeableBytes[i++] = instructions.ADD_REG_REG;
writeableBytes[i++] = R1;
writeableBytes[i++] = R2;

writeableBytes[i++] = instructions.MOV_REG_MEM;
writeableBytes[i++] = ACCUMULATOR;
writeableBytes[i++] = 0x01;
writeableBytes[i++] = 0x00;

writeableBytes[i++] = instructions.JMP_NOT_EQ;
writeableBytes[i++] = 0x00;
writeableBytes[i++] = 0x03;
writeableBytes[i++] = 0x00;
writeableBytes[i++] = 0x00;

cpu.debug();
cpu.viewMemoryAt(cpu.getRegister("instructionPointer"));
cpu.viewMemoryAt(0x0100);
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.on("line", () => {
  cpu.step();
  cpu.debug();
  cpu.viewMemoryAt(cpu.getRegister("instructionPointer"));
  cpu.viewMemoryAt(0x0100);
});
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
