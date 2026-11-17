import { esDbClient } from './src/thirdparty/elasticsearch/client';
import { runESMigrations } from './src/thirdparty/elasticsearch/migrate';
import {
  MIGRATION_DIRECTORY,
  MigrationCommandType,
} from './src/thirdparty/elasticsearch/migration.const';
import { logApp } from './src/utils/app-logger.util';

function isMigrationCommand(value: string): value is MigrationCommandType {
  return Object.values(MigrationCommandType).includes(
    value as MigrationCommandType
  );
}

// Parse command line arguments
const [, , command, migrationName] = process.argv;
if (!command || !isMigrationCommand(command)) {
  const validCommands = Object.values(MigrationCommandType).join(', ');
  logApp.error(
    `[ES migration] Invalid migration command. It must be one of ${validCommands}`
  );
  process.exit(1);
}

esDbClient
  .init()
  .then(() =>
    runESMigrations({
      command,
      migrationName,
      migrationsDirectory: MIGRATION_DIRECTORY,
    })
  )
  .then(() => {
    logApp.info('[ES migration] migration completed');
  })
  .catch((err) => {
    logApp.error('[ES migration] migration failed:', { error: err });
  });
