/**
 * Unit tests for the bot's github.context reader, src/github.ts
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import * as core from '../__fixtures__/core.js'
import * as githubFixture from '../__fixtures__/github.js'

jest.unstable_mockModule('@actions/core', () => core)
jest.unstable_mockModule('@actions/github', () => githubFixture)

const { getPRDetails } = await import('../src/github.js')

describe('getPRDetails', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    githubFixture.context.eventName = 'pull_request'
    githubFixture.context.runId = 12345
    githubFixture.context.repo.owner = 'octocat'
    githubFixture.context.repo.repo = 'Hello-World'
    githubFixture.context.payload = {
      action: 'opened',
      pull_request: {
        number: 42,
        base: { sha: 'base-sha-123' },
        head: { sha: 'head-sha-456' }
      }
    } as unknown as typeof githubFixture.context.payload
  })

  it('handles a pull_request event', () => {
    expect(getPRDetails()).toEqual({
      repo: 'Hello-World',
      prNumber: 42,
      baseSha: 'base-sha-123',
      headSha: 'head-sha-456',
      runId: 12345
    })
  })

  it('handles a new opened pull request', () => {
    githubFixture.context.eventName = 'pull_request'
    githubFixture.context.runId = 99999
    githubFixture.context.repo.owner = 'octocat'
    githubFixture.context.repo.repo = 'Hello-World'
    githubFixture.context.payload = {
      action: 'opened',
      pull_request: {
        number: 101,
        base: { sha: 'main-sha-111' },
        head: { sha: 'feature-sha-222' }
      }
    } as unknown as typeof githubFixture.context.payload

    const prDetails = getPRDetails()

    expect(prDetails).toEqual({
      repo: 'Hello-World',
      prNumber: 101,
      baseSha: 'main-sha-111',
      headSha: 'feature-sha-222',
      runId: 99999
    })
    expect(core.notice).not.toHaveBeenCalled()
  })

  it('handles a synchronized pull request', () => {
    githubFixture.context.payload = {
      action: 'synchronize',
      pull_request: {
        number: 42,
        base: { sha: 'base-sha-123' },
        head: { sha: 'new-head-sha-789' }
      }
    } as unknown as typeof githubFixture.context.payload

    expect(getPRDetails()).toEqual({
      repo: 'Hello-World',
      prNumber: 42,
      baseSha: 'base-sha-123',
      headSha: 'new-head-sha-789',
      runId: 12345
    })
  })

  it('logs a notice and returns null when event is not a pull_request', () => {
    githubFixture.context.eventName = 'push'
    githubFixture.context.payload = {} as typeof githubFixture.context.payload

    expect(getPRDetails()).toBeNull()
    expect(core.notice).toHaveBeenCalledWith(
      expect.stringContaining('current event: push')
    )
  })
})
