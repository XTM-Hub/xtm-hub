/**
 * Child documents (images, logos) carry no status of their own: nothing reads
 * it and new children are created published. Legacy children kept the draft
 * status that the `active` flag migration gave them.
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  await knex('Document')
    .whereNot('status', 'published')
    .whereIn('id', knex('Document_Children').select('child_document_id'))
    .update({ status: 'published' });
}

/**
 * Irreversible: the previous status of each child is not kept.
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down() {}
