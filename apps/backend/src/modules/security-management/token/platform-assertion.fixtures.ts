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
 * OpenAEV, PR OpenAEV-Platform/openaev#9749 at commit e8b0aac8ed, `io.openaev.xtmhub.XtmHubKeyService`.
 *
 * Produced by compiling the PR's `XtmHubKeyService`, `Ed25519KeyUtils` and `XtmHubPublicJwk` unchanged with jjwt
 * 0.13.0 and Bouncy Castle 1.87, beside stubs of the settings classes it reads (no stored key version, so version 1),
 * with the encryption key `h2-throwaway-test-key-not-a-real-encryption-key`, then
 * `signAssertion(platformId, null)` and `signAssertion(platformId, tenantId)`.
 */
export const OPENAEV_SAMPLE = {
  publicJwk: {
    kty: 'OKP',
    crv: 'Ed25519',
    alg: 'EdDSA',
    use: 'sig',
    kid: 'ML41dejY-4Xp0ifmg4a36yUD5r42ifOtYkdrQGDSRoQ',
    x: 'qmerE3XsBSdvKZpzpSWko9laAdKC-WrEy04xkl2NjC0',
  },
  platformId: '3a6f9d2b-8c41-4e7f-b5a0-1d9c7e2f4b68',
  now: new Date(1795687748 * 1000),
  instanceAssertion:
    'eyJraWQiOiJNTDQxZGVqWS00WHAwaWZtZzRhMzZ5VUQ1cjQyaWZPdFlrZHJRR0RTUm9RIiwidHlwIjoiSldUIiwiYWxnIjoiRWREU0EifQ.eyJpc3MiOiIzYTZmOWQyYi04YzQxLTRlN2YtYjVhMC0xZDljN2UyZjRiNjgiLCJhdWQiOiJ4dG0taHViIiwiaWRlbnRpZmllciI6Im9wZW5hZXYiLCJpYXQiOjE3OTU2ODc3NDgsImV4cCI6MTc5NTY4ODA0OCwianRpIjoiNWI4MjU5MzItNzgwYS00YTNjLWFhMGEtNTI5N2VlMTdkY2M5In0.113r9pEs8WkqIqVF1ul-5blALCGlcUEpr_kOk0wc_HM0oDGMdvfvdmk4fVcE-O3zohOBv0dx9B-gQ0wXuO1UBA',
  tenantId: '5e1b8f3a-2d7c-4a96-8e0b-7f4c1a9d3e25',
  tenantAssertion:
    'eyJraWQiOiJNTDQxZGVqWS00WHAwaWZtZzRhMzZ5VUQ1cjQyaWZPdFlrZHJRR0RTUm9RIiwidHlwIjoiSldUIiwiYWxnIjoiRWREU0EifQ.eyJpc3MiOiIzYTZmOWQyYi04YzQxLTRlN2YtYjVhMC0xZDljN2UyZjRiNjgiLCJhdWQiOiJ4dG0taHViIiwiaWRlbnRpZmllciI6Im9wZW5hZXYiLCJpYXQiOjE3OTU2ODc3NDgsImV4cCI6MTc5NTY4ODA0OCwianRpIjoiNDkwZjZiMzQtZDA2NC00ZThhLWJhMzAtMDA3YzVhYTgxZTY3IiwidGVuYW50X2lkIjoiNWUxYjhmM2EtMmQ3Yy00YTk2LThlMGItN2Y0YzFhOWQzZTI1In0.z7dvup96BLosPoJekiLa_fnKbZqmrCckg8-kRewjOUCG2FXXL4uUXVrGYdn00yx5UbYqV_V0ii3uUnL3OcMkBw',
};

/**
 * XTM One, PR XTM-One-Platform/xtm-one#1794 at commit 2482d283f, `backend/app/core/xtm_hub_key.py`.
 *
 * Produced by a scratch Python script run against the PR's `backend/app`, with
 * `SECRET_KEY=h2-throwaway-test-secret-key-not-a-real-one-0123456789`:
 * `derive_key(1).sign_assertion(platform_id)`.
 */
export const XTM_ONE_SAMPLE = {
  publicJwk: {
    kty: 'OKP',
    crv: 'Ed25519',
    x: 'am2swtObeBIxt6kMfQW_7IpfeTA_AKBPntNvUjcxdHk',
    kid: '08AEl536H88s91BNKbfkmSOvt1bC_poM2xwiqmWhGKM',
    alg: 'EdDSA',
    use: 'sig',
  },
  platformId: '9c2e7a4f-1b6d-4f38-a05e-8d3b2c6f1e97',
  now: new Date(1795687765 * 1000),
  assertion:
    'eyJhbGciOiJFZERTQSIsImtpZCI6IjA4QUVsNTM2SDg4czkxQk5LYmZrbVNPdnQxYkNfcG9NMnh3aXFtV2hHS00iLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiI5YzJlN2E0Zi0xYjZkLTRmMzgtYTA1ZS04ZDNiMmM2ZjFlOTciLCJhdWQiOiJ4dG0taHViIiwiaWF0IjoxNzk1Njg3NzY1LCJleHAiOjE3OTU2ODgwNjUsImp0aSI6ImJlZGQ0ZTJiLTgwOWItNGVlNy1iYjI1LTY0ZWM1ZGU3MmUyYSIsImlkZW50aWZpZXIiOiJ4dG1vbmUifQ.6ymPwNB52W6YnWz5VrglmClaJbC_tLP2f_KQmV10IdGFoUh-ZcDxFo6Nr00b-uoPNX2lxIbquKu7CljTKVgPAA',
};
