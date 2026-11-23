import type { getOctokit } from '@actions/github'
import { annotatePatch } from './diff.js'

export interface FetchPRParams {
  octokit: ReturnType<typeof getOctokit>
  owner: string
  repo: string
  pullNumber: number
}

export interface PRFile {
  filename: string
  status: string
  additions: number
  deletions: number
  changes: number
  hasPatch: boolean
  patch?: string
}

export interface PRData {
  title: string
  description: string
  author: string
  baseSha: string
  headSha: string
  files: PRFile[]
}

export async function fetchPR({
  octokit,
  owner,
  repo,
  pullNumber
}: FetchPRParams): Promise<PRData> {
  const { data: pr } = await octokit.rest.pulls.get({
    owner,
    repo,
    pull_number: pullNumber
  })

  const rawFiles = await octokit.paginate(octokit.rest.pulls.listFiles, {
    owner,
    repo,
    pull_number: pullNumber,
    per_page: 100
  })

  const files: PRFile[] = rawFiles.map((file) => {
    const patch = file.patch ? annotatePatch(file.patch) : undefined
    const hasPatch = Boolean(patch)

    return {
      filename: file.filename,
      status: file.status,
      additions: file.additions,
      deletions: file.deletions,
      changes: file.changes,
      hasPatch,
      patch
    }
  })

  return {
    title: pr.title,
    description: pr.body ?? '',
    author: pr.user?.login ?? 'unknown',
    baseSha: pr.base.sha,
    headSha: pr.head.sha,
    files
  }
}
