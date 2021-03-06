/* eslint-disable no-magic-numbers */
import nock from 'nock';
import path from 'path';
import {Context} from '@actions/github/lib/context';
import {Logger} from '@technote-space/github-action-log-helper';
import {
  testEnv,
  generateContext,
  disableNetConnect,
  getConfigFixture,
  getOctokit,
} from '@technote-space/github-action-test-helper';
import {action} from '../../src/utils/action';

const rootDir       = path.resolve(__dirname, '../..');
const configRootDir = path.resolve(__dirname, '../fixtures');
const logger        = new Logger();
const octokit       = getOctokit();
const getContext    = (branch: string): Context => generateContext({
  event: 'pull_request',
  action: 'opened',
  owner: 'hello',
  repo: 'world',
}, {
  payload: {
    'pull_request': {
      number: 123,
      head: {
        ref: branch,
      },
    },
  },
});

describe('action', () => {
  testEnv(rootDir);
  disableNetConnect(nock);

  it('should add labels', async() => {
    process.env.INPUT_REF = 'refs/pull/123/merge';
    const fn              = jest.fn();
    nock('https://api.github.com')
      .get('/repos/hello/world/contents/' + encodeURIComponent('.github/pr-labeler.yml') + '?ref=' + encodeURIComponent('refs/pull/123/merge'))
      .reply(200, getConfigFixture(configRootDir))
      .post('/repos/hello/world/issues/123/labels', body => {
        fn();
        console.log(body);
        expect(body).toMatchObject({
          labels: ['config-fix'],
        });
        return true;
      })
      .reply(200);

    await action(logger, octokit, getContext('fix/test'));
    expect(fn).toBeCalledTimes(1);
  });

  it('should add default labels', async() => {
    process.env.INPUT_REF = 'refs/pull/123/merge';
    const fn              = jest.fn();
    nock('https://api.github.com')
      .get('/repos/hello/world/contents/' + encodeURIComponent('.github/pr-labeler.yml') + '?ref=' + encodeURIComponent('refs/pull/123/merge'))
      .reply(404)
      .post('/repos/hello/world/issues/123/labels', body => {
        fn();
        expect(body).toMatchObject({
          labels: ['fix'],
        });
        return true;
      })
      .reply(200);

    await action(logger, octokit, getContext('fix/test'));
    expect(fn).toBeCalledTimes(1);
  });

  it('should not add labels if not pr', async() => {
    process.env.INPUT_REF = 'refs/pull/123/merge';
    const fn              = jest.fn();
    nock('https://api.github.com')
      .get('/repos/hello/world/contents/' + encodeURIComponent('.github/pr-labeler.yml') + '?ref=' + encodeURIComponent('refs/pull/123/merge'))
      .reply(200, getConfigFixture(configRootDir))
      .post('/repos/hello/world/issues/123/labels', () => {
        fn();
        return true;
      })
      .reply(200);

    const context = getContext('fix/test');
    delete context.payload.pull_request;
    await action(logger, octokit, context);
    expect(fn).not.toBeCalled();
  });

  it('should not add labels if not matched', async() => {
    process.env.INPUT_REF = 'refs/pull/123/merge';
    const fn              = jest.fn();
    nock('https://api.github.com')
      .get('/repos/hello/world/contents/' + encodeURIComponent('.github/pr-labeler.yml') + '?ref=' + encodeURIComponent('refs/pull/123/merge'))
      .reply(200, getConfigFixture(configRootDir))
      .post('/repos/hello/world/issues/123/labels', () => {
        fn();
        return true;
      })
      .reply(200);

    await action(logger, octokit, getContext('abc/test'));
    expect(fn).not.toBeCalled();
  });
});

