/**
 * Unit tests for the diff parser functionality, src/github/diff.ts
 */
import { afterEach, describe, expect, it, jest } from '@jest/globals'

// Import the module being tested dynamically to ensure mocks apply properly.
const { isLineInDiff, annotatePatch } = await import('../src/github/diff.ts')

describe('diff.ts', () => {
  afterEach(() => {
    jest.resetAllMocks()
  })

  it('checks if a line is in a new file patch correctly', () => {
    const patch =
      '@@ -0,0 +1,3 @@\n' +
      '+export function hello() {\n' +
      '+  return "world";\n' +
      '+}'

    const mockFile = { filename: 'src/new.ts', patch }
    expect(isLineInDiff(mockFile, 1)).toBe(true)
    expect(isLineInDiff(mockFile, 2)).toBe(true)
    expect(isLineInDiff(mockFile, 3)).toBe(true)
    expect(isLineInDiff(mockFile, 4)).toBe(false)

    const annotated = annotatePatch(patch)
    expect(annotated).toBe(
      '@@ -0,0 +1,3 @@\n' +
        '1 | +export function hello() {\n' +
        '2 | +  return "world";\n' +
        '3 | +}'
    )
  })

  it('handles a deleted file patch correctly', () => {
    // Deleted files have no added lines, so no line should be found in diff
    const patch =
      '@@ -1,3 +0,0 @@\n' +
      '-const oldVar = 42;\n' +
      '-console.log(oldVar);\n' +
      '-'

    const mockFile = { filename: 'src/deleted.ts', patch }
    expect(isLineInDiff(mockFile, 1)).toBe(false)

    const annotated = annotatePatch(patch)
    expect(annotated).toBe(
      '@@ -1,3 +0,0 @@\n' +
        ' | -const oldVar = 42;\n' +
        ' | -console.log(oldVar);\n' +
        ' | -'
    )
  })

  it('handles a patch with several hunks', () => {
    const patch =
      '@@ -1,4 +1,5 @@\n' +
      ' line 1\n' +
      '-line 2\n' +
      '+line 2 modified\n' +
      '+line 2.5 added\n' +
      ' line 3\n' +
      '@@ -10,3 +11,3 @@\n' +
      ' line 10\n' +
      '-line 11\n' +
      '+line 11 replaced\n' +
      ' line 12\n' +
      '@@ -20,2 +21,3 @@\n' +
      ' line 20\n' +
      '+line 20.5 inserted\n' +
      ' line 21\n' +
      '@@ -40,3 +41,4 @@\n' +
      ' line 40\n' +
      '-line 41\n' +
      '+line 41 updated\n' +
      '+line 41.5 inserted\n' +
      ' line 42'

    const mockFile = { filename: 'src/hunks.ts', patch }
    expect(isLineInDiff(mockFile, 1)).toBe(true)
    expect(isLineInDiff(mockFile, 2)).toBe(true)
    expect(isLineInDiff(mockFile, 3)).toBe(true)
    expect(isLineInDiff(mockFile, 4)).toBe(true)
    expect(isLineInDiff(mockFile, 5)).toBe(false)

    expect(isLineInDiff(mockFile, 10)).toBe(false)
    expect(isLineInDiff(mockFile, 11)).toBe(true)
    expect(isLineInDiff(mockFile, 12)).toBe(true)
    expect(isLineInDiff(mockFile, 13)).toBe(true)
    expect(isLineInDiff(mockFile, 14)).toBe(false)

    expect(isLineInDiff(mockFile, 20)).toBe(false)
    expect(isLineInDiff(mockFile, 21)).toBe(true)
    expect(isLineInDiff(mockFile, 22)).toBe(true)
    expect(isLineInDiff(mockFile, 23)).toBe(true)
    expect(isLineInDiff(mockFile, 24)).toBe(false)

    expect(isLineInDiff(mockFile, 40)).toBe(false)
    expect(isLineInDiff(mockFile, 41)).toBe(true)
    expect(isLineInDiff(mockFile, 42)).toBe(true)
    expect(isLineInDiff(mockFile, 43)).toBe(true)
    expect(isLineInDiff(mockFile, 44)).toBe(true)
    expect(isLineInDiff(mockFile, 45)).toBe(false)

    const annotated = annotatePatch(patch)
    expect(annotated).toBe(
      '@@ -1,4 +1,5 @@\n' +
        '1 | line 1\n' +
        ' | -line 2\n' +
        '2 | +line 2 modified\n' +
        '3 | +line 2.5 added\n' +
        '4 | line 3\n' +
        '@@ -10,3 +11,3 @@\n' +
        '11 | line 10\n' +
        ' | -line 11\n' +
        '12 | +line 11 replaced\n' +
        '13 | line 12\n' +
        '@@ -20,2 +21,3 @@\n' +
        '21 | line 20\n' +
        '22 | +line 20.5 inserted\n' +
        '23 | line 21\n' +
        '@@ -40,3 +41,4 @@\n' +
        '41 | line 40\n' +
        ' | -line 41\n' +
        '42 | +line 41 updated\n' +
        '43 | +line 41.5 inserted\n' +
        '44 | line 42'
    )
  })

  it('handles a line replacement', () => {
    const patch = '@@ -1,1 +1,1 @@\n' + '-const x = 1;\n' + '+const x = 2;\n'

    const mockFile = { filename: 'src/renamed.ts', patch }
    expect(isLineInDiff(mockFile, 1)).toBe(true)
    expect(isLineInDiff(mockFile, 2)).toBe(false)

    const annotated = annotatePatch(patch)
    expect(annotated).toBe(
      '@@ -1,1 +1,1 @@\n' + ' | -const x = 1;\n' + '1 | +const x = 2;'
    )
  })

  it('handles a file ending with \\ No newline at end of file and annotates correctly', () => {
    const patch =
      '@@ -1,2 +1,2 @@\n' +
      ' line 1\n' +
      '-old line 2\n' +
      '\\ No newline at end of file\n' +
      '+new line 2\n' +
      '\\ No newline at end of file'

    const mockFile = { filename: 'src/nonewline.ts', patch }
    expect(isLineInDiff(mockFile, 1)).toBe(true)
    expect(isLineInDiff(mockFile, 2)).toBe(true)

    const annotated = annotatePatch(patch)
    expect(annotated).toBe(
      '@@ -1,2 +1,2 @@\n' +
        '1 | line 1\n' +
        ' | -old line 2\n' +
        '\\ No newline at end of file\n' +
        '2 | +new line 2\n' +
        '\\ No newline at end of file'
    )
  })
})
