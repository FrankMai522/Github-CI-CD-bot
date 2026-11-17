import { expect, it } from '@jest/globals'
import { createFakeOctokit } from '../__fixtures__/octokit.js'

it('lets a test set the comment list and check which PR was requested', async () => {
  const octokit = createFakeOctokit()
  const listComments = octokit.rest.issues.listComments
  const request = { owner: 'example', repo: 'demo', issue_number: 8 }

  listComments.mockResolvedValueOnce({
    status: 200,
    headers: {},
    url: 'https://api.github.com/repos/example/demo/issues/8/comments',
    data: []
  })

  const response = await listComments(request)

  expect(response.data).toEqual([])
  expect(listComments).toHaveBeenCalledWith(request)
})

it('returns an empty list when a PR has no changed files', async () => {
  const octokit = createFakeOctokit()
  const listFiles = octokit.rest.pulls.listFiles
  const request = { owner: 'example', repo: 'demo', pull_number: 8 }

  listFiles.mockResolvedValueOnce({
    status: 200,
    headers: {},
    url: 'https://api.github.com/repos/example/demo/pulls/8/files',
    data: []
  })

  const files = await octokit.paginate(listFiles, request)

  expect(files).toEqual([])
  expect(listFiles).toHaveBeenCalledWith(request)
})
