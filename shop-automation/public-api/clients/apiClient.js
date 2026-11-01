// Reusable API client: one place for URL building, auth header, evidence and redaction.
// Tests never call cy.request directly, so a change of API (URL, headers) touches this file only.

const SENSITIVE = ["password", "accesstoken", "refreshtoken", "token", "authorization"];

function redact(value) {
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [
        k,
        SENSITIVE.includes(k.toLowerCase()) ? "[REDACTED]" : redact(v),
      ])
    );
  }
  return value;
}

const preview = (body) => JSON.stringify(redact(body) ?? null).slice(0, 400);

/**
 * @param {string} method HTTP method
 * @param {string} path   path relative to apiUrl, e.g. "/products?limit=5"
 * @param {{body?: object, token?: string, headers?: object, expectError?: boolean}} [opts]
 *        expectError: true means a 4xx/5xx is the EXPECTED result (negative test).
 */
function request(method, path, opts = {}) {
  const { body, token, headers = {}, expectError = false } = opts;
  const allHeaders = token ? { ...headers, Authorization: `Bearer ${token}` } : headers;
  const startedAt = new Date().toISOString();

  return cy
    .request({
      method,
      url: `${Cypress.expose("publicApiUrl")}${path}`,
      body,
      headers: allHeaders,
      failOnStatusCode: !expectError,
    })
    .then((res) => {
      cy.task(
        "evidence",
        {
          startedAt,
          spec: Cypress.spec.relative,
          test: Cypress.currentTest.title,
          method,
          path,
          requestHeaders: redact(allHeaders),
          requestBody: redact(body ?? null),
          status: res.status,
          durationMs: res.duration,
          responseBody: preview(res.body),
        },
        { log: false }
      );
      return cy.wrap(res, { log: false });
    });
}

const credentials = () => ({
  username: Cypress.expose("publicApiUsername"),
  password: Cypress.expose("publicApiPassword"),
});

module.exports = {
  request,
  get: (path, opts) => request("GET", path, opts),
  post: (path, body, opts) => request("POST", path, { ...opts, body }),
  put: (path, body, opts) => request("PUT", path, { ...opts, body }),
  patch: (path, body, opts) => request("PATCH", path, { ...opts, body }),
  del: (path, opts) => request("DELETE", path, opts),
  credentials,
  // Logs in and yields the response body (accessToken, refreshToken, user fields).
  login: (overrides = {}) =>
    request("POST", "/auth/login", { body: { ...credentials(), ...overrides } }).its("body"),
};
