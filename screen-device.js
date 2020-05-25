const eraseScreen = () => {
  process.stdout.write(`\x1b[2J`);
};

const setBold = () => {
  process.stdout.write(`\x1b[1m`);
};

const setRegular = () => {
  process.stdout.write(`\x1b[0m`);
};

const moveTo = (x, y) => {
  // escape sequence.
  // Allows communicating with the terminal by writing instructions rather than characters
  // Check description of video.
  process.stdout.write(`\x1b[${y};${x}H`);
};

const createScreenDevice = () => {
  return {
    getUint16: () => 0,
    getUint8: () => 0,
    setUint16: (address, data) => {
      const command = (data & 0xff00) >> 8;
      // Look into this?
      const characterValue = data & 0x00ff;
      // const characterValue = data;

      if (command === 0xff) {
        eraseScreen();
      } else if (command === 0x01) {
        setBold();
      } else if (command === 0x02) {
        setRegular();
      }
      const width = 16;
      // "+1" cause the terminal starts at 1
      const x = (address % width) + 1;
      const y = Math.floor(address / width) + 1;

      // "* 2" cause terminal lines are half as tall as they are wide
      moveTo(x * 2, y);

      const character = String.fromCharCode(characterValue);
      process.stdout.write(character);
    },
  };
};

module.exports = createScreenDevice;
