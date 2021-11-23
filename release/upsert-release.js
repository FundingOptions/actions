
const getPreviousReleaseName = async ({ github, repo: {owner, repo} }) => {
  // TODO: handle pagination
  const query = `
    query($owner: String!, $repo: String!) {
      repository(name: $repo, owner: $owner) {
        releases(orderBy: {field: NAME, direction: DESC}, first: 20) {
          nodes {
            name
            isDraft
          }
        }
      }
    }
  `;
  const latestReleases = await github.graphql(query, { owner, repo });
  const latestRelease = latestReleases.repository.releases.nodes.find(release => !release.isDraft);

  return latestRelease && latestRelease.name || '';
}

const incrementRelease = async({ name }) => {
  // We're assuming a basic structure of [v]123[.4]
  // if a tag doesn't exist

  const releasePattern = /^v?(?<major>\d+)(?:\.(?<patch>\d+))?$/;
  const major = name.match(releasePattern).groups.major;

  if (major) {
    return `v${parseInt(major, 10) + 1}`;
  }
}

const generateRelaseNotes = async ({
  github,
  repo: {owner, repo},
  previousReleaseName,
  newReleaseName,
  targetingBranch,
}) => {
  const { data: body } = await github.rest.repos.generateReleaseNotes({
    owner,
    repo,
    tag_name: newReleaseName,
    target_commitish: targetingBranch,
    previous_tag_name: previousReleaseName,
  });

  return body;
}

const upsertPullRequest = async ({
  github,
  repo: {owner, repo},
  headBranch,
  baseBranch,
  title,
  body
}) => {
  let pull_number;
  try {
    const { data } = await github.pulls.create({
      owner,
      repo,
      title,
      body,
      head: headBranch,
      base: baseBranch,
      draft: true,
    });
    pull_number = data.number;
  } catch (e) {
    // an Open Release PR alread exists
    const prs = await github.pulls.list({
      owner,
      repo,
      state: "open",
      head: headBranch,
      base: baseBranch,
    });

    if (prs.data.length !== 1) throw Error("Expected 1 PR to be found");

    pull_number = prs.data[0].number;
    await github.pulls.update({
      owner,
      repo,
      pull_number,
      title,
      body,
    });
  }
}

const upsertReleasePR = async ({ core, github, context, inputs }) => {
  const repo = context.repo();
  const previousReleaseName = await getPreviousReleaseName({ github, repo });

  if (!previousReleaseName) {
    core.setFailed(`No past releases found for ${repo.owner}/${repo.repo}`);
    return;
  }

  const newReleaseName = await incrementRelease({ name: previousReleaseName });
  const title = `Release ${newReleaseName}`;
  const body = await generateRelaseNotes({
    github,
    repo,
    previousReleaseName: lastReleaseName,
    newReleaseName,
    targetingBranch: inputs.headBranch,
  });

  await upsertPullRequest({
    github,
    repo,
    headBranch: inputs.headBranch,
    baseBranch: inputs.baseBranch,
    title,
    body,
  });
};

const createReleaseTag = async ({ core, github, context, inputs }) => {
  const {owner, repo} = context.repo();

  const previousReleaseName = await getPreviousReleaseName({ github, repo });

  if (!previousReleaseName) {
    core.setFailed(`No past releases found for ${repo.owner}/${repo.repo}`);
    return;
  }

  const newReleaseName = await incrementRelease({ name: previousReleaseName });

  await github.rest.repos.createRelease({
    owner,
    repo,
    tag_name: newReleaseName,
    target_commitish: inputs.baseBranch,
    name: newReleaseName,
    generate_release_notes: true
  })
}

module.exports = async ({ core, github, context, inputs }) => {
  switch (inputs.command) {
    case 'releasePR':
      await upsertReleasePR({ core, github, context, inputs });
      break;
    case 'createReleaseTag':
      await createReleaseTag({ core, github, context, inputs });
      break;
  }
};
