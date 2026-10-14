# Client

React + Vite frontend for the distributed code judge.

## Features

- Login/register flow using Spring Security session authentication (`JSESSIONID` cookie).
- Google sign-in using a Google ID token verified by the backend.
- CSRF protection using the `XSRF-TOKEN` cookie and `X-XSRF-TOKEN` request header.
- Problem list popover drawer and Markdown + KaTeX rendering for statements.
- Code editor, submission, and polling results UI.

## Authentication

The client does **not** use JWT bearer authentication. Authentication is maintained by the backend through an HTTP session:

1. Login, registration, or Google sign-in is sent to the Spring Boot API.
2. The backend authenticates the user and stores the Spring Security context in the session.
3. The browser sends the session cookie with subsequent API requests.
4. Axios is configured with `withCredentials: true` so cookies are included in cross-origin requests during local development.

For state-changing requests (`POST`, `PUT`, `PATCH`, and `DELETE`), the client first obtains a CSRF token from `/auth/csrf` and sends it in the `X-XSRF-TOKEN` header.

The authenticated session can be checked with `GET /auth/me`. Logging out calls `POST /auth/logout` and clears the local session state.

## Run locally

```bash
cd client
npm install
npm run dev
```

The UI expects the backend at `http://localhost:8080/api` by default. Override with `VITE_API_URL` if needed.
