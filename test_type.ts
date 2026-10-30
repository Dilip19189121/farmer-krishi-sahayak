export interface ParsedScheme {
  id: string;
  name: string;
  description: string;
  eligibility: string;
  link: string;
  sourceFile: string;
  categoryKey: 'all' | 'dbt' | 'insurance' | 'equipment' | 'irrigation' | 'organic' | 'credit';
  stateType: 'all' | 'central' | 'state';
  eligibilityKey: 'all' | 'small' | 'tenant' | 'women';
}

export const parsedSchemes: ParsedScheme[] = [
{ id: "pmfby", name: "Pradhan Mantri Fasal Bima Yojana (PMFBY)", description: "Comprehensive crop insurance cover against failure of notified crops - assured insurance protection from natural calamities, pests & diseases, with farmers paying only 2% premium for Kharif, 1.5% for Rabi and 5% for annual commercial/horticultural crops; technology like remote sensing and drones is used for loss estimation.", eligibility: "All farmers growing notified crops in a notified area. Compulsory for loanee farmers with a Crop Loan/KCC account for notified crops, voluntary for non-loanee farmers.", link: "", sourceFile: "", categoryKey: 'all', stateType: 'all', eligibilityKey: 'all' }
];