import * as core from '@actions/core'
import * as github from '@actions/github'

/**
 * Hidden marker the bot puts in its comment. GitHub renders HTML comments as
 * nothing, so readers never see it, but the bot can search for it.
 */
export const COMMENT_MARKER = '<!-- ci-cd-bot -->'

/**
 * Posts the bot's comment on the current PR, or edits the one it posted on an
 * earlier run, so a PR only ever has one bot comment.
 *
 * Never fails the action: if GitHub refuses with 403 (PRs from forks get a
 * read-only token), it logs a warning and returns.
 */
export async function upsertComment(body: string): Promise<void> {
  const { owner, repo, number: issue_number } = github.context.issue
  if (!issue_number) {
    core.warning('No pull request found for this event, so no comment posted')
    return
  }

  const token = core.getInput('github-token')
  const octokit = github.getOctokit(token)
  const fullBody = body.includes(COMMENT_MARKER)
    ? body
    : `${COMMENT_MARKER}\n${body}`

  try {
    // PR comments are issue comments in the GitHub API. Paginate, because on
    // a busy PR the bot's comment may not be on the first page.
    const comments = await octokit.paginate(octokit.rest.issues.listComments, {
      owner,
      repo,
      issue_number,
      per_page: 100
    })
    const existing = comments.find((comment) =>
      comment.body?.includes(COMMENT_MARKER)
    )

    if (existing) {
      await octokit.rest.issues.updateComment({
        owner,
        repo,
        comment_id: existing.id,
        body: fullBody
      })
      core.info(`Updated bot comment ${existing.id}`)
    } else {
      const { data } = await octokit.rest.issues.createComment({
        owner,
        repo,
        issue_number,
        body: fullBody
      })
      core.info(`Created bot comment ${data.id}`)
    }
  } catch (error) {
    if (isForbidden(error)) {
      core.warning(
        'GitHub refused to post the bot comment (403). PRs from forks get a ' +
          'read-only token, so the bot cannot comment on them.'
      )
      return
    }
    throw error
  }
}

function isForbidden(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    error.status === 403
  )
}
