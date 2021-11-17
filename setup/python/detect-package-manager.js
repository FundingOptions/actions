const fs = require('fs');
const path = require('path');


function isPipenv(directory) {
  return (
    fs.existsSync(path.join(directory, 'Pipenv'))
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

function getDependencies(manager) {
  switch (manager) {
    case "pipenv":
      return "pipenv";
    case "poetry":

  }
}

module.exports = async ({ core, github }) => {
  workspace = github.workspace;
  if (!workspace) {
    throw Error("`env.WORKSPACE` not set");
  }

  const manager = detectManager(workspace);
  core.setOutput("using", manager);
}
