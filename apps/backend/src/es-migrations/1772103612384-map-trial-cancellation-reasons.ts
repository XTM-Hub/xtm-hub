'use strict';

import { esDbClient } from '../thirdparty/elasticsearch/client.js';
import { withIndexPrefix } from '../thirdparty/elasticsearch/index-prefix.js';
import { logApp } from '../utils/app-logger.util';

export const up = async function (next: () => void) {
  const mapping = {
    'Intelligence lacks actionable insight for our specific needs': 'value',
    'Incompatible with our existing security stack': 'compatibility',
    'Configuration is too complex to complete within a reasonable timeframe':
      'complexity',
    'Internal security or legal team required immediate termination':
      'legal-security',
    'We lack the internal analysts/expertise to utilise the tool effectively':
      'expertise',
  };

  for (const [label, keyword] of Object.entries(mapping)) {
    try {
      await esDbClient.updateByQuery({
        index: withIndexPrefix('telemetry_v1'),
        refresh: true,
        conflicts: 'proceed',
        script: {
          source: 'ctx._source.cancellation_reason = params.keyword',
          params: { keyword },
        },
        query: {
          term: { 'cancellation_reason.keyword': label },
        },
      });
    } catch (error) {
      logApp.error(
        `Error updating cancellation_reason from '${label}' to '${keyword}'`,
        { error }
      );
    }
  }
  next();
};

export const down = async function (next: () => void) {
  const reverseMapping = {
    value: 'Intelligence lacks actionable insight for our specific needs',
    compatibility: 'Incompatible with our existing security stack',
    complexity:
      'Configuration is too complex to complete within a reasonable timeframe',
    'legal-security':
      'Internal security or legal team required immediate termination',
    expertise:
      'We lack the internal analysts/expertise to utilise the tool effectively',
  };

  for (const [keyword, label] of Object.entries(reverseMapping)) {
    try {
      await esDbClient.updateByQuery({
        index: withIndexPrefix('telemetry_v1'),
        refresh: true,
        conflicts: 'proceed',
        script: {
          source: 'ctx._source.cancellation_reason = params.label',
          params: { label },
        },
        query: {
          term: { 'cancellation_reason.keyword': keyword },
        },
      });
    } catch (error) {
      logApp.error(
        `Error reverting cancellation_reason from '${keyword}' to '${label}'`,
        { error }
      );
    }
  }
  next();
};
