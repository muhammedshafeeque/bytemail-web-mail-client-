import { EmailCache } from '../models/EmailCache.model';

export interface SearchResult {
  emails: object[];
  total: number;
}

export async function searchEmails(
  userEmail: string,
  query: string,
  folder?: string,
  page = 1,
  limit = 25
): Promise<SearchResult> {
  const filter: Record<string, unknown> = {
    user_email: userEmail,
    $text: { $search: query },
  };

  if (folder) filter.folder = folder;

  const [emails, total] = await Promise.all([
    EmailCache.find(filter, { score: { $meta: 'textScore' } })
      .sort({ score: { $meta: 'textScore' }, date: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    EmailCache.countDocuments(filter),
  ]);

  return { emails, total };
}
