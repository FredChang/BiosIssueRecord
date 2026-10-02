/**
 * Similarity Service
 * Provides Levenshtein distance and token-based similarity calculations.
 */
const SimilarityService = {
  calculateSimilarity(source, target) {
    if (!source || !target) return 0.0;
    source = source.trim();
    target = target.trim();
    if (source === target) return 100.0;

    const distance = this.levenshteinDistance(source.toLowerCase(), target.toLowerCase());
    const maxLength = Math.max(source.length, target.length);
    if (maxLength === 0) return 100.0;

    const charSimilarity = (1.0 - distance / maxLength) * 100.0;
    
    // Also calculate token similarity for better sentence matching
    const tokenSim = this.tokenJaccardSimilarity(source, target);
    
    // Weighted combination
    return Math.max(charSimilarity, tokenSim * 100);
  },

  levenshteinDistance(source, target) {
    const n = source.length;
    const m = target.length;
    if (n === 0) return m;
    if (m === 0) return n;

    const d = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));

    for (let i = 0; i <= n; i++) d[i][0] = i;
    for (let j = 0; j <= m; j++) d[0][j] = j;

    for (let i = 1; i <= n; i++) {
      for (let j = 1; j <= m; j++) {
        const cost = target[j - 1] === source[i - 1] ? 0 : 1;
        d[i][j] = Math.min(
          d[i - 1][j] + 1,
          d[i][j - 1] + 1,
          d[i - 1][j - 1] + cost
        );
      }
    }
    return d[n][m];
  },

  tokenJaccardSimilarity(s1, s2) {
    const tokenize = str => new Set(str.toLowerCase().replace(/[^\w\s\u4e00-\u9fa5]/g, ' ').split(/\s+/).filter(Boolean));
    const set1 = tokenize(s1);
    const set2 = tokenize(s2);
    if (set1.size === 0 || set2.size === 0) return 0;

    let intersection = 0;
    for (const item of set1) {
      if (set2.has(item)) intersection++;
    }
    const union = set1.size + set2.size - intersection;
    return union === 0 ? 0 : intersection / union;
  },

  findSimilarIssues(currentIssue, issueList, threshold = 40) {
    if (!currentIssue || !currentIssue.title) return [];
    
    const results = [];
    for (const issue of issueList) {
      // Don't compare with itself
      if (currentIssue.id && issue.id === currentIssue.id) continue;
      if (currentIssue.issue_id && issue.issue_id === currentIssue.issue_id) continue;

      const titleSim = this.calculateSimilarity(currentIssue.title, issue.title || '');
      const descSim = currentIssue.description && issue.description
        ? this.calculateSimilarity(currentIssue.description, issue.description)
        : 0;

      const maxScore = Math.max(titleSim, descSim);
      if (maxScore >= threshold) {
        results.push({
          issue,
          score: Math.round(maxScore),
          titleScore: Math.round(titleSim),
          descScore: Math.round(descSim)
        });
      }
    }

    return results.sort((a, b) => b.score - a.score);
  }
};
