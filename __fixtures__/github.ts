import type * as github from '@actions/github'
import { jest } from '@jest/globals'

export const context = {
  eventName: 'pull_request',
  repo: {
    owner: 'octocat',
    repo: 'Hello-World'
  },
  runId: 12345,
  payload: {
    action: 'opened',
    pull_request: {
      number: 42,
      base: { sha: 'base-sha-123' },
      head: { sha: 'head-sha-456' }
    }
  }
} as unknown as typeof github.context

export const getOctokit = jest.fn<typeof github.getOctokit>()
