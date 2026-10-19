const copy = value => structuredClone(value);
const fields = ['review', 'aiReview', 'aiDismissed', 'themes'];
const sharedReviewFields = ['notes', 'key', 'minutes', 'musical'];
const evaluation = song => Object.fromEntries(fields.filter(key => song[key] !== undefined).map(key => [key, copy(song[key])]));
export function lensList(workspace) {
  return workspace.lenses || [{id: 'main', name: 'Main lens', profile: {}, evaluations: {}}];
}
export function activeLens(workspace) {
  return lensList(workspace).find(lens => lens.id === (workspace.activeLensId || 'main'));
}
function capture(workspace) {
  const lens = activeLens(workspace);
  lens.profile = copy(workspace.profile);
  lens.evaluations = Object.fromEntries(workspace.songs.map(song => [song.id, evaluation(song)]));
}
export function switchLens(workspace, id) {
  const next = copy(workspace);
  next.lenses ||= lensList(next);
  next.activeLensId ||= 'main';
  const target = next.lenses.find(lens => lens.id === id);
  if (!target) throw new Error('Choose an existing lens.');
  if (id === next.activeLensId) return next;
  capture(next);
  const preferences = {aiMode: next.profile.aiMode, aiLabels: next.profile.aiLabels};
  next.profile = {...copy(target.profile), ...preferences};
  for (const song of next.songs) {
    const saved = target.evaluations[song.id] || {themes: copy(song.catalogThemes || []), review: copy(song.catalogReview || {
      ...song.review, status: 'unreviewed', scores: {accuracy:null, substance:null, language:null, time:null}, customScores:{},
      summary:'', claims:[], concerns:[], uses:[], scriptures:[], sources:[], concern:'none', language:'', time:'', updatedAt:null,
    })};
    const shared = Object.fromEntries(sharedReviewFields.map(key => [key, song.review[key]]));
    for (const key of fields) {
      if (saved[key] === undefined) delete song[key];
      else song[key] = copy(saved[key]);
    }
    Object.assign(song.review, shared);
  }
  next.activeLensId = id;
  return next;
}
export function createLens(workspace, {id, name, purpose = ''}) {
  if (!name.trim() || name.length > 100 || purpose.length > 2000) throw new Error('Enter a lens name and a shorter purpose.');
  const next = copy(workspace);
  next.lenses ||= lensList(next);
  next.activeLensId ||= 'main';
  if (next.lenses.length >= 12) throw new Error('You can keep up to 12 lenses.');
  if (next.lenses.some(lens => lens.id === id || lens.name.toLowerCase() === name.trim().toLowerCase())) throw new Error('Use a different lens name.');
  capture(next);
  const lens = {id, name: name.trim(), profile: {...copy(next.profile), evaluationPurpose: purpose.trim()}, evaluations: copy(activeLens(next).evaluations)};
  next.lenses.push(lens);
  return switchLens(next, id);
}
export function renameActiveLens(workspace, name) {
  const next = copy(workspace);
  next.lenses ||= lensList(next);
  next.activeLensId ||= 'main';
  if (!name.trim() || name.length > 100 || next.lenses.some(lens => lens.id !== next.activeLensId && lens.name.toLowerCase() === name.trim().toLowerCase())) throw new Error('Use a unique lens name.');
  capture(next);
  activeLens(next).name = name.trim();
  return next;
}
