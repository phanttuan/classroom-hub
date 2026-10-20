export function extractCourseId(req: any): bigint | null {
  const rawId =
    req?.params?.courseId ??
    req?.params?.id ??
    req?.body?.courseId ??
    req?.query?.courseId;

  if (rawId === undefined || rawId === null || rawId === '') {
    return null;
  }

  if (typeof rawId === 'boolean') {
    return null;
  }

  if (typeof rawId === 'number') {
    if (!Number.isInteger(rawId) || rawId <= 0) {
      return null;
    }
    return BigInt(rawId);
  }

  if (typeof rawId === 'bigint') {
    return rawId > 0n ? rawId : null;
  }

  if (typeof rawId === 'string') {
    const trimmed = rawId.trim();
    if (!/^[1-9]\d*$/.test(trimmed)) {
      return null;
    }
    try {
      return BigInt(trimmed);
    } catch {
      return null;
    }
  }

  return null;
}
