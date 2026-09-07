import config from 'config';
import * as fsPromises from 'fs/promises';
import { toGlobalId } from 'graphql-relay/node/node.js';
import Handlebars from 'handlebars';
import nodemailer, { TransportOptions } from 'nodemailer';
import * as path from 'path';
import { PlatformIdentifier } from '../__generated__/resolvers-types';
import { MAIL_QUEUES, type MailJobData } from '../thirdparty/pgboss/mail.jobs';
import { PgBossProducer } from '../thirdparty/pgboss/producer';
import { logApp } from '../utils/app-logger.util';
import {
  MailTemplates,
  PlatformIdentifierToString,
  templateSubjects,
} from './mail-template/mail';

Handlebars.registerHelper('eq', function (a, b) {
  return a === b;
});

const smtpOptions = config.get<TransportOptions>('smtp_options');
const transporter = nodemailer.createTransport(smtpOptions);

const templateCache = new Map<string, HandlebarsTemplateDelegate>();
const templateDirectory = path.join('src/server/mail-template');
let layoutPartialRegistrationPromise: Promise<void> | undefined;

interface SendMailParams<T extends keyof MailTemplates> {
  to: string | string[];
  template: T;
  params: MailTemplates[T];
}

const useQueueProcessing = (): boolean =>
  config.get<boolean>('mail_use_queue_processing');

const registerLayoutPartial = async (): Promise<void> => {
  if (!layoutPartialRegistrationPromise) {
    layoutPartialRegistrationPromise = fsPromises
      .readFile(path.join(templateDirectory, 'layout.html'))
      .then((layoutSource) => {
        Handlebars.registerPartial('layout', layoutSource.toString());
      });
  }

  await layoutPartialRegistrationPromise;
};

export const buildServiceLink = ({
  serviceDefinitionIdentifier,
  serviceInstanceId,
}: {
  serviceDefinitionIdentifier: string;
  serviceInstanceId: string;
}) => {
  return `${config.get('base_url_front')}/app/service/${serviceDefinitionIdentifier}/${toGlobalId('ServiceInstance', serviceInstanceId)}`;
};

export const buildXtmPlatformTrialLink = () => {
  return `${config.get('base_url_front')}/app/xtm-platform-trial`;
};

export const buildPendingUserActionLink = ({
  action,
  organizationId,
  userId,
}: {
  action: 'approve' | 'deny';
  organizationId: string;
  userId: string;
}) => {
  const url = new URL(
    '/redirect/handle-pending-user',
    config.get<string>('base_url_front')
  );
  url.searchParams.set('action', action);
  url.searchParams.set(
    'organization_id',
    toGlobalId('Organization', organizationId)
  );
  url.searchParams.set('user_id', toGlobalId('User', userId));
  return url.toString();
};

export async function renderEmail<T extends keyof MailTemplates>(
  templateName: T,
  params: MailTemplates[T]
) {
  await registerLayoutPartial();

  let compiledTemplate = templateCache.get(templateName);

  if (!compiledTemplate) {
    const filepath = path.join(templateDirectory, `${templateName}.html`);
    const templateContent = (await fsPromises.readFile(filepath)).toString();
    compiledTemplate = Handlebars.compile(templateContent);
    templateCache.set(templateName, compiledTemplate);
  }

  const baseParams = {
    base_url_front: config.get('base_url_front'),
    contactEmail: 'xtm-hub-support@filigran.io',
    title: templateSubjects[templateName](params),
  };

  const renderParams = params
    ? {
        ...params,
        ...baseParams,
        ...('platformIdentifier' in params
          ? {
              platformIdentifier:
                PlatformIdentifierToString[
                  params.platformIdentifier as PlatformIdentifier
                ],
            }
          : {}),
        ...('products' in params && Array.isArray(params.products)
          ? {
              products: (params.products as PlatformIdentifier[]).map(
                (product) => PlatformIdentifierToString[product]
              ),
            }
          : {}),
      }
    : baseParams;

  return compiledTemplate(renderParams);
}

export const sendMailDirect = async <T extends keyof MailTemplates>({
  to,
  template,
  params,
}: SendMailParams<T>): Promise<void> => {
  const from = config.get<string>('smtp_options.from');
  const subject = templateSubjects[template](params);
  const html = await renderEmail(template, params);

  if (!(process.env.VITEST_MODE || process.env.NODE_ENV === 'test')) {
    try {
      const info = await transporter.sendMail({ from, to, subject, html });
      logApp.info('Email sent: ' + info.response);
    } catch (error) {
      logApp.error('Email error: ' + error);
      throw error;
    }
  }
};

export const sendMail = async <T extends keyof MailTemplates>({
  to,
  template,
  params,
}: SendMailParams<T>) => {
  if (useQueueProcessing()) {
    try {
      const jobData: MailJobData = {
        to,
        template,
        params: params as Record<string, unknown>,
      };
      await PgBossProducer.send(MAIL_QUEUES.SEND, jobData);
    } catch (error) {
      logApp.error('Failed to enqueue mail job', { error });
    }
    return;
  }

  sendMailDirect({ to, template, params }).catch((error) => {
    logApp.error('Failed to send mail directly', { error });
  });
};

/**
 * Clear the template cache.
 * Useful for testing or when templates are updated at runtime.
 */
export const clearTemplateCache = () => {
  templateCache.clear();
  Handlebars.unregisterPartial('layout');
  layoutPartialRegistrationPromise = undefined;
};
