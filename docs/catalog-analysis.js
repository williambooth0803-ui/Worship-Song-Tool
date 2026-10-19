import {catalogAnalysisData} from './catalog-analysis-data.js';

// Public catalog analysis is separate from every personal assessment and draft.
export function catalogAnalysisFor(song, mode = 'full') {
  if (mode !== 'full' || song.aiDismissed) return null;
  const record = catalogAnalysisData.records[song.id];
  if (!record || record.title !== song.title || record.author !== song.author) return null;
  const analysis = record.analysisKey ? catalogAnalysisData.analyses[record.analysisKey] : null;
  return {...record, analysis};
}
export const catalogAnalysisCoverage = catalogAnalysisData.coverage;

export function catalogAnalysisMarkup(record, escape, hidden = new Set()) {
  if (!record) return '';
  const a = record.analysis;
  const status = record.status === 'reviewed-draft' ? 'Expanded AI draft' : record.status === 'partial-text' ? 'Incomplete or uncertain source text' : record.status === 'text-scan' ? 'Text evidence scan · rating not reassessed' : record.status === 'identity-unresolved' ? 'Text identity needs review' : 'Lyric evidence needed';
  const lead = record.status === 'reviewed-draft' ? '' : `<h3>${status}</h3><p>${escape(a?.version || 'No matching lyric text has been reviewed yet.')}</p>`;
  if (!a) return `<details class="catalog-analysis" data-disclosure-key="catalog-analysis:${escape(record.id)}"><summary>Catalog lyric analysis <span>${status}</span></summary><div>${lead}<p>A matching title alone cannot establish which words belong to this song. Add or select a reliable text in Generate AI evaluation to continue.</p></div></details>`;
  return `<details class="catalog-analysis" data-disclosure-key="catalog-analysis:${escape(record.id)}" ${record.status==='reviewed-draft'?'open':''}><summary>Catalog lyric analysis <span>${status}</span></summary><div>${lead}${record.status!=='reviewed-draft' && !hidden.has("summary") && a.summary?`<p>${escape(a.summary)}</p>`:''}${!hidden.has('claims')?`<h4>${record.status==='reviewed-draft'?'Lyrical reasoning and preliminary scores':'Observed text evidence'}</h4><dl class="analysis-reasons">${a.reasons.map(r=>`<div><dt>${escape(r.criterion)}${!hidden.has('rating')&&record.status==='reviewed-draft'&&a.scores?` <span class="catalog-criterion-score">${escape(a.scores[{'Doctrinal accuracy':'accuracy','Theological substance':'substance','Language & craftsmanship':'language'}[r.criterion]] ?? 'Not assessed')}/10</span>`:''}</dt><dd>${escape(r.explanation)}</dd></div>`).join('')}</dl>`:''}${!hidden.has('concerns') && a.quote?`<p class="analysis-excerpt"><strong>${!hidden.has("concerns") && a.concerns.length?'Wording to examine':'Short lyric excerpt'}</strong> <q>${escape(a.quote)}</q></p>`:''}${!hidden.has("concerns") && a.concerns.length?`<h4>Concerns and interpretation</h4><ul>${a.concerns.map(c=>`<li>${escape(c)}</li>`).join('')}</ul>`:!hidden.has('concerns')&&record.status==='reviewed-draft'?'<p>No specific wording concerns identified.</p>':''}${!hidden.has("themes") && a.themes.length?`<h4>${record.status==='reviewed-draft'?'Themes':'Textual topics detected'}</h4><div class="analysis-themes">${a.themes.map(t=>`<span class="tag">${escape(t)}</span>`).join('')}</div>`:''}${!hidden.has("scriptures") && a.scriptures.length?`<h4>Scripture quotations and connections</h4><p class="muted">KJV · supporting comparisons</p><ul class="analysis-scriptures">${a.scriptures.map(s=>`<li><strong>${escape(s.reference)}</strong> · ${escape(s.relationship)}<blockquote>${escape(s.quote)}</blockquote>${s.explanation.startsWith("Compare the passage in context")?"":`<p>${escape(s.explanation)}</p>`}</li>`).join('')}</ul><a class="text-button" href="${escape(catalogAnalysisData.scriptureSource.url)}" target="_blank" rel="noopener noreferrer">KJV quotation source ↗</a>`:''}${!hidden.has('sources')?`<h4>Text source</h4><a href="${escape(a.source.url)}" target="_blank" rel="noopener noreferrer">${escape(a.source.label)} ↗</a><p class="muted">${escape(({'music-resource-page':'Public music-resource lyric page','artist-publisher-page':'Artist/publisher lyric page','published-hymnal':'Hymn collection text','community-transcription':'Community transcription','community-hymnal':'Community hymn transcription'})[a.source.kind] || a.source.kind)} · checked ${escape(a.source.checkedAt)}</p>`:''}<details><summary>Text version</summary>${record.identityAssumption?`<p class="analysis-identity-assumption">${escape(record.identityAssumption)}</p>`:""}<p>${escape(a.version)}</p></details></div></details>`;
}

export function enrichCatalogEvaluation(song) {
  const record = catalogAnalysisFor(song);
  if (record?.status !== 'reviewed-draft' || !Number.isFinite(record.analysis?.scores?.accuracy)) return song;
  const a=record.analysis, sources=[...(song.review.sources||[]),{url:a.source.url,label:a.source.label}];
  return {...song,themes:[...a.themes],review:{...song.review,status:'ai',scores:{...a.scores},
    summary:song.review.summary || a.reasons[0].explanation,
    claims:a.reasons.map(r=>`${r.criterion}: ${r.explanation}`),
    concerns:[...new Set([...(song.review.concerns||[]),...a.concerns])],
    concern:a.concerns.length && song.review.concern==='none'?'context':song.review.concern,
    sources:sources.filter((s,i)=>sources.findIndex(t=>t.url===s.url)===i),
    aiFields:[...new Set([...(song.review.aiFields||[]),'scores','summary','claims','concerns','themes'])],
    model:'Prewritten lyric-evidence draft · exact recording not verified',updatedAt:'2026-10-17T00:00:00Z'}};
}


export function validateLyricExcerpt(text, quote) {
  const normalized=value=>value.normalize('NFKC').toLowerCase().replace(/(?<=[a-z])-{2,}(?=[a-z])/g,'').replace(/[’‘]/g,"'").replace(/[^a-z0-9']/g,' ').replace(/\s+/g,' ').trim();
  if (typeof text!=='string'||typeof quote!=='string'||quote.length>90||quote.trim().split(/\s+/).filter(Boolean).length>10 || (quote && !normalized(text).includes(normalized(quote)))) throw new Error('Use an exact lyric excerpt of at most 90 characters and 10 words.');
  return quote;
}
