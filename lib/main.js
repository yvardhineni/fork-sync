"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const Github = require('@actions/github');
const { Octokit } = require("@octokit/rest");
const { retry } = require("@octokit/plugin-retry");
const token = core.getInput('token', { required: true });
const context = Github.context;
const MyOctokit = Octokit.plugin(retry);
function run() {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r;
    return __awaiter(this, void 0, void 0, function* () {
        let owner = core.getInput('owner', { required: false }) || context.repo.owner;
        let repo = core.getInput('repo', { required: false }) || context.repo.repo;
        const base = core.getInput('base', { required: false });
        const parent = core.getInput('parent', { required: false });
        const head = core.getInput('head', { required: false });
        const mergeMethod = core.getInput('merge_method', { required: false });
        const prTitle = core.getInput('pr_title', { required: false });
        const prMessage = core.getInput('pr_message', { required: false });
        const ignoreFail = core.getBooleanInput('ignore_fail', { required: false });
        const autoApprove = core.getBooleanInput('auto_approve', { required: false });
        const autoMerge = core.getBooleanInput('auto_merge', { required: false });
        const retries = (_a = parseInt(core.getInput('retries', { required: false }))) !== null && _a !== void 0 ? _a : 4;
        const retryAfter = (_b = parseInt(core.getInput('retry_after', { required: false }))) !== null && _b !== void 0 ? _b : 60;
        const octokit = new MyOctokit({
            auth: token,
            request: {
                retries,
                retryAfter,
            },
        });
        let r = yield octokit.rest.repos.get({
            owner,
            repo,
        });
        if (r && r.data && r.data.parent) {
            owner = r.data.parent.owner.login || owner;
            repo = r.data.parent.name || repo;
        }
        try {
            let pr = yield octokit.pulls.create({ owner: context.repo.owner, repo: context.repo.repo, title: prTitle, head: parent + ':' + head, base: base, body: prMessage, maintainer_can_modify: false });
            yield delay(20);
            if (autoApprove) {
                yield octokit.pulls.createReview({ owner: context.repo.owner, repo: context.repo.repo, pull_number: pr.data.number, event: "COMMENT", body: "Auto approved" });
                yield octokit.pulls.createReview({ owner: context.repo.owner, repo: context.repo.repo, pull_number: pr.data.number, event: "APPROVE" });
            }
            if (autoMerge) {
                yield octokit.pulls.merge({ owner: context.repo.owner, repo: context.repo.repo, pull_number: pr.data.number, merge_method: mergeMethod });
            }
        }
        catch (error) {
            if ((_d = (_c = error === null || error === void 0 ? void 0 : error.request) === null || _c === void 0 ? void 0 : _c.request) === null || _d === void 0 ? void 0 : _d.retryCount) {
                console.log(`request failed after ${error.request.request.retryCount} retries with a delay of ${error.request.request.retryAfter}`);
            }
            if ((_k = (_j = (_h = ((_e = error === null || error === void 0 ? void 0 : error.errors) !== null && _e !== void 0 ? _e : (_g = (_f = error === null || error === void 0 ? void 0 : error.response) === null || _f === void 0 ? void 0 : _f.data) === null || _g === void 0 ? void 0 : _g.errors)) === null || _h === void 0 ? void 0 : _h[0]) === null || _j === void 0 ? void 0 : _j.message) === null || _k === void 0 ? void 0 : _k.startsWith('No commits between')) {
                console.log('No commits between ' + context.repo.owner + ':' + base + ' and ' + owner + ':' + head);
            }
            else if ((_r = (_q = (_p = ((_l = error === null || error === void 0 ? void 0 : error.errors) !== null && _l !== void 0 ? _l : (_o = (_m = error === null || error === void 0 ? void 0 : error.response) === null || _m === void 0 ? void 0 : _m.data) === null || _o === void 0 ? void 0 : _o.errors)) === null || _p === void 0 ? void 0 : _p[0]) === null || _q === void 0 ? void 0 : _q.message) === null || _r === void 0 ? void 0 : _r.startsWith('A pull request already exists for')) {
                // we were already done
                console.log(error.errors[0].message);
            }
            else {
                if (!ignoreFail) {
                    core.setFailed(`Failed to create or merge pull request: ${error !== null && error !== void 0 ? error : "[n/a]"}`);
                }
            }
        }
    });
}
function delay(s) {
    return new Promise(resolve => setTimeout(resolve, s * 1000));
}
run();
