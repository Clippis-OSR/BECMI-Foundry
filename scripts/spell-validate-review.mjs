import { loadSeedRows, loadReviewRows, validateReview } from './spell-review-tools.mjs';
const errors=validateReview(await loadSeedRows(), await loadReviewRows()); if(errors.length) throw new Error(errors.join('\n')); console.log('spell:validate-review passed');
