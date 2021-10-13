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

const  dataViewMethods = [
  'getUint8',
  'getUint16',
  'setUint8',
  'setUint16',
];

const createBankedMemory = (numberOfBanks, bankSize, cpu) => {
  const bankBuffers = Array.from({length: numberOfBanks}, () => new ArrayBuffer(bankSize));
  const banks = bankBuffers.map(bankBuffer => new DataView(bankBuffer));


  const forwardToDataView = name => (...args) => {
    const bankIndex = cpu.getRegister('memory_bank') % numberOfBanks;
    const memoryBankToUse = banks[bankIndex];
    return memoryBankToUse[name](...args);
  };

  const interface = dataViewMethods.reduce((dataviewOut, functionName) => {
    dataviewOut[functionName] = forwardToDataView(functionName);
    return dataviewOut;
  }, {});

  return interface;
}

// 255 bytes
const bankSize = 0xff;
const numberOfBanks = 8;

const cpu = new CPU(MM);

const memoryBankDevice = createBankedMemory(numberOfBanks, bankSize, cpu);
MM.map(memoryBankDevice, 0, bankSize);

const regularMemory = createMemory(0xff00);
MM.map(regularMemory, bankSize, 0xffff, true);

console.log('writing value 1 to address 0');
MM.setUint16(0, 1);
console.log('reading value at address 0: ', MM.getUint16(0));

console.log('\n::: switching memory bank (0 -> 1)');
cpu.setRegister('memory_bank', 1);
console.log('reading value at address 0: ', MM.getUint16(0));

console.log('writing value 42 to address 0');
MM.setUint16(0, 42);
console.log('\n::: switching memory bank (1 -> 2)');
cpu.setRegister('memory_bank', 2);
console.log('reading value at address 0: ', MM.getUint16(0));

console.log('\n::: switching memory bank (2 -> 1)');
cpu.setRegister('memory_bank', 1);
console.log('reading value at address 0: ', MM.getUint16(0));
console.log('\n::: switching memory bank (1 -> 0)');
cpu.setRegister('memory_bank', 0);
console.log('reading value at address 0: ', MM.getUint16(0));
