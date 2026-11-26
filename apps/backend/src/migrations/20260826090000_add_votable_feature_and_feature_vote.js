/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  await knex.schema.createTable('VotingRound', (table) => {
    table.uuid('id', { primaryKey: true }).defaultTo(knex.fn.uuid());
    // A round belongs to the service instance it collects feedback for, so a
    // roadmap instance carries its own rounds and its own results.
    table
      .uuid('service_instance_id')
      .notNullable()
      .references('id')
      .inTable('ServiceInstance')
      .onDelete('CASCADE');
    table.string('name').notNullable();
    table.text('description').nullable();
    table.enum('status', ['draft', 'open', 'closed']).notNullable();
    // Visual identity of the public banner: the default hub styling, or the
    // Thread conference one.
    table
      .enum('theme', ['default', 'thread'])
      .notNullable()
      .defaultTo('default');
    table.timestamp('opened_at').nullable();
    table.timestamp('closed_at').nullable();
    table.uuid('creator_id').nullable().references('id').inTable('User');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').nullable();
    table.index('service_instance_id');
  });

  // A service instance can only collect votes on one round at a time. Enforced
  // in the database so a concurrent open cannot slip through the
  // application-level check.
  await knex.raw(
    `CREATE UNIQUE INDEX "VotingRound_single_open_per_service_instance" ON "VotingRound" (service_instance_id) WHERE status = 'open'`
  );

  await knex.schema.createTable('VotableFeature', (table) => {
    table.uuid('id', { primaryKey: true }).defaultTo(knex.fn.uuid());
    table
      .uuid('voting_round_id')
      .notNullable()
      .references('id')
      .inTable('VotingRound')
      .onDelete('CASCADE');
    table.string('title').notNullable();
    table.string('short_description').notNullable();
    table.text('description').notNullable();
    table.string('product').notNullable();
    table.specificType('labels', 'text[]').notNullable().defaultTo('{}');
    table.string('image_url').nullable();
    table.integer('position').notNullable().defaultTo(0);
    table.boolean('active').notNullable().defaultTo(true);
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').nullable();
    table.index(['voting_round_id', 'product']);
  });

  await knex.schema.createTable('FeatureVote', (table) => {
    table
      .uuid('user_id')
      .notNullable()
      .references('id')
      .inTable('User')
      .onDelete('CASCADE');
    table
      .uuid('voting_round_id')
      .notNullable()
      .references('id')
      .inTable('VotingRound')
      .onDelete('CASCADE');
    table
      .uuid('votable_feature_id')
      .notNullable()
      .references('id')
      .inTable('VotableFeature')
      .onDelete('CASCADE');
    table.string('product').notNullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    // One vote per user, per product, per round: voting again within the same
    // round and product moves the vote, while previous rounds keep their votes.
    table.primary(['user_id', 'voting_round_id', 'product']);
    table.index('votable_feature_id');
    // The primary key leads with user_id, so counting the votes of a round
    // would otherwise scan the whole table.
    table.index('voting_round_id');
  });
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  await knex.schema.dropTableIfExists('FeatureVote');
  await knex.schema.dropTableIfExists('VotableFeature');
  await knex.schema.dropTableIfExists('VotingRound');
}
