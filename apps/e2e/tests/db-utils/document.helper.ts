import { db } from './db-connection';
export const removeDocument = async (fileName: string) => {
  await db('Document').delete('*').where('file_name', '=', fileName);
};
