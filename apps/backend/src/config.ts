// https://github.com/node-config/node-config
import config from 'config';
import {
  DevUser,
  parseAndValidateDevUsers,
} from './utils/config-validation.util';

interface PortalConfig {
  port: number;
  admin: {
    email: string;
    password: string;
  };
  database: {
    host: string;
    port: number;
    user: string;
    password: string;
    database: string;
    seeds: string;
  };
  enabled_emails: {
    pending_user_digest: boolean;
    public_roadmap_monthly_reminder: boolean;
  };
  saas_manager: {
    enabled: boolean;
  };
  auth0_sync: {
    enabled: boolean;
    max_users_per_run: number;
    concurrency: number;
    deadline_minutes: number;
  };
  elasticsearch: {
    protocol: string;
    host: string;
    port: number;
    username: string | null;
    password: string | null;
    tls: {
      ca_path: string | null;
      reject_unauthorized: boolean;
    };
  };
  session_store: {
    type: 'postgresql' | 'memory';
    cleanup_interval_minutes: number;
  };
  session: {
    name: string;
    secret: string;
  };
  environment: string;
  enabled_features: string[];
  dev_users?: DevUser[];
}

const portalConfig: PortalConfig = {
  port: config.get<number>('port'),
  admin: {
    email: config.get<string>('admin.email'),
    password: config.get<string>('admin.password'),
  },
  database: {
    host: config.get<string>('database.host'),
    port: config.get<number>('database.port'),
    user: config.get<string>('database.user'),
    password: config.get<string>('database.password'),
    database:
      process.env.VITEST_MODE || process.env.NODE_ENV === 'test'
        ? config.get<string>('database-test.database')
        : config.get<string>('database.database'),
    seeds:
      process.env.VITEST_MODE || process.env.NODE_ENV === 'test'
        ? config.get<string>('database-test.seeds')
        : 'src/seeds',
  },
  enabled_emails: {
    pending_user_digest:
      config.get<boolean>('enabled_emails.pending_user_digest') ?? false,
    public_roadmap_monthly_reminder:
      config.get<boolean>('enabled_emails.public_roadmap_monthly_reminder') ??
      false,
  },
  // Never call the external SaaS Manager from backend or E2E tests.
  saas_manager: {
    enabled: !(process.env.VITEST_MODE || process.env.NODE_ENV === 'test'),
  },
  auth0_sync: {
    enabled: config.get<boolean>('auth0_sync.enabled') ?? false,
    max_users_per_run: config.get<number>('auth0_sync.max_users_per_run'),
    concurrency: config.get<number>('auth0_sync.concurrency'),
    deadline_minutes: config.get<number>('auth0_sync.deadline_minutes'),
  },
  elasticsearch: {
    protocol: config.get<string | null>('elasticsearch.protocol') ?? 'https',
    host: config.get<string>('elasticsearch.host'),
    port: config.get<number>('elasticsearch.port'),
    username: config.get<string | null>('elasticsearch.username'),
    password: config.get<string | null>('elasticsearch.password'),
    tls: {
      ca_path: config.get<string | null>('elasticsearch.tls.ca_path'),
      reject_unauthorized: config.get<boolean>(
        'elasticsearch.tls.reject_unauthorized'
      ),
    },
  },
  session_store: {
    type: config.get<'postgresql' | 'memory'>('session_store.type'),
    cleanup_interval_minutes: config.get<number>(
      'session_store.cleanup_interval_minutes'
    ),
  },
  session: {
    name: config.get<string>('session.name'),
    secret: config.get<string>('session.secret'),
  },
  environment: config.get<string>('environment'),
  enabled_features: config.get<string[]>('enabled_features') ?? [],
  dev_users: parseAndValidateDevUsers(),
};
export default portalConfig;
