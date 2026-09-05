import { createHash } from 'node:crypto';
export const MACHINE_VERDICTS = Object.freeze(['DENY','STRUCTURALLY_VALID_AWAITING_HUMAN']);
export const REQUIRED_STUDIES = Object.freeze(['visualHierarchy','forceLoadPaths','negativeSpace','repetitionRhythm','grownManufacturedGrammar','causalAssemblyGraph','contourIntents']);
export const REQUIRED_VARIANTS = Object.freeze(['FAITHFUL','TOO_MECHANICAL','TOO_ORGANIC','DECORATIVE_FLESH','WONDER']);
export const hash = value => createHash('sha256').update(typeof value === 'string' || Buffer.isBuffer(value) ? value : JSON.stringify(value)).digest('hex');
export function validateStudy(study, manifest) {
  const failures=[];
  if (manifest.sealed !== true) failures.push('SOURCE_SET_NOT_SEALED');
  for (const key of REQUIRED_STUDIES) if (!study[key] || (Array.isArray(study[key]) && !study[key].length)) failures.push(`MISSING_STUDY:${key}`);
  for (const node of study.causalAssemblyGraph ?? []) {
    for (const key of ['job','material','load','connects','whyShape','exposure','protection','failure']) if (!node[key] || (Array.isArray(node[key]) && !node[key].length)) failures.push(`ASSEMBLY_REASON_MISSING:${node.part}:${key}`);
  }
  for (const contour of study.contourIntents ?? []) if (!contour.language || contour.language.length < 40) failures.push(`CONTOUR_INTENT_WEAK:${contour.id}`);
  return {state:failures.length?'DENY':'STRUCTURALLY_VALID_AWAITING_HUMAN', failures};
}
export function validateVariants(variants) {
  const ids=new Set((variants ?? []).map(v=>v.kind));
  const failures=REQUIRED_VARIANTS.filter(v=>!ids.has(v)).map(v=>`MISSING_VARIANT:${v}`);
  const scales=new Set((variants ?? []).map(v=>v.scale));
  if (scales.size > 1) failures.push('VARIANT_SCALE_MISMATCH');
  return {state:failures.length?'DENY':'STRUCTURALLY_VALID_AWAITING_HUMAN', failures};
}
export function assertMachineVerdict(verdict) {
  if (!MACHINE_VERDICTS.includes(verdict)) throw new Error(`REJECT:MACHINE_CANNOT_GRANT:${verdict}`);
  return verdict;
}
export function candidateCanEnterGrammar(candidate) {
  return Boolean(candidate?.contourIntentId && candidate?.assemblyReasonId && candidate?.humanDisposition === 'KEEP_FOR_STUDY');
}
