export function extractClassId(req: any): bigint | null {
  const rawId =
    req?.params?.classId ??
    req?.body?.classId ??
    req?.query?.classId;

  if (rawId === undefined || rawId === null || rawId === '') {
    return null;
  }

  if (typeof rawId === 'boolean') {
    return null;
  }

  if (typeof rawId === 'string' && rawId.trim() === '') {
    return null;
  }

  try {
    const parsed = BigInt(rawId);
    return parsed;
  } catch {
    return null;
  }
}
