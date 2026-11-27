import type { Application, Request, Response } from 'express';
import { Readable } from 'stream';
import { v4 as uuidv4 } from 'uuid';
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { TestHelper } from '../../../../tests/helper/test.helper';
import {
  contextRegistererUserSecondOrga,
  TEST_ORGANIZATIONS,
} from '../../../../tests/tests.const';
import { requestContext } from '../../../context/request.context';
import { UserLoadUserBy } from '../../../model/user';
import { DocumentDomain } from '../../../modules/document/domain/document.domain';
import { PLATFORM_ASSERTION_HEADER } from '../../../modules/security-management/token/platform-authentication.util';
import {
  PLATFORM_ID_HEADER,
  PLATFORM_TOKEN_HEADER,
} from '../../../modules/security-management/token/platform-token.util';
import { ServiceInstanceDomain } from '../../../modules/service/instance/service-instance.domain';
import { UnauthenticatedErrorCode } from '../../../utils/error/error.code';
import { USER_PLATFORM_TOKEN_HEADER } from '../../../utils/rate-limit.util';
import { documentDownloadEndpoint } from './document-download-endpoint';

const { downloadFileMock } = vi.hoisted(() => ({ downloadFileMock: vi.fn() }));
vi.mock('../../../thirdparty/minio/client', () => ({
  MinIOClient: { downloadFile: downloadFileMock },
}));

type Handler = (req: Request, res: Response) => Promise<unknown>;

const SERVICE_INSTANCE_ID = uuidv4();
const DOCUMENT_ID = uuidv4();
const DOCUMENT_PATH = `/document/get/${SERVICE_INSTANCE_ID}/${DOCUMENT_ID}`;
const OTHER_DOCUMENT_PATH = `/document/get/${SERVICE_INSTANCE_ID}/${uuidv4()}`;
const MINIO_NAME = 'minio-name';
const REFUSED_REGISTRATION_MESSAGE = 'platform registration is not valid';
const REGISTERER_ID =
  TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.REGISTERER.ID;
const USER_PLATFORM_TOKEN = uuidv4();

const getDownloadHandler = (): Handler => {
  const get = vi.fn();
  documentDownloadEndpoint({
    options: () => ({ get }),
  } as unknown as Application);
  // The route is declared with cors and two rate limiters before its handler
  return get.mock.calls[0]![4] as Handler;
};

const buildRequest = ({
  headers = {},
  sessionUser,
}: {
  headers?: Record<string, string>;
  sessionUser?: UserLoadUserBy;
}): Request => {
  // Express lowercases the header names of a request
  const lowerCaseHeaders = Object.fromEntries(
    Object.entries(headers).map(([name, value]) => [name.toLowerCase(), value])
  );
  return {
    params: { serviceInstanceId: SERVICE_INSTANCE_ID, filename: DOCUMENT_ID },
    query: {},
    path: DOCUMENT_PATH,
    headers: lowerCaseHeaders,
    session: { user: sessionUser },
    header: (name: string) => lowerCaseHeaders[name.toLowerCase()],
  } as unknown as Request;
};

const buildResponse = () => {
  const res = {
    setHeader: vi.fn(),
    attachment: vi.fn(),
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    end: vi.fn().mockReturnThis(),
    write: vi.fn(),
    on: vi.fn(),
    once: vi.fn(),
    emit: vi.fn(),
  };
  return res as typeof res & Response;
};

const download = async (req: Request) => {
  const res = buildResponse();
  await requestContext.run({ user: undefined }, () =>
    getDownloadHandler()(req, res)
  );
  return res;
};

const fromPlatformUser = (headers: Record<string, string> = {}) =>
  buildRequest({
    headers: { [USER_PLATFORM_TOKEN_HEADER]: USER_PLATFORM_TOKEN, ...headers },
  });

const withSession = (headers: Record<string, string>) =>
  buildRequest({ headers, sessionUser: contextRegistererUserSecondOrga.user });

const expectDownloaded = (res: ReturnType<typeof buildResponse>) => {
  expect(res.status).not.toHaveBeenCalled();
  expect(downloadFileMock).toHaveBeenCalledExactlyOnceWith(MINIO_NAME);
};

const expectRefused = (
  res: ReturnType<typeof buildResponse>,
  body: Record<string, string>
) => {
  expect(res.status).toHaveBeenCalledWith(403);
  expect(res.json).toHaveBeenCalledWith(body);
  expect(downloadFileMock).not.toHaveBeenCalled();
};

