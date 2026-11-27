/**
 * Assertions signed by each product's real signing code, so the verifier is checked against what the products
 * actually send, not against assertions this repository signs itself.
 *
 * Every sample was signed with a throwaway key derived from a test value written below, never from a real
 * secret. Each `now` is the instant the sample was signed (its `iat`), to verify it with a fixed clock.
 */

/**
 * OpenCTI, PR OpenCTI-Platform/opencti#20401 at commit ae66d687f4,
 * `opencti-platform/opencti-graphql/src/modules/xtm/hub/xtm-hub-key.ts`.
 *
 * Produced by a scratch vitest file run with OpenCTI's unit config, outside the repository:
 * `deriveXtmHubKey(createCryptoKeyFactory(Buffer.from('h2-throwaway-test-seed-not-a-real-encryption-key')), 1)`,
 * then `signAssertion({ platformId })` and `signAssertion({ platformId, htu })`, with `Date` faked at `now`.
 */
export const OPENCTI_SAMPLE = {
  publicJwk: {
    kty: 'OKP',
    crv: 'Ed25519',
    alg: 'EdDSA',
    use: 'sig',
    kid: '60ece3fa1eabe37f',
    x: 'i1aMvmiQeDO1zm3jXGZUfz0b2L-GCQnuqawiWm6KJOs',
  },
  platformId: '7d0c4c1e-3f5a-4b8e-9a61-2c9f0e5b7a13',
  now: new Date(1796983200 * 1000),
  assertion:
    'eyJraWQiOiI2MGVjZTNmYTFlYWJlMzdmIiwiYWxnIjoiRWREU0EiLCJ0eXAiOiJ4dG0taHViLXBsYXRmb3JtK2p3dCJ9.eyJpZGVudGlmaWVyIjoib3BlbmN0aSIsImlzcyI6IjdkMGM0YzFlLTNmNWEtNGI4ZS05YTYxLTJjOWYwZTViN2ExMyIsImF1ZCI6Inh0bS1odWIiLCJpYXQiOjE3OTY5ODMyMDAsImV4cCI6MTc5Njk4MzI2MCwianRpIjoiNGRjMWJiZjktZmIxNS00YjE5LWJhNGYtZDc4NjVjZmQ5MGMwIn0.cm_JwvDiZvKax4Cco1TUGVsdzLcMkPU0COdkoLIZp_S8Sj3bQg9WS2HGuoHsYl7ZIMR_5qLAxfRm2-xp9iytCg',
  htu: '/document/get/0b8f2a6e-5c1d-4e7a-9f3b-6d2c8e1a4b70/3e9a7c51-8b2d-4f60-a1c4-9d7e5b3f2a18',
  htuAssertion:
    'eyJraWQiOiI2MGVjZTNmYTFlYWJlMzdmIiwiYWxnIjoiRWREU0EiLCJ0eXAiOiJ4dG0taHViLXBsYXRmb3JtK2p3dCJ9.eyJpZGVudGlmaWVyIjoib3BlbmN0aSIsImh0dSI6Ii9kb2N1bWVudC9nZXQvMGI4ZjJhNmUtNWMxZC00ZTdhLTlmM2ItNmQyYzhlMWE0YjcwLzNlOWE3YzUxLThiMmQtNGY2MC1hMWM0LTlkN2U1YjNmMmExOCIsImlzcyI6IjdkMGM0YzFlLTNmNWEtNGI4ZS05YTYxLTJjOWYwZTViN2ExMyIsImF1ZCI6Inh0bS1odWIiLCJpYXQiOjE3OTY5ODMyMDAsImV4cCI6MTc5Njk4MzI2MCwianRpIjoiNWEyYjdkZDYtODBjNi00MDY1LTk4OGItNzk5ZTQ4OTAwN2NjIn0.c2VFyQqJCsl8YA6ceVAqYEGci5ruishoJXrXhj-m329dzmxaz6AvrgK9XVmAnx9sE7qtzGwPCAcizxAjyfdjAQ',
};

/**
 * OpenAEV, PR OpenAEV-Platform/openaev#9749 at commit a59c4806b6, `io.openaev.xtmhub.XtmHubKeyService`. OpenAEV
 * derives one key per tenant, served at `/api/tenants/{tenantId}/xtmhub/jwks`.
 *
 * Produced by compiling the PR's `XtmHubKeyService` and `Ed25519KeyUtils` unchanged with jjwt 0.13.0 and Bouncy
 * Castle 1.87, beside stubs of the settings and tenant classes it reads (no stored key version, so version 1; every
 * tenant active), with the encryption key `h2-throwaway-openaev-encryption-key-not-a-real-one`, then
 * `tenantPublicJwk(tenantId)` and `signAssertion(platformId, tenantId)`.
 */
