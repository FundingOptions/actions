const fs = require('fs');

module.exports = async () => {
  const outputFile = process.env.OUTPUT_FILE;
  const contents = process.env.CONTENTS;

  // write the contents to the output file
  fs.writeFileSync(outputFile, contents);
};
