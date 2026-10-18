// Carry forward public evidence, never personal workspace data or new findings.
export function retainCatalogEvidence(song, data, coverage) {
  const record = data.records[song.id];
  if (!record || !coverage || record.title !== song.title || record.author !== song.author ||
      Object.keys(record).some(key => JSON.stringify(record[key]) !== JSON.stringify(coverage[key]))) {
    throw new Error('Cannot retain mismatched catalog evidence ' + song.id);
  }
  const analysis = record.analysisKey ? data.analyses[record.analysisKey] : null;
  if (record.analysisKey && (!analysis || coverage.sourceHash !== analysis.source.hash || coverage.sourceURL !== analysis.source.url)) {
    throw new Error('Cannot retain missing or mismatched source evidence ' + song.id);
  }
  return structuredClone({record, analysis, coverage});
}
