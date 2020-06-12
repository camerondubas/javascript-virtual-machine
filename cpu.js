const createMemory = require("./create-memory");
const instructions = require("./instructions");

// Note: because this is a 16bit machine
// There are 0xFFFF uniquely addressable bytes
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
      "stackPointer",
      "framePointer",
    ];

    // Since this is a 16bit VM, we need 2 Bytes per register.
    // /herefore we double the number of registers to get the required memory
    this.registers = createMemory(this.registerNames.length * 2);

    this.registerMap = this.registerNames.reduce((map, name, i) => {
      map[name] = i * 2;
      return map;
    }, {});

    // "-1" because we need 2 bytes
    this.setRegister("stackPointer", 0xffff - 1);
    this.setRegister("framePointer", 0xffff - 1);

    this.stackFrameSize = 0;
  }

  debug() {
    this.registerNames.forEach((name) => {
      console.log(
        `${name}: 0x${this.getRegister(name).toString(16).padStart(4, "0")}`
      );
    });
    console.log();
  }

  viewMemoryAt(address, numberOfBytes = 8) {
    const nextNBytes = Array.from({ length: numberOfBytes }, (_, i) =>
      this.memory.getUint8(address + i)
    ).map((v) => `0x${v.toString(16).padStart(2, "0")}`);

    console.log(
      `0x${address.toString(16).padStart(4, "0")}: ${nextNBytes.join(" ")}`
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

  fetchRegisterIndex() {
    // Modulo length of registers to have sensible fallback for invalid indexes
    // "*2" because...(?)
    return (this.fetch() % this.registerNames.length) * 2;
  }

  push(value) {
    const stackPointerAddress = this.getRegister("stackPointer");
    this.memory.setUint16(stackPointerAddress, value);
    // "-2" because the stack goes backwards 2 bytes/16bits
    this.setRegister("stackPointer", stackPointerAddress - 2);
    this.stackFrameSize += 2;
  }

  pushState() {
    // Push current CPU state to the stack
    this.push(this.getRegister("r1"));
    this.push(this.getRegister("r2"));
    this.push(this.getRegister("r3"));
    this.push(this.getRegister("r4"));
    this.push(this.getRegister("r5"));
    this.push(this.getRegister("r6"));
    this.push(this.getRegister("r7"));
    this.push(this.getRegister("r8"));
    this.push(this.getRegister("instructionPointer")); // Think of this as the "return address" of this subroutine
    this.push(this.stackFrameSize + 2); // Takes 2 bytes

    // Move Frame pointer to where the stack currently points,
    // so that we can safely move the stackPointer without losing reference to where it was
    this.setRegister("framePointer", this.getRegister("stackPointer"));
    // Set to 0 so that new stack frame can be accurately tracked.
    this.stackFrameSize = 0;
  }
  pop() {
    // "+2" because that's the last item that was pushed to the stack.
    const nextStackPointerAddress = this.getRegister("stackPointer") + 2;
    this.setRegister("stackPointer", nextStackPointerAddress);
    this.stackFrameSize -= 2;
    return this.memory.getUint16(nextStackPointerAddress);
  }

  popState() {
    const framePointerAddress = this.getRegister("framePointer");

    // Any values in subroutine can be ignored now
    // "Variables have gone out of scope"
    this.setRegister("stackPointer", framePointerAddress);

    // This gives the size of the old stack frame,
    //because it was the last thing pushed to the frame via "pushState"
    this.stackFrameSize = this.pop();

    // Copy value for later
    const stackFrameSize = this.stackFrameSize;

    // Reverse order from "pushState"
    this.setRegister("instructionPointer", this.pop());
    this.setRegister("r8", this.pop());
    this.setRegister("r7", this.pop());
    this.setRegister("r6", this.pop());
    this.setRegister("r5", this.pop());
    this.setRegister("r4", this.pop());
    this.setRegister("r3", this.pop());
    this.setRegister("r2", this.pop());
    this.setRegister("r1", this.pop());

    // Number of arguments pushed to the subroutine
    const nArgs = this.pop();
    for (let index = 0; index < nArgs; index++) {
      this.pop();
    }

    // Set to beginning of this frame
    this.setRegister("framePointer", framePointerAddress + stackFrameSize);
  }

  execute(instruction) {
    switch (instruction) {
      // Move literal into register
      case instructions.MOV_LIT_REG.opcode: {
        const literal = this.fetch16();
        const registerIndex = this.fetchRegisterIndex();
        this.registers.setUint16(registerIndex, literal);
        return;
      }
      // Move register into register
      case instructions.MOV_REG_REG.opcode: {
        const registerIndexFrom = this.fetchRegisterIndex();
        const registerIndexTo = this.fetchRegisterIndex();
        const value = this.registers.getUint16(registerIndexFrom);
        this.registers.setUint16(registerIndexTo, value);
        return;
      }

      // Move register into memory
      case instructions.MOV_REG_MEM.opcode: {
        const registerIndexFrom = this.fetchRegisterIndex();
        const address = this.fetch16();
        const value = this.registers.getUint16(registerIndexFrom);
        this.memory.setUint16(address, value);
        return;
      }

      // Move memory into register
      case instructions.MOV_MEM_REG.opcode: {
        const address = this.fetch16();
        const registerIndexTo = this.fetchRegisterIndex();
        const value = this.memory.getUint16(address);
        this.registers.setUint16(registerIndexTo, value);
        return;
      }

      // Move litteral to memory
      case instructions.MOV_LIT_MEM.opcode: {
        const value = this.fetch16();
        const address = this.fetch16();
        this.memory.setUint16(address, value);
        return;
      }

      // Move register* to register
      case instructions.MOV_REG_PTR_REG.opcode: {
        const r1 = this.fetchRegisterIndex(); // holds an address
        const r2 = this.fetchRegisterIndex(); // Where to put the value. The destination
        const pointer = this.registers.getUint16(r1); // The address in memory, from r1
        const value = this.memory.getUint16(ptr);
        this.registers.setUint16(r2, value);
        return;
      }

      // Move value a [literal + register] to register. OFF = offset
      case instructions.MOV_LIT_OFF_REG.opcode: {
        const baseAdress = this.fetch16();
        const r1 = this.fetchRegisterIndex();
        const r2 = this.fetchRegisterIndex();
        const offset = this.registers.getUint16(r1);

        const value = this.memory.getUint16(baseAdress + offset);
        this.registers.setUint16(r2, value);
        return;
      }

      // Add register to register
      case instructions.ADD_REG_REG.opcode: {
        const r1 = this.fetchRegisterIndex();
        const r2 = this.fetchRegisterIndex();
        const registerValue1 = this.registers.getUint16(r1);
        const registerValue2 = this.registers.getUint16(r2);
        this.setRegister("accumulator", registerValue1 + registerValue2);
        return;
      }

      // Add literal to register
      case instructions.ADD_LIT_REG.opcode: {
        const literal = this.fetch16();
        const r1 = this.fetchRegisterIndex();
        const registerValue = this.registers.getUint16(r1);
        this.setRegister("accumulator", literal + registerValue);
        return;
      }

      // Subtract literal from register value
      case instructions.SUB_LIT_REG.opcode: {
        const literal = this.fetch16();
        const r1 = this.fetchRegisterIndex();
        const registerValue = this.registers.getUint16(r1);
        this.setRegister("accumulator", registerValue - literal);
        return;
      }

      // Subtract register from literal
      case instructions.SUB_REG_LIT.opcode: {
        const r1 = this.fetchRegisterIndex();
        const literal = this.fetch16();
        const registerValue = this.registers.getUint16(r1);
        this.setRegister("accumulator", literal - registerValue);
        return;
      }

      // Subtract register from register
      case instructions.SUB_REG_REG.opcode: {
        const r1 = this.fetchRegisterIndex();
        const r2 = this.fetchRegisterIndex();
        const registerValue1 = this.registers.getUint16(r1);
        const registerValue2 = this.registers.getUint16(r2);
        this.setRegister("accumulator", registerValue1 - registerValue2);
        return;
      }

      // Multiply literal by register
      case instructions.MUL_LIT_REG.opcode: {
        const literal = this.fetch16();
        const r1 = this.fetchRegisterIndex();
        const registerValue = this.registers.getUint16(r1);
        this.setRegister("accumulator", literal * registerValue);
        return;
      }

      // Multiply literal by register
      // This is specifically for unsigned multiplication,
      // as signed multiplication requires specific logic
      case instructions.MUL_REG_REG.opcode: {
        const r1 = this.fetchRegisterIndex();
        const r2 = this.fetchRegisterIndex();
        const registerValue1 = this.registers.getUint16(r1);
        const registerValue2 = this.registers.getUint16(r2);
        this.setRegister("accumulator", registerValue1 * registerValue2);
        return;
      }

      // Increment value in register (in place, not accumulator)
      case instructions.INC_REG.opcode: {
        const r1 = this.fetchRegisterIndex();
        const oldValue = this.registers.getUint16(r1);
        const newValue = oldValue + 1;
        this.registers.setUint16(r1, newValue);
        return;
      }

      // Decrement value in register (in place, not accumulator)
      case instructions.DEC_REG.opcode: {
        const r1 = this.fetchRegisterIndex();
        const oldValue = this.registers.getUint16(r1);
        const newValue = oldValue - 1;
        this.registers.setUint16(r1, newValue);
        return;
      }

      // Left shift register by literal (in place)
      // "<<" JS Binary Left shift operator
      case instructions.LSF_REG_LIT.opcode: {
        const r1 = this.fetchRegisterIndex();
        const literal = this.fetch();
        const registerValue = this.registers.getUint16(r1);
        this.registers.setUint16(r1, registerValue << literal);
        return;
      }

      // Left shift register by register (in place)
      case instructions.LSF_REG_REG.opcode: {
        const r1 = this.fetchRegisterIndex();
        const r2 = this.fetchRegisterIndex();
        const registerValue = this.registers.getUint16(r1);
        const shiftBy = this.registers.getUint16(r2);
        this.registers.setUint16(r1, registerValue << shiftBy);
        return;
      }

      // Right shift register by literal (in place)
      // ">>" JS Bindary Right shift operator
      case instructions.RSF_REG_LIT.opcode: {
        const r1 = this.fetchRegisterIndex();
        const literal = this.fetch();
        const registerValue = this.registers.getUint16(r1);
        this.registers.setUint16(r1, registerValue >> literal);
        return;
      }

      // Right shift register by register (in place)
      case instructions.RSF_REG_REG.opcode: {
        const r1 = this.fetchRegisterIndex();
        const r2 = this.fetchRegisterIndex();
        const registerValue = this.registers.getUint16(r1);
        const shiftBy = this.registers.getUint16(r2);
        this.registers.setUint16(r1, registerValue >> shiftBy);
        return;
      }

      // And register with literal
      // "&" JS Binray AND operator
      // Ex, 1110, 1011 = 1010
      case instructions.AND_REG_LIT.opcode: {
        const r1 = this.fetchRegisterIndex();
        const literal = this.fetch16();
        const registerValue = this.registers.getUint16(r1);
        this.setRegister("accumulator", registerValue & literal);
        return;
      }

      // And register with register
      case instructions.AND_REG_REG.opcode: {
        const r1 = this.fetchRegisterIndex();
        const r2 = this.fetchRegisterIndex();
        const registerValue1 = this.registers.getUint16(r1);
        const registerValue2 = this.registers.getUint16(r2);
        this.setRegister("accumulator", registerValue1 & registerValue2);
        return;
      }

      // Or register with literal
      // "|" JS Binray OR operator
      // Ex, 1010, 0110 = 1110
      case instructions.OR_REG_LIT.opcode: {
        const r1 = this.fetchRegisterIndex();
        const literal = this.fetch16();
        const registerValue = this.registers.getUint16(r1);
        this.setRegister("accumulator", registerValue | literal);
        return;
      }

      // Or register with register
      case instructions.OR_REG_REG.opcode: {
        const r1 = this.fetchRegisterIndex();
        const r2 = this.fetchRegisterIndex();
        const registerValue1 = this.registers.getUint16(r1);
        const registerValue2 = this.registers.getUint16(r2);
        this.setRegister("accumulator", registerValue1 | registerValue2);
        return;
      }

      // XOR register with literal
      // "^" JS Binray XOR operator
      // Ex, 0110, 1010 = 1100
      case instructions.XOR_REG_LIT.opcode: {
        const r1 = this.fetchRegisterIndex();
        const literal = this.fetch16();
        const registerValue = this.registers.getUint16(r1);
        this.setRegister("accumulator", registerValue ^ literal);
        return;
      }

      // XOR register with register
      case instructions.XOR_REG_REG.opcode: {
        const r1 = this.fetchRegisterIndex();
        const r2 = this.fetchRegisterIndex();
        const registerValue1 = this.registers.getUint16(r1);
        const registerValue2 = this.registers.getUint16(r2);
        this.setRegister("accumulator", registerValue1 ^ registerValue2);
        return;
      }

      // NOT (invert) register
      // "~" JS Binray XOR operator
      case instructions.NOT.opcode: {
        const r1 = this.fetchRegisterIndex();
        const registerValue = this.registers.getUint16(r1);

        // NOTE: Because under the hood, JS will always operate with 32bit numbers,
        // a NOT would result in the "top" 16bits being flipped from 0s to 1s.
        // To handle this, we do a logical AND ("&") to explicitly grab just the "bottom" 16 bits.
        const res = ~registerValue & 0xffff;
        this.setRegister("accumulator", res);
        return;
      }

      // Jump if not equal to
      case instructions.JMP_NOT_EQ.opcode: {
        const value = this.fetch16();
        const address = this.fetch16();

        if (value !== this.getRegister("accumulator")) {
          this.setRegister("instructionPointer", address);
        }

        return;
      }

      // Jump if register not equal to
      case instructions.JNE_REG.opcode: {
        const r1 = this.fetchRegisterIndex();
        const value = this.registers.getUint16(r1);
        const address = this.fetch16();

        if (value !== this.getRegister("accumulator")) {
          this.setRegister("instructionPointer", address);
        }

        return;
      }

      // Jump if literal equal to
      case instructions.JEQ_LIT.opcode: {
        const value = this.fetch16();
        const address = this.fetch16();

        if (value === this.getRegister("accumulator")) {
          this.setRegister("instructionPointer", address);
        }

        return;
      }

      // Jump if register equal to
      case instructions.JEQ_REG.opcode: {
        const r1 = this.fetchRegisterIndex();
        const value = this.registers.getUint16(r1);
        const address = this.fetch16();

        if (value === this.getRegister("accumulator")) {
          this.setRegister("instructionPointer", address);
        }

        return;
      }

      // Jump if literal lesser than
      case instructions.JLT_LIT.opcode: {
        const value = this.fetch16();
        const address = this.fetch16();

        if (value < this.getRegister("accumulator")) {
          this.setRegister("instructionPointer", address);
        }

        return;
      }

      // Jump if register lesser than
      case instructions.JLT_REG.opcode: {
        const r1 = this.fetchRegisterIndex();
        const value = this.registers.getUint16(r1);
        const address = this.fetch16();

        if (value < this.getRegister("accumulator")) {
          this.setRegister("instructionPointer", address);
        }

        return;
      }

      // Jump if literal greater than
      case instructions.JGT_LIT.opcode: {
        const value = this.fetch16();
        const address = this.fetch16();

        if (value > this.getRegister("accumulator")) {
          this.setRegister("instructionPointer", address);
        }

        return;
      }

      // Jump if register greater than
      case instructions.JGT_REG.opcode: {
        const r1 = this.fetchRegisterIndex();
        const value = this.registers.getUint16(r1);
        const address = this.fetch16();

        if (value > this.getRegister("accumulator")) {
          this.setRegister("instructionPointer", address);
        }

        return;
      }

      // Jump if literal lesser than or equal to
      case instructions.JLE_LIT.opcode: {
        const value = this.fetch16();
        const address = this.fetch16();

        if (value <= this.getRegister("accumulator")) {
          this.setRegister("instructionPointer", address);
        }

        return;
      }

      // Jump if register lesser than or equal to
      case instructions.JLE_REG.opcode: {
        const r1 = this.fetchRegisterIndex();
        const value = this.registers.getUint16(r1);
        const address = this.fetch16();

        if (value <= this.getRegister("accumulator")) {
          this.setRegister("instructionPointer", address);
        }

        return;
      }

      // Jump if literal greater than or equal to
      case instructions.JGE_LIT.opcode: {
        const value = this.fetch16();
        const address = this.fetch16();

        if (value >= this.getRegister("accumulator")) {
          this.setRegister("instructionPointer", address);
        }

        return;
      }

      // Jump if register greater than or equal to
      case instructions.JGE_REG.opcode: {
        const r1 = this.fetchRegisterIndex();
        const value = this.registers.getUint16(r1);
        const address = this.fetch16();

        if (value >= this.getRegister("accumulator")) {
          this.setRegister("instructionPointer", address);
        }

        return;
      }

      // Push literal value to stack
      case instructions.PSH_LIT.opcode: {
        const value = this.fetch16();
        this.push(value);
        return;
      }

      // Push the value of a register to stack
      case instructions.PSH_REG.opcode: {
        const registerIndex = this.fetchRegisterIndex();
        this.push(this.registers.getUint16(registerIndex));
        return;
      }

      // Pop from stack
      case instructions.POP.opcode: {
        const registerIndex = this.fetchRegisterIndex();
        const value = this.pop();
        this.registers.setUint16(registerIndex, value);

        return;
      }

      // Call literal subroutine
      case instructions.CAL_LIT.opcode: {
        // Subroutine address
        const address = this.fetch16();

        this.pushState();
        this.setRegister("instructionPointer", address);
        return;
      }

      // Call subroutine from register
      case instructions.CAL_REG.opcode: {
        const registerIndex = this.fetchRegisterIndex();
        // Subroutine address
        const address = this.registers.getUint16(registerIndex);

        this.pushState();

        this.setRegister("instructionPointer", address);
        return;
      }

      // Return from subroutine
      case instructions.RET.opcode: {
        this.popState();
        return;
      }

      case instructions.HLT.opcode: {
        return true;
      }
    }
  }

  step() {
    const instruction = this.fetch();
    return this.execute(instruction);
  }

  run() {
    const halt = this.step();
    if (!halt) {
      setImmediate(() => this.run());
    }
  }
}

module.exports = CPU;
