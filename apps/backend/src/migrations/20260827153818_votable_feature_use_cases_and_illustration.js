/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  // Free-text labels gave every admin their own vocabulary. Features now reuse
  // the shared use case taxonomy, which is already scoped per product.
  await knex.schema.createTable('VotableFeature_UseCase', (table) => {
    table
      .uuid('votable_feature_id')
      .notNullable()
      .references('id')
      .inTable('VotableFeature')
      .onDelete('CASCADE');
    table
      .uuid('use_case_id')
      .notNullable()
      .references('id')
      .inTable('UseCase')
      .onDelete('CASCADE');
    table.primary(['votable_feature_id', 'use_case_id']);
    // The primary key leads with the feature, so listing the features carrying
    // a given use case would otherwise scan the whole table.
    table.index('use_case_id');
  });

  await knex.schema.alterTable('VotableFeature', (table) => {
    table.dropColumn('labels');
    // Illustrations are uploaded like every other image in the hub instead of
    // being pasted as an arbitrary URL that nothing guaranteed to be reachable.
    table
      .uuid('illustration_document_id')
      .nullable()
      .references('id')
      .inTable('Document')
      .onDelete('SET NULL');
    table.dropColumn('image_url');
  });
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  await knex.schema.alterTable('VotableFeature', (table) => {
    table.dropColumn('illustration_document_id');
    table.string('image_url').nullable();
    table.specificType('labels', 'text[]').notNullable().defaultTo('{}');
  });
  await knex.schema.dropTableIfExists('VotableFeature_UseCase');
}
