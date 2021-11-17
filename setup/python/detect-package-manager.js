const fs = require('fs');
const path = require('path');


function isPipenv(directory) {
  return (
    fs.existsSync(path.join(directory, 'Pipfile'))
    && fs.existsSync(path.join(directory, 'Pipfile.lock'))
  );
}

function isPoetry(directory) {
  return (
    fs.existsSync(path.join(directory, 'pyproject.toml'))
    && fs.existsSync(path.join(directory, 'poetry.lock'))
  )
}

function detectManager(directory) {
  if (isPipenv(directory)) {
    return "pipenv";
  } else if (isPoetry(directory)) {
    return "poetry";
  } else {
    return "unknown";
  }
}

module.exports = async ({ core }) => {
  const workspace = process.cwd();

  core.info(`working inside ${workspace}`);
  core.info(`file list: ${fs.readdirSync(workspace).join(', ')}`)

  const manager = detectManager(workspace);
  core.setOutput("using", manager);
}
