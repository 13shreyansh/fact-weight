export function summaryPush(p) {
  const examples = new Set(
    (p.variants?.[0]?.posts || p.copied || []).slice(0, 2),
  );
  return {
    id: p.id,
    watchId: p.watchId,
    title: p.title,
    verdict: p.verdict,
    firstSeen: p.firstSeen,
    lastSeen: p.lastSeen,
    peak: p.peak,
    peakAt: p.peakAt,
    mode: p.mode,
    replayLabel: p.replayLabel,
    signals: p.signals,
    copied: p.copied || [],
    variants: p.variants || [],
    accounts: p.accounts.map((a) => ({ id: a.id })),
    evidence: p.evidence.map((e) => ({
      stance: e.stance,
      publisherGroup: e.publisherGroup,
    })),
    posts: p.posts.map((x) => ({
      id: x.id,
      postedAt: x.postedAt,
      platform: x.platform,
      language: x.language,
      accountId: x.accountId,
      url: x.url,
      handle: x.handle,
      ...(examples.has(x.id) ? { text: x.text } : {}),
    })),
    backgroundPosts: (p.backgroundPosts || []).map((x) => ({
      id: x.id,
      postedAt: x.postedAt,
      platform: x.platform,
    })),
  };
}
