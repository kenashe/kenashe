// Only an unannotated, single-tag listing is subject to this breadth rule. Two
// links or fewer offer little choice. This is not a score for article quality.
export function isThinTagListing(publishedPostCount: number): boolean {
  if (!Number.isSafeInteger(publishedPostCount) || publishedPostCount < 0) throw new Error('Invalid tag inventory');
  return publishedPostCount < 3;
}
