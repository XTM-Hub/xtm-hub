## How to create a ES DB migration

- Run `yarn esmigrate:make my_modif_name`. It will create a migration file in the src/thirdparty/elasticsearch/migrations.
- Fill up and down functions in the file. Don't remove the `next()` call at the end of each function! (otherwise next migration file will not be processed)
- On you first launch of backend, it will update the DB. It will insert a new entry in the ES `migrations` table.

If you want to manually upgrade/downgrade elastic search:

- run `yarn esmigrate:up` to run all migration files
- run `yarn esmigrate:down` to remove the last migration (it will remove only this one)

## Elasticsearch client

The backend ships the Elasticsearch 8.x and 9.x clients (`@elastic/elasticsearch` and its alias
`@elastic/elasticsearch-v9`): one client major cannot serve both server majors. `esDbClient.init()` picks one at
startup, before the migrations, from `elasticsearch.engine_client` (`ELASTIC_ENGINE_CLIENT`):

- `auto` (default): a `GET /` on the server decides. Elasticsearch 8 gets the 8.x client, with a deprecation
  warning, Elasticsearch 9 the 9.x client. Any other version is refused;
- `elasticsearch8` or `elasticsearch9`: that client, without reading the server.

OpenSearch is not supported: the backend refuses to start on it. Any detection failure stops the startup too.

Both clients get the request timeout of `elasticsearch.request_timeout` (`ELASTIC_REQUEST_TIMEOUT`, in milliseconds,
10 minutes by default): the 9.x client has no default and would otherwise wait forever on a stalled server.

The calls the hub makes are typed in `engine-api.ts`: a request must fit the types of both majors, a response is
read through the fields either may return, and both clients satisfy these types without a cast. A request shape
only one major accepts fails to compile. Add a new call there first, then to `ElasticSearchService`. The ES
migrations written for the 8.x client pass `putMapping` its mapping under `body`, which the 9.x types refuse:
`getIndices().putMapping` still takes that shape and sends the mapping at the top level.

## Elasticsearch tests

`*.es.test.ts` files run against a real Elasticsearch and are skipped everywhere else. Run them with
`ELASTIC_HOST`/`ELASTIC_PORT` pointing at the server, and `ES_TESTS_EXPECTED_CLIENT` set to the client it must
get to also check the detection:

- `VITEST_MODE=true yarn test:es`

The "Elasticsearch tests" CI job runs them once per supported Elasticsearch major.
