/**
 * Unit tests for src/github/comments.ts
 */
import { jest } from '@jest/globals'
import * as core from '../__fixtures__/core.js'

type Comment = { id: number; body?: string }

// Small fake Octokit. Swap for the shared fake from "Shared test helpers"
// (#8) once it lands.
const paginate = jest.fn<(...args: unknown[]) => Promise<Comment[]>>()
const listComments = jest.fn()
const createComment =
  jest.fn<(...args: unknown[]) => Promise<{ data: Comment }>>()
const updateComment =
  jest.fn<(...args: unknown[]) => Promise<{ data: Comment }>>()
const octokit = {
  paginate,
  rest: { issues: { listComments, createComment, updateComment } }
}

const context = { issue: { owner: 'sfuosdev', repo: 'sandbox', number: 7 } }
const getOctokit = jest.fn<() => typeof octokit>()

jest.unstable_mockModule('@actions/core', () => core)
jest.unstable_mockModule('@actions/github', () => ({ context, getOctokit }))

const { upsertComment, COMMENT_MARKER } =
  await import('../src/github/comments.js')

describe('upsertComment', () => {
  beforeEach(() => {
    context.issue.number = 7
    core.getInput.mockReturnValue('fake-token')
    getOctokit.mockReturnValue(octokit)
    createComment.mockResolvedValue({ data: { id: 1 } })
    updateComment.mockResolvedValue({ data: { id: 42 } })
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  it('creates a comment with the marker when the bot has none yet', async () => {
    paginate.mockResolvedValue([{ id: 5, body: 'LGTM from a human' }])

    await upsertComment('Hello')

    expect(paginate).toHaveBeenCalledWith(listComments, {
      owner: 'sfuosdev',
      repo: 'sandbox',
      issue_number: 7,
      per_page: 100
    })
    expect(createComment).toHaveBeenCalledWith({
      owner: 'sfuosdev',
      repo: 'sandbox',
      issue_number: 7,
      body: `${COMMENT_MARKER}\nHello`
    })
    expect(updateComment).not.toHaveBeenCalled()
  })

  it('updates the existing bot comment instead of adding another', async () => {
    paginate.mockResolvedValue([
      { id: 5, body: 'LGTM from a human' },
      { id: 42, body: `${COMMENT_MARKER}\nOld report` }
    ])

    await upsertComment('New report')

    expect(updateComment).toHaveBeenCalledWith({
      owner: 'sfuosdev',
      repo: 'sandbox',
      comment_id: 42,
      body: `${COMMENT_MARKER}\nNew report`
    })
    expect(createComment).not.toHaveBeenCalled()
  })

  it('does not add the marker twice', async () => {
    paginate.mockResolvedValue([])

    await upsertComment(`${COMMENT_MARKER}\nAlready marked`)

    expect(createComment).toHaveBeenCalledWith(
      expect.objectContaining({ body: `${COMMENT_MARKER}\nAlready marked` })
    )
  })

  it('warns and returns on 403 (read-only token on fork PRs)', async () => {
    paginate.mockResolvedValue([])
    createComment.mockRejectedValue(
      Object.assign(new Error('Resource not accessible'), { status: 403 })
    )

    await expect(upsertComment('Hello')).resolves.toBeUndefined()
    expect(core.warning).toHaveBeenCalledWith(expect.stringContaining('403'))
  })

  it('rethrows other errors', async () => {
    paginate.mockRejectedValue(
      Object.assign(new Error('Server error'), { status: 500 })
    )

    await expect(upsertComment('Hello')).rejects.toThrow('Server error')
  })

  it('skips posting when the event has no pull request', async () => {
    context.issue.number = 0

    await upsertComment('Hello')

    expect(getOctokit).not.toHaveBeenCalled()
    expect(core.warning).toHaveBeenCalled()
  })
})
