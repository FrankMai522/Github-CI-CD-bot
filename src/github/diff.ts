export interface DiffFile {
  filename: string
  patch?: string
}

/**
 * Checks whether a specific line number is in a file's diff.
 */
export function isLineInDiff(file: DiffFile, lineNumber: number): boolean {
  if (!file.patch) {
    return false
  }
  const lines = file.patch.split('\n')

  let currentLineNumber = 0

  for (const line of lines) {
    // Match the hunk header
    const hunkMatch = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/)
    if (hunkMatch) {
      currentLineNumber = parseInt(hunkMatch[1], 10)
      continue
    }

    // Skip tracking metadata or no-newline indicators
    if (line.startsWith('\\ No newline at end of file')) {
      continue
    }

    if (line.startsWith('+') || line.startsWith(' ')) {
      // Added line
      if (currentLineNumber === lineNumber) {
        return true
      }
      currentLineNumber++
    }
  }

  return false
}

/**
 * Annotates a patch by prepending new-file line numbers in front of each line
 * so an LLM can accurately cite them.
 */
export function annotatePatch(patch: string): string {
  const lines = patch.replace(/\n$/, '').split('\n')
  const annotatedLines: string[] = []

  let currentLineNumber = 0

  for (const line of lines) {
    const hunkMatch = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/)
    if (hunkMatch) {
      currentLineNumber = parseInt(hunkMatch[1], 10)
      annotatedLines.push(line)
      continue
    }

    if (line.startsWith('\\ No newline at end of file')) {
      annotatedLines.push(line)
      continue
    }

    if (line.startsWith('+')) {
      annotatedLines.push(`${currentLineNumber} | ${line}`)
      currentLineNumber++
    } else if (line.startsWith('-')) {
      annotatedLines.push(` | ${line}`)
    } else {
      annotatedLines.push(`${currentLineNumber} |${line}`)
      currentLineNumber++
    }
  }

  return annotatedLines.join('\n')
}
