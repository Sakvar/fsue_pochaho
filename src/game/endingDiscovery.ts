const ENDING_ARCHIVE_PREFIX = 'ending:'

export function endingIdFromArchiveEntry(entry: string): string | null {
  if (!entry.startsWith(ENDING_ARCHIVE_PREFIX)) return null
  return entry.slice(ENDING_ARCHIVE_PREFIX.length) || null
}

export function hasEndingInArchive(archive: readonly string[], endingId: string): boolean {
  return archive.includes(`${ENDING_ARCHIVE_PREFIX}${endingId}`)
}
