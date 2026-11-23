import type { getOctokit } from '@actions/github'
import { jest } from '@jest/globals'

export type Octokit = ReturnType<typeof getOctokit>
type ListComments = Octokit['rest']['issues']['listComments']
type CreateComment = Octokit['rest']['issues']['createComment']
type UpdateComment = Octokit['rest']['issues']['updateComment']
export type GetPullRequest = Octokit['rest']['pulls']['get']
export type ListFiles = Octokit['rest']['pulls']['listFiles']
type ListJobs = Octokit['rest']['actions']['listJobsForWorkflowRun']

// Let tests supply the combined results for listFiles or listComments.
async function paginate<Params, Item>(
  endpoint: (params: Params) => Promise<{ data: Item[] }>,
  params: Params
): Promise<Item[]> {
  const response = await endpoint(params)
  return response.data
}

// Give each test its own fake GitHub client and call history.
export function createFakeOctokit() {
  return {
    paginate,
    rest: {
      pulls: {
        get: jest.fn<GetPullRequest>(),
        listFiles: jest.fn<ListFiles>()
      },
      actions: {
        listJobsForWorkflowRun: jest.fn<ListJobs>()
      },
      issues: {
        listComments: jest.fn<ListComments>(),
        createComment: jest.fn<CreateComment>(),
        updateComment: jest.fn<UpdateComment>()
      }
    }
  }
}
