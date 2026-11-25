/**
 * Personal API tokens: a user acts through the GraphQL API with a token sent as
 * `Authorization: Bearer xhp_...`, in one organization, with a scope. Only the
 * SHA-256 of the secret is stored; the secret is shown once at creation.
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  await knex.schema.createTable('ApiToken', (table) => {
    table.uuid('id', { primaryKey: true }).defaultTo(knex.fn.uuid());
    table
      .uuid('user_id')
      .notNullable()
      .references('id')
      .inTable('User')
      .onDelete('CASCADE');
    table
      .uuid('organization_id')
      .notNullable()
      .references('id')
      .inTable('Organization')
      .onDelete('CASCADE');
    table.string('name').notNullable();
    // The first characters of the secret after xhp_, shown in the lists to tell tokens apart
    table.string('token_prefix').notNullable();
    // Hex SHA-256 of the whole secret: the secret is 32 random bytes, a slow hash adds nothing
    table.string('token_hash').notNullable().unique();
    table.enum('scope', ['read', 'read_write', 'admin']).notNullable();
    table.timestamp('expires_at').notNullable();
    table.timestamp('last_used_at').nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('revoked_at').nullable();
    table.index('user_id');
    table.index('organization_id');
  });
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  await knex.schema.dropTable('ApiToken');
}
