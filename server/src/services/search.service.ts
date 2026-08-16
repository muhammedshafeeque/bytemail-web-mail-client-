import { searchEmails as searchWildduck } from './wildduck-db.service';

export interface SearchResult {
  emails: object[];
  total: number;
}

export async function searchEmails(
  wdUserId: string,
  query: string,
  folder?: string,
  page = 1,
  limit = 25
): Promise<SearchResult> {
  return searchWildduck(wdUserId, query, folder, page, limit);
}
