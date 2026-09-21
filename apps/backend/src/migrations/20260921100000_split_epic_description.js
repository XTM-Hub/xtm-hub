const SECTIONS = [
  { title: 'Problem to Solve', column: 'problem_to_solve' },
  { title: 'Proposed Solution', column: 'proposed_solution' },
  { title: 'Expected Value', column: 'expected_value' },
];
const HEADING_REGEX = /^\s*###\s*(.+?)\s*$/;
const TEMPLATE_INTRO_REGEX = /^\s*\[Long Description\][^\n]*$/i;

const columnForHeading = (heading) =>
  SECTIONS.find(({ title }) => title.toLowerCase() === heading.toLowerCase())
    ?.column;

const splitDescription = (description) => {
  const buckets = {
    description: [],
    problem_to_solve: [],
    proposed_solution: [],
    expected_value: [],
  };
  let current = 'description';
  let matched = false;

  for (const line of description.split(/\r?\n/)) {
    const heading = line.match(HEADING_REGEX);
    const column = heading && columnForHeading(heading[1]);
    if (column) {
      current = column;
      matched = true;
      continue;
    }
    if (current === 'description' && TEMPLATE_INTRO_REGEX.test(line)) {
      continue;
    }
    buckets[current].push(line);
  }

  if (!matched) {
    return null;
  }

  return Object.fromEntries(
    Object.entries(buckets).map(([key, lines]) => [
      key,
      lines.join('\n').trim(),
    ])
  );
};

const joinDescription = (epic) =>
  [
    epic.description,
    ...SECTIONS.filter(({ column }) => epic[column] !== '').map(
      ({ title, column }) => `### ${title}\n${epic[column]}`
    ),
  ]
    .filter((part) => part !== '')
    .join('\n\n');

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  await knex.schema.alterTable('Epic', (table) => {
    table.text('problem_to_solve').notNullable().defaultTo('');
    table.text('proposed_solution').notNullable().defaultTo('');
    table.text('expected_value').notNullable().defaultTo('');
  });

  const epics = await knex('Epic')
    .select('id', 'description')
    .where('description', 'ilike', '%###%');
  for (const epic of epics) {
    const parts = splitDescription(epic.description);
    if (parts) {
      await knex('Epic').where({ id: epic.id }).update(parts);
    }
  }
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  const epics = await knex('Epic')
    .select('id', 'description', ...SECTIONS.map(({ column }) => column))
    .where((builder) => {
      for (const { column } of SECTIONS) {
        builder.orWhereNot(column, '');
      }
    });
  for (const epic of epics) {
    await knex('Epic')
      .where({ id: epic.id })
      .update({ description: joinDescription(epic) });
  }

  await knex.schema.alterTable('Epic', (table) => {
    table.dropColumn('problem_to_solve');
    table.dropColumn('proposed_solution');
    table.dropColumn('expected_value');
  });
}