describe('documentDownloadEndpoint platform checks', () => {
  const cleanups: (() => Promise<void>)[] = [];
  let initialUserPlatformToken: string | null;

  const keyedCaller = async () => {
    const caller = await TestHelper.keyedPlatformCaller.create();
    cleanups.push(caller.cleanup);
    return caller;
  };

  const tokenCaller = async () => {
    const caller = await TestHelper.platformCaller.create();
    cleanups.push(caller.cleanup);
    return caller;
  };

  beforeAll(async () => {
    ({ platform_token: initialUserPlatformToken } = await TestHelper.user.load({
      id: REGISTERER_ID,
    }));
  });

  beforeEach(async () => {
    await TestHelper.user.update(
      { id: REGISTERER_ID },
      { platform_token: USER_PLATFORM_TOKEN }
    );
    vi.spyOn(DocumentDomain, 'loadDocumentBy').mockResolvedValue({
      id: DOCUMENT_ID,
      minio_name: MINIO_NAME,
      file_name: 'report.pdf',
      service_instance_id: SERVICE_INSTANCE_ID,
    } as Awaited<ReturnType<typeof DocumentDomain.loadDocumentBy>>);
    vi.spyOn(
      ServiceInstanceDomain,
      'loadServiceDefinitionByServiceInstance'
    ).mockResolvedValue({ identifier: 'not_tracked' } as Awaited<
      ReturnType<
        typeof ServiceInstanceDomain.loadServiceDefinitionByServiceInstance
      >
    >);
    downloadFileMock.mockResolvedValue(Readable.from(['content']));
  });

  afterEach(async () => {
    await Promise.all(cleanups.splice(0).map((cleanup) => cleanup()));
    await TestHelper.user.update(
      { id: REGISTERER_ID },
      { platform_token: initialUserPlatformToken }
    );
  });

  describe('with a platform token', () => {
    it('should download for a user platform token sent with the token of an active registration', async () => {
      // Given
      const caller = await tokenCaller();

      // When
      const res = await download(fromPlatformUser(caller.headers));

      // Then
      expectDownloaded(res);
    });

    it('should download for a user platform token sent without platform token, as old versions do', async () => {
      // When
      const res = await download(fromPlatformUser());

      // Then
      expectDownloaded(res);
    });

    it('should refuse a platform token that matches no registration', async () => {
      // Given
      const caller = await tokenCaller();

      // When
      const res = await download(
        fromPlatformUser({
          ...caller.headers,
          [PLATFORM_TOKEN_HEADER]: uuidv4(),
        })
      );

      // Then
      expectRefused(res, { message: REFUSED_REGISTRATION_MESSAGE });
    });

    it('should refuse with PLATFORM_TOKEN_REFUSED the revoked token of a platform that enrolled a key', async () => {
      // Given
      const caller = await keyedCaller();

      // When
      const res = await download(
        fromPlatformUser({
          [PLATFORM_ID_HEADER]: caller.platformId,
          [PLATFORM_TOKEN_HEADER]: uuidv4(),
        })
      );

      // Then
      expectRefused(res, {
        message: REFUSED_REGISTRATION_MESSAGE,
        code: UnauthenticatedErrorCode.PlatformTokenRefused,
      });
    });
  });

  describe('with an assertion', () => {
    it('should download with an assertion signed for this document', async () => {
      // Given
      const caller = await keyedCaller();
      const assertion = await caller.sign({ claims: { htu: DOCUMENT_PATH } });

      // When
      const res = await download(
        fromPlatformUser({ [PLATFORM_ASSERTION_HEADER]: assertion })
      );

      // Then
      expectDownloaded(res);
    });

    it('should check the assertion of a request with a session too', async () => {
      // Given
      const caller = await keyedCaller();
      const assertion = await caller.sign({
        claims: { htu: OTHER_DOCUMENT_PATH },
      });

      // When
      const res = await download(
        withSession({ [PLATFORM_ASSERTION_HEADER]: assertion })
      );

      // Then
      expectRefused(res, {
        message: REFUSED_REGISTRATION_MESSAGE,
        code: UnauthenticatedErrorCode.PlatformAssertionInvalid,
      });
    });

    it.each([
      {
        label: 'it is signed for another document',
        claims: { htu: OTHER_DOCUMENT_PATH },
      },
      { label: 'it is signed for no document', claims: {} },
    ])(
      'should refuse with PLATFORM_ASSERTION_INVALID an assertion when $label',
      async ({ claims }) => {
        // Given
        const caller = await keyedCaller();
        const assertion = await caller.sign({ claims });

        // When
        const res = await download(
          fromPlatformUser({ [PLATFORM_ASSERTION_HEADER]: assertion })
        );

        // Then
        expectRefused(res, {
          message: REFUSED_REGISTRATION_MESSAGE,
          code: UnauthenticatedErrorCode.PlatformAssertionInvalid,
        });
      }
    );

    it('should refuse with PLATFORM_ASSERTION_INVALID an assertion sent a second time', async () => {
      // Given
      const caller = await keyedCaller();
      const assertion = await caller.sign({ claims: { htu: DOCUMENT_PATH } });
      await download(
        fromPlatformUser({ [PLATFORM_ASSERTION_HEADER]: assertion })
      );
      downloadFileMock.mockClear();

      // When
      const res = await download(
        fromPlatformUser({ [PLATFORM_ASSERTION_HEADER]: assertion })
      );

      // Then
      expectRefused(res, {
        message: REFUSED_REGISTRATION_MESSAGE,
        code: UnauthenticatedErrorCode.PlatformAssertionInvalid,
      });
    });

    it('should answer 401 to a valid assertion without user', async () => {
      // Given
      const caller = await keyedCaller();
      const assertion = await caller.sign({ claims: { htu: DOCUMENT_PATH } });

      // When
      const res = await download(
        buildRequest({ headers: { [PLATFORM_ASSERTION_HEADER]: assertion } })
      );

      // Then
      expect(res.status).toHaveBeenCalledWith(401);
      expect(downloadFileMock).not.toHaveBeenCalled();
    });
  });
});
