export enum BlogApiErrorCode {
  Unreachable = 'BLOG_API_UNREACHABLE',
  Timeout = 'BLOG_API_TIMEOUT',
  UnexpectedStatus = 'BLOG_API_UNEXPECTED_STATUS',
  InvalidJson = 'BLOG_API_INVALID_JSON',
  InvalidFeed = 'BLOG_API_INVALID_FEED',
  InvalidItem = 'BLOG_API_INVALID_ITEM',
}

interface BlogApiErrorDetails {
  // HTTP status of an unexpected response
  status?: number;
  // Id of the offending post, for an invalid item
  postId?: string;
  cause?: unknown;
}

export class BlogApiError extends Error {
  readonly code: BlogApiErrorCode;
  readonly status?: number;
  readonly postId?: string;

  constructor(
    code: BlogApiErrorCode,
    message: string,
    { status, postId, cause }: BlogApiErrorDetails = {}
  ) {
    super(message, { cause });
    this.name = 'BlogApiError';
    this.code = code;
    this.status = status;
    this.postId = postId;
  }
}
