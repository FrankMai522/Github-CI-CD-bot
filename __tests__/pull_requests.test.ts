import { describe, expect, it } from '@jest/globals'
import {
  Octokit,
  GetPullRequest,
  ListFiles,
  createFakeOctokit
} from '../__fixtures__/octokit.ts'
import { fetchPR } from '../src/github/pull_requests.ts'

type PullResponse = Awaited<ReturnType<GetPullRequest>>
type FilesResponse = Awaited<ReturnType<ListFiles>>
type FileItem = FilesResponse['data'][number]

function makePullData(
  overrides: Partial<PullResponse['data']> = {}
): PullResponse['data'] {
  return {
    title: 'Add greeting helper',
    body: 'Adds a small helper function',
    user: { login: 'octocat' },
    base: { sha: 'base-sha-111' },
    head: { sha: 'head-sha-222' },
    ...overrides
  } as PullResponse['data']
}

function makeFile(overrides: Partial<FileItem> = {}): FileItem {
  return {
    sha: 'file-sha-1',
    filename: 'src/greet.ts',
    status: 'added',
    additions: 3,
    deletions: 0,
    changes: 3,
    patch: "@@ -0,0 +1,3 @@\n+export function greet() {\n+  return 'hi';\n+}\n",
    ...overrides
  } as FileItem
}

describe('pull_requests.ts', () => {
  const repoParams = {
    owner: 'acme',
    repo: 'widget',
    pullNumber: 42
  }

  it('handles one file', async () => {
    const octokit = createFakeOctokit()

    octokit.rest.pulls.get.mockResolvedValue({
      data: makePullData()
    } as PullResponse)

    octokit.rest.pulls.listFiles.mockResolvedValue({
      data: [makeFile({ filename: 'src/greet.ts' })]
    } as FilesResponse)

    const result = await fetchPR({
      octokit: octokit as unknown as Octokit,
      ...repoParams
    })

    expect(octokit.rest.pulls.get).toHaveBeenCalledWith({
      owner: 'acme',
      repo: 'widget',
      pull_number: 42
    })
    expect(octokit.rest.pulls.listFiles).toHaveBeenCalledWith(
      expect.objectContaining({
        owner: 'acme',
        repo: 'widget',
        pull_number: 42
      })
    )

    expect(result).toMatchObject({
      title: 'Add greeting helper',
      description: 'Adds a small helper function',
      author: 'octocat',
      baseSha: 'base-sha-111',
      headSha: 'head-sha-222'
    })
    expect(result.files).toHaveLength(1)
    expect(result.files[0]).toMatchObject({
      filename: 'src/greet.ts',
      hasPatch: true
    })
    expect(result.files[0].patch).toBeDefined()
  })

  it('handles 150 files', async () => {
    const octokit = createFakeOctokit()

    const hundredAndFiftyFiles = Array.from({ length: 150 }, (_, i) => {
      const num = i + 1
      return makeFile({
        sha: `sha-${num}`,
        filename: `src/module-${num}.ts`,
        status: 'modified',
        additions: 2,
        deletions: 1,
        changes: 3,
        patch: `@@ -1,2 +1,3 @@\n line1\n+// change ${num}\n line2\n`
      })
    })

    octokit.rest.pulls.get.mockResolvedValue({
      data: makePullData({
        title: 'Large refactor',
        body: null
      })
    } as PullResponse)

    octokit.rest.pulls.listFiles.mockResolvedValue({
      data: hundredAndFiftyFiles
    } as FilesResponse)

    const result = await fetchPR({
      octokit: octokit as unknown as Octokit,
      ...repoParams
    })

    expect(result.files).toHaveLength(150)
    expect(result.files[0].filename).toBe('src/module-1.ts')
    expect(result.files[149].filename).toBe('src/module-150.ts')

    for (const file of result.files) {
      expect(file.hasPatch).toBe(true)
      expect(file.patch).toBeDefined()
    }
  })

  it('handles binary file', async () => {
    const octokit = createFakeOctokit()

    octokit.rest.pulls.get.mockResolvedValue({
      data: makePullData({
        title: 'Add logo image',
        body: 'Adds PNG asset'
      })
    } as PullResponse)

    octokit.rest.pulls.listFiles.mockResolvedValue({
      data: [
        makeFile({
          sha: 'img-sha-1',
          filename: 'assets/logo.png',
          status: 'added',
          additions: 0,
          deletions: 0,
          changes: 0,
          patch: undefined
        }),
        makeFile({
          sha: 'text-sha-1',
          filename: 'README.md',
          status: 'modified',
          additions: 1,
          deletions: 0,
          changes: 1,
          patch: '@@ -1 +1,2 @@\n # Project\n+New line\n'
        })
      ]
    } as FilesResponse)

    const result = await fetchPR({
      octokit: octokit as unknown as Octokit,
      ...repoParams
    })

    expect(result.files).toHaveLength(2)

    const binaryFile = result.files[0]
    expect(binaryFile.filename).toBe('assets/logo.png')
    expect(binaryFile.hasPatch).toBe(false)
    expect(binaryFile.patch).toBeUndefined()

    const normalFile = result.files[1]
    expect(normalFile.filename).toBe('README.md')
    expect(normalFile.hasPatch).toBe(true)
    expect(normalFile.patch).toBeDefined()
  })

  it('handles a mix of normal and binary files', async () => {
    const octokit = createFakeOctokit()

    octokit.rest.pulls.get.mockResolvedValue({
      data: makePullData({
        title: 'Mixed text and binary changes',
        body: 'Includes source file and binary asset'
      })
    } as PullResponse)

    octokit.rest.pulls.listFiles.mockResolvedValue({
      data: [
        makeFile({
          sha: 'normal-sha-1',
          filename: 'src/index.ts',
          status: 'modified',
          additions: 1,
          deletions: 0,
          changes: 1,
          patch: '@@ -1 +1,2 @@\n const x = 1;\n+const y = 2;\n'
        }),
        makeFile({
          sha: 'binary-sha-1',
          filename: 'assets/icon.png',
          status: 'added',
          additions: 0,
          deletions: 0,
          changes: 0,
          patch: undefined
        })
      ]
    } as FilesResponse)

    const result = await fetchPR({
      octokit: octokit as unknown as Octokit,
      ...repoParams
    })

    const normalFile = result.files[0]
    expect(normalFile.hasPatch).toBe(true)
    expect(normalFile.patch).toBeDefined()

    const binaryFile = result.files[1]
    expect(binaryFile.hasPatch).toBe(false)
    expect(binaryFile.patch).toBeUndefined()
  })
})