export const OPENAEV_SAMPLE = {
  publicJwk: {
    kty: 'OKP',
    crv: 'Ed25519',
    alg: 'EdDSA',
    use: 'sig',
    kid: '-ToyANfcvsEI9bW-QysLNJxgA9V8Y6m7_I00OGCJEds',
    x: 'w_JSV3zApVVKpZgvH-SWKqudwCo1CUF5iMg05b1jJRg',
  },
  platformId: '3a6f9d2b-8c41-4e7f-b5a0-1d9c7e2f4b68',
  tenantId: '5e1b8f3a-2d7c-4a96-8e0b-7f4c1a9d3e25',
  now: new Date(1795785911 * 1000),
  assertion:
    'eyJraWQiOiItVG95QU5mY3ZzRUk5YlctUXlzTE5KeGdBOVY4WTZtN19JMDBPR0NKRWRzIiwidHlwIjoieHRtLWh1Yi1wbGF0Zm9ybStqd3QiLCJhbGciOiJFZERTQSJ9.eyJpc3MiOiIzYTZmOWQyYi04YzQxLTRlN2YtYjVhMC0xZDljN2UyZjRiNjgiLCJhdWQiOiJ4dG0taHViIiwiaWRlbnRpZmllciI6Im9wZW5hZXYiLCJ0ZW5hbnRfaWQiOiI1ZTFiOGYzYS0yZDdjLTRhOTYtOGUwYi03ZjRjMWE5ZDNlMjUiLCJpYXQiOjE3OTU3ODU5MTEsImV4cCI6MTc5NTc4NTk3MSwianRpIjoiZWQ4Yzc1NDctNmI0Yi00OWFkLTkzNTItZTYxMmUyZTk4ODYwIn0.jOT94HZ5wqs7NToUtlLLNTvQINt4eBcmSoLdA4VrdcaYmWTvfP62b5DNPmzwRLEPSLOcnpA6SY933FjuTT9XDg',
};

/**
 * XTM One, PR XTM-One-Platform/xtm-one#2510 at commit 4545500f2f, `backend/app/core/xtm_hub_key.py`.
 *
 * Produced by a scratch Python script run against the PR's `backend/app`, with
 * `SECRET_KEY=h2-throwaway-xtm-one-secret-key-not-a-real-one`:
 * `derive_key(1).sign_assertion(platform_id)` and `derive_key(1).sign_assertion(platform_id, htu=htu)`.
 */
export const XTM_ONE_SAMPLE = {
  publicJwk: {
    kty: 'OKP',
    crv: 'Ed25519',
    x: 'W0qmglk7qOJT9NYiwl22_HEwoBA1FyL_Luq7L82qT-A',
    kid: '-dkQCiBG4g-PlvdirxPUezf7Jkh2Yyn0ZlihaIrd8As',
    alg: 'EdDSA',
    use: 'sig',
  },
  platformId: '9c2e7a4f-1b6d-4f38-a05e-8d3b2c6f1e97',
  now: new Date(1795785934 * 1000),
  assertion:
    'eyJhbGciOiJFZERTQSIsImtpZCI6Ii1ka1FDaUJHNGctUGx2ZGlyeFBVZXpmN0praDJZeW4wWmxpaGFJcmQ4QXMiLCJ0eXAiOiJ4dG0taHViLXBsYXRmb3JtK2p3dCJ9.eyJpc3MiOiI5YzJlN2E0Zi0xYjZkLTRmMzgtYTA1ZS04ZDNiMmM2ZjFlOTciLCJhdWQiOiJ4dG0taHViIiwiaWF0IjoxNzk1Nzg1OTM0LCJleHAiOjE3OTU3ODU5OTQsImp0aSI6IjA3YzU4NmZiLWQ4NjMtNDhkNS1iNGVkLThiM2M1ZWFjMTY3MCIsImlkZW50aWZpZXIiOiJ4dG1vbmUifQ.aGN0oHwDYTBlL0WpiTL8eKzq0XD9v2szD0wh4Qo-bEb_16DrGXE1xT2NKBpifzmIzb8w6SFWecpYntvckT-cCw',
  htu: '/document/get/7b3e1d9a-4c2f-4a85-b6e0-2f9d8c1a5e34/c4a8f2e6-1d7b-4e93-8a5c-6b0f3d2e9a71',
  htuAssertion:
    'eyJhbGciOiJFZERTQSIsImtpZCI6Ii1ka1FDaUJHNGctUGx2ZGlyeFBVZXpmN0praDJZeW4wWmxpaGFJcmQ4QXMiLCJ0eXAiOiJ4dG0taHViLXBsYXRmb3JtK2p3dCJ9.eyJpc3MiOiI5YzJlN2E0Zi0xYjZkLTRmMzgtYTA1ZS04ZDNiMmM2ZjFlOTciLCJhdWQiOiJ4dG0taHViIiwiaWF0IjoxNzk1Nzg1OTM0LCJleHAiOjE3OTU3ODU5OTQsImp0aSI6ImJjNTA0NTYyLTY2MDgtNDg1Ny1hZmE3LTM5M2NhZjE1ZDRjMSIsImlkZW50aWZpZXIiOiJ4dG1vbmUiLCJodHUiOiIvZG9jdW1lbnQvZ2V0LzdiM2UxZDlhLTRjMmYtNGE4NS1iNmUwLTJmOWQ4YzFhNWUzNC9jNGE4ZjJlNi0xZDdiLTRlOTMtOGE1Yy02YjBmM2QyZTlhNzEifQ.X3faYYUDq8zHpmPJH-d3oxTj8B8llHp2OgLN5kFsyUQedbK7qxsiwND229zwl6dZVYxqKQoDDaHMs8PgQsO_Bg',
};
