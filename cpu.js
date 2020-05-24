const createMemory = require("./create-memory");
const instructions = require("./instructions");

class CPU {
  constructor(memory) {
    this.memory = memory;

    this.registerNames = [
      "instructionPointer",
      "accumulator",
      "r1",
      "r2",
      "r3",
      "r4",
      "r5",
      "r6",
      "r7",
      "r8",
    ];

    // Since this is a 16bit VM, we need 2 Bytes per register.
    // /herefore we double the number of registers to get the required memory
    this.registers = createMemory(this.registerNames.length * 2);

    this.registerMap = this.registerNames.reduce((map, name, i) => {
      map[name] = i * 2;
      return map;
    }, {});
  }

  debug() {
    this.registerNames.forEach((name) => {
      console.log(
        `${name}: 0x${this.getRegister(name).toString(16).padStart(4, "0")}`
      );
    });
    console.log();
  }

  viewMemoryAt(address) {
    const nextEightBytes = Array.from({ length: 8 }, (_, i) =>
      this.memory.getUint8(address + i)
    ).map((v) => `0x${v.toString(16).padStart(2, "0")}`);

    console.log(
      `0x${address.toString(16).padStart(4, "0")}: ${nextEightBytes.join(" ")}`
    );
  }

  getRegister(name) {
    if (!(name in this.registerMap)) {
      throw new Error(`getRegister: No such register '${name}'`);
    }

    return this.registers.getUint16(this.registerMap[name]);
  }

  setRegister(name, value) {
    if (!(name in this.registerMap)) {
      throw new Error(`setRegister: No such register '${name}'`);
    }

    return this.registers.setUint16(this.registerMap[name], value);
  }

  fetch() {
    const nextInstructionAddress = this.getRegister("instructionPointer");
    const instruction = this.memory.getUint8(nextInstructionAddress);
    this.setRegister("instructionPointer", nextInstructionAddress + 1);
    return instruction;
  }

  fetch16() {
    const nextInstructionAddress = this.getRegister("instructionPointer");
    const instruction = this.memory.getUint16(nextInstructionAddress);
    this.setRegister("instructionPointer", nextInstructionAddress + 2);
    return instruction;
  }

  execute(instruction) {
    switch (instruction) {
      // Move literal into register
      case instructions.MOV_LIT_REG: {
        const literal = this.fetch16();
        const register = (this.fetch() % this.registerNames.length) * 2;
        this.registers.setUint16(register, literal);
        return;
      }
      // Move register into register
      case instructions.MOV_REG_REG: {
        const registerFrom = (this.fetch() % this.registerNames.length) * 2;
        const registerTo = (this.fetch() % this.registerNames.length) * 2;
        const value = this.registers.getUint16(registerFrom);
        this.registers.setUint16(register, value);
        return;
      }

      // Move register into memory
      case instructions.MOV_REG_MEM: {
        const registerFrom = (this.fetch() % this.registerNames.length) * 2;
        const address = this.fetch16();
        const value = this.registers.getUint16(registerFrom);
        this.memory.setUint16(address, value);
        return;
      }

      // Move memory into register
      case instructions.MOV_MEM_REG: {
        const address = this.fetch16();
        const registerTo = (this.fetch() % this.registerNames.length) * 2;
        const value = this.memory.getUint16(address);
        this.registers.setUint16(registerTo, value);
        return;
      }

      // Add register to register
      case instructions.ADD_REG_REG: {
        const r1 = this.fetch();
        const r2 = this.fetch();
        const registerValue1 = this.registers.getUint16(r1 * 2);
        const registerValue2 = this.registers.getUint16(r2 * 2);
        this.setRegister("accumulator", registerValue1 + registerValue2);
        return;
      }

      // Jump if not equal
      case instructions.JMP_NOT_EQ: {
        const value = this.fetch16();
        const address = this.fetch16();

        if (value !== this.getRegister("accumulator")) {
          this.setRegister("instructionPointer", address);
        }

        return;
      }
    }
  }

  step() {
    const instruction = this.fetch();
    return this.execute(instruction);
  }
}

module.exports = CPU;
