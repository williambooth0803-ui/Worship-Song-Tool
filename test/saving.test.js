import test from 'node:test';
import assert from 'node:assert/strict';
import {workspaceSignature} from '../public/saving.js';

test('evaluation protocol markers do not create unsaved work, while nested data and actual scores remain significant',()=>{
  const original={version:1,songs:[],profile:{evaluationClient:'human metadata'},evaluationHistory:[{id:'a',data:'score: 8'}]};
  assert.equal(workspaceSignature(original),workspaceSignature({...original,evaluationClient:4,evaluationSchema:4}));
  assert.notEqual(workspaceSignature(original),workspaceSignature({...original,profile:{evaluationClient:'different human metadata'}}));
  assert.notEqual(workspaceSignature(original),workspaceSignature({...original,evaluationHistory:[{id:'a',data:'score: 9'}]}));
  assert.notEqual(workspaceSignature({evaluationClient:'human A'}),workspaceSignature({evaluationClient:'human B'}));
});
