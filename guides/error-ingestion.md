# Sending errors into a project

Every project has its own API key, and any application you are building can post errors to the platform with it. Errors show up on the project's Errors tab, where you can ask Claude to analyse them and, if the project is linked to a GitHub repository, open a pull request with a suggested fix.

This is the only endpoint in the app that does not use a session. It authenticates on the project API key alone, so treat that key like a password.

## Finding your API key

Open the project, go to the Errors tab, and copy the API key shown there. The key is created with the project.

## Posting an error

```
POST https://enterprise.coria.app/api/errors/ingest
Content-Type: application/json
x-api-key: <your project API key>
```

Body:

| Field | Required | Notes |
|-------|----------|-------|
| `title` | yes | Short description of what went wrong. Trimmed to 500 characters. |
| `stackTrace` | no | Full stack trace. Trimmed to 10,000 characters. |
| `context` | no | Anything that helps you reproduce it: the route, the user action, request ids. Trimmed to 2,000 characters. |
| `source` | no | Where it came from, for example `web`, `worker`, `api`. Defaults to `api`. Trimmed to 200 characters. |

A successful call returns `201` with the new error id, its status, and the time it was recorded.

## Example

```bash
curl -X POST https://enterprise.coria.app/api/errors/ingest \
  -H "Content-Type: application/json" \
  -H "x-api-key: $PROJECT_API_KEY" \
  -d '{
    "title": "Checkout failed: payment provider timeout",
    "stackTrace": "Error: ETIMEDOUT\n    at PaymentClient.charge (/app/payments.js:42:11)",
    "context": "POST /checkout, user in the EU region, order 88213",
    "source": "web"
  }'
```

Wiring it into a Node app:

```js
async function reportError(err, context) {
  try {
    await fetch("https://enterprise.coria.app/api/errors/ingest", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.PROJECT_API_KEY,
      },
      body: JSON.stringify({
        title: err.message,
        stackTrace: err.stack,
        context,
        source: "web",
      }),
    });
  } catch {
    // Never let error reporting break the thing that was already failing.
  }
}
```

Always wrap the call so a reporting failure cannot take down the code path that was already in trouble.

## Responses

| Status | Meaning |
|--------|---------|
| 201 | Error recorded |
| 400 | Body was not valid JSON, or `title` was missing |
| 401 | `x-api-key` header missing, or the key did not match a project |

## Things worth knowing

The key is passed as a plain header, so only send it over HTTPS and keep it in your deployment's secret store rather than in source control.

There is currently no rate limiting on this endpoint and no way to rotate a project's API key from the UI. If a key leaks, the practical options today are to keep the project private or to rotate the value directly in the database. Both are worth fixing before you hand the key to a third party.

Because the errors you post are attributed to the project's creator, they will appear in the Errors tab as though that user logged them.
