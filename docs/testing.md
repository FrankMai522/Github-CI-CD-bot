# Testing the bot

Run `npm test` from the repository root.

## Set an action input

In `__tests__/main.test.ts`, the test replaces `@actions/core` with the shared
fixture. Use `core.setInputs()` to choose what the bot reads when it runs.

```ts
it('logs the CI result supplied to the action', async () => {
  core.setInputs({ 'ci-result': 'success' })

  await run()

  expect(core.info).toHaveBeenCalledWith(
    'Hello from ci-cd bot! CI result: success'
  )
})
```

## Test GitHub calls

Call `createFakeOctokit()` inside each test to get a fresh client. Use
`mockResolvedValueOnce()` to choose what a GitHub method returns and
`toHaveBeenCalledWith()` to check what the bot requested. See the
[comment lookup test](../__tests__/octokit.test.ts) for an example.

The [event fixtures](../__fixtures__/payloads/) contain sample payloads for
opening a pull request, pushing changes to an existing PR, and pushing to a
branch.
