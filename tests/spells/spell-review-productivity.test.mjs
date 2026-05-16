import { describe, it, expect } from 'vitest';
import { validateReview, mergeSeedWithReview, missingFields, nextAction } from '../../scripts/spell-review-tools.mjs';

describe('spell review productivity helpers',()=>{
  const seed=[{spellKey:'light',name:'Light',spellClass:'Cleric',spellLevel:1,sourceBook:'Basic'}];
  it('validates reviewed requirements',()=>{
    const rows=[{...seed[0], reviewed:true, pageVerified:true, sourcePage:'', range:'', duration:'', effect:'', save:'', tags:'', manualNotes:''}];
    const errs=validateReview(seed,rows);
    expect(errs.length).toBeGreaterThan(0);
  });
  it('preserves user fields on merge',()=>{
    const merged=mergeSeedWithReview(seed,[{...seed[0],range:'120\'',reviewed:true}]);
    expect(merged[0].range).toContain('120');
    expect(merged[0].reviewed).toBe(true);
  });
  it('computes missing fields and next action',()=>{
    const row={...seed[0],reviewed:false,pageVerified:false,sourcePage:'',range:'',duration:'',effect:'',save:'',tags:'',manualNotes:''};
    expect(missingFields(row)).toContain('duration');
    expect(nextAction(row)).toBeTruthy();
  });
});
