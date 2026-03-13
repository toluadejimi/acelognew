import type { FromSchema } from 'json-schema-to-ts';
import * as schemas from './schemas';

export type GetNewEndpoint1MetadataParam = FromSchema<typeof schemas.GetNewEndpoint1.metadata>;
