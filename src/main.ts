import * as core from '@actions/core';
const Github = require('@actions/github');
const { Octokit } = require("@octokit/rest");
const { retry } = require("@octokit/plugin-retry");
const token = core.getInput('token', { required: true });
const context = Github.context;
const MyOctokit = Octokit.plugin(retry);

async function run() {
  let owner = core.getInput('owner', { required: false }) || context.repo.owner;
  let repo = core.getInput('repo', { required: false}) || context.repo.repo;
  const base = core.getInput('base', { required: false });
  const parent = core.getInput('parent', { required: false });
  const head = core.getInput('head', { required: false });
  const mergeMethod = core.getInput('merge_method', { required: false });
  const prTitle = core.getInput('pr_title', { required: false });
  const prMessage = core.getInput('pr_message', { required: false });
  const ignoreFail = core.getBooleanInput('ignore_fail', { required: false });
  const autoApprove = core.getBooleanInput('auto_approve', { required: false });
  const autoMerge = core.getBooleanInput('auto_merge', { required: false });
  const retries = parseInt(core.getInput('retries', { required: false })) ?? 4;
  const retryAfter = parseInt(core.getInput('retry_after', { required: false })) ?? 60;

  const octokit = new MyOctokit({
    auth: token,
    request: {
      retries,
      retryAfter,
    },
  });

  let r = await octokit.rest.repos.get({
    owner,
    repo,
  });

  if(r && r.data && r.data.parent) {
    owner = r.data.parent.owner.login || owner
    repo = r.data.parent.name || repo
  }

  try {
    let pr = await octokit.pulls.create({ owner: context.repo.owner, repo: context.repo.repo, title: prTitle, head: parent + ':' + head, base: base, body: prMessage, maintainer_can_modify: false });
    await delay(20);
    if (autoApprove) {
        await octokit.pulls.createReview({ owner: context.repo.owner, repo: context.repo.repo, pull_number: pr.data.number, event: "COMMENT", body: "Auto approved" });
        await octokit.pulls.createReview({ owner: context.repo.owner, repo: context.repo.repo, pull_number: pr.data.number, event: "APPROVE" });
    }
    if(autoMerge) {
        await octokit.pulls.merge({ owner: context.repo.owner, repo: context.repo.repo, pull_number: pr.data.number, merge_method: mergeMethod });
    }
  } catch (error: any) {
    if (error?.request?.request?.retryCount) {
      console.log(
        `request failed after ${error.request.request.retryCount} retries with a delay of ${error.request.request.retryAfter}`
      );
    }
    if ((error?.errors ?? error?.response?.data?.errors)?.[0]?.message?.startsWith('No commits between')) {
      console.log('No commits between ' + context.repo.owner + ':' + base + ' and ' + owner + ':' + head);
    } else if ((error?.errors ?? error?.response?.data?.errors)?.[0]?.message?.startsWith('A pull request already exists for')) {
      // we were already done
      console.log(error.errors[0].message);
    } else {
      if (!ignoreFail) {
        core.setFailed(`Failed to create or merge pull request: ${error ?? "[n/a]"}`);
      }
    }
  }
}

function delay(s: number) {
  return new Promise( resolve => setTimeout(resolve, s * 1000) );
}

run();
