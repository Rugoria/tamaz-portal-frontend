/**
 * The clinical preferences for aligners, as the Claude Design shows them. Each question is single choice and optional. `key` and the option
 * keys are what the backend stores (ClinicalPreferencesService.QUESTIONS); `label` is the English text, translated where it is shown.
 */
export interface PreferenceQuestion {
  key: string;
  title: string;
  options: { key: string; label: string }[];
  /** "select" shows the options in a drop-down (the bracket "Treatment priority"); the default is a list of radio buttons. */
  kind?: "select";
  /** The option that asks for a height in mm (bracket placement "Customized"); the height is saved under HEIGHT_KEY. */
  askHeightFor?: string;
}

/** Where the "Customized" bracket height is saved (a number in mm, kept with the answers). */
export const HEIGHT_KEY = "bracketPlacementHeight";

export const ALIGNER_QUESTIONS: PreferenceQuestion[] = [
  { key: "passiveAligners", title: "Passive aligners", options: [{ key: "YES", label: "Yes" }, { key: "NO", label: "No" }] },
  { key: "iprFirstSetup", title: "IPR on first virtual setup", options: [{ key: "YES", label: "Yes" }, { key: "NO", label: "No" }] },
  {
    key: "archExpansion",
    title: "Arch expansion",
    options: [
      { key: "CANINES_PREMOLARS_MOLARS", label: "Expand arch width between canines, premolars and molars" },
      { key: "CANINES_PREMOLARS", label: "Expand arch width only between canines and premolars" },
      { key: "PREMOLARS_MOLARS", label: "Expand arch width only between premolars and molars" },
      { key: "NONE", label: "Do not expand arch width, only establish and maintain arch form" },
    ],
  },
  {
    key: "toothSizeDiscrepancy",
    title: "Tooth size discrepancy",
    options: [
      { key: "SPACE_DISTAL_LATERALS", label: "Leave space distal to the laterals" },
      { key: "DISTRIBUTE_AROUND_LATERALS", label: "Distribute spaces equally around laterals" },
      { key: "IPR_OPPOSITE_ARCH", label: "IPR opposite arch" },
    ],
  },
  {
    key: "anteriorRegion",
    title: "Anterior region, facial view",
    options: [
      { key: "LATERALS_HIGHER", label: "Laterals are set 0.5 mm higher than incisors" },
      { key: "LATERALS_EVEN", label: "Laterals are even with incisors" },
      { key: "SMILE_ARC", label: "Smile arc defined by patient images" },
    ],
  },
  {
    key: "occlusion",
    title: "Occlusion",
    options: [
      { key: "OVERJET_1_2", label: "Maxillary incisors and laterals with 1-2 mm overjet" },
      { key: "FULL_CONTACT", label: "Full contact in all front teeth" },
    ],
  },
  {
    key: "trimming",
    title: "Aligners' trimming type",
    options: [
      { key: "STANDARD", label: "Standard (soft and hard tissue border)" },
      { key: "GINGIVAL", label: "Trimming including 2-3 mm of gingival tissue" },
    ],
  },
  {
    key: "attachments",
    title: "Permanent or replaceable attachments",
    options: [
      { key: "PRIMARY_ONLY", label: "Treatment with primary attachments only" },
      { key: "MODIFY", label: "Attachments amount modification during treatment" },
    ],
  },
];

/** The brackets form from Clear Moves' portal (added at the user's request, 2026-10-19). Saved only, like the aligner questions. */
export const BRACKET_QUESTIONS: PreferenceQuestion[] = [
  {
    key: "bracketPlacement",
    title: "Bracket placement methodology",
    askHeightFor: "CUSTOMIZED",
    options: [
      { key: "ANDREWS", label: "Andrews" },
      { key: "PITTS", label: "Pitts" },
      { key: "CUSTOMIZED", label: "Customized (indicate height in mm)" },
      { key: "MBT", label: "MBT" },
      { key: "DAMON", label: "Damon" },
    ],
  },
  {
    key: "treatmentPriority",
    title: "Treatment priority",
    kind: "select",
    options: [
      { key: "REFER_TO_TREATMENT", label: "Refer to treatment" },
      { key: "CLASS_I_ALWAYS", label: "Class I always" },
    ],
  },
  {
    key: "bracketAnteriorRegion",
    title: "Anterior region, facial view",
    options: [
      { key: "LATERALS_EVEN", label: "Laterals are even with incisors" },
      { key: "LATERALS_HIGHER", label: "Laterals are set 0.5 mm higher than incisors" },
      { key: "SMILE_ARC", label: "Smile arc defined by patient images" },
    ],
  },
  {
    key: "bracketIpr",
    title: "Interproximal reduction (IPR)",
    options: [
      { key: "AS_IN_PLAN", label: "IPR amount indicated in the treatment plan" },
      { key: "MAINTAIN_CLASS", label: "IPR to maintain class preference" },
      { key: "NEVER", label: "Never IPR" },
    ],
  },
  {
    key: "interferenceControl",
    title: "Interference control",
    options: [
      { key: "CORRECT_PLAN", label: "Correct plan to minimize interference" },
      { key: "IGNORE", label: "Ignore and attempt to reach the best positioning plan" },
    ],
  },
  {
    key: "overcorrection",
    title: "Overcorrection",
    options: [
      { key: "NONE", label: "No Overcorrection - place brackets in the middle of the tooth" },
      { key: "CUSPIDS_UPPER_LOWER", label: "Overcorrect upper and lower cuspids more mesial to avoid cuspid offset bends" },
      { key: "LOWER_CUSPIDS_LATERALS", label: "Overcorrect lower cuspids and laterals to the mesial regardless of original rotations" },
    ],
  },
  {
    key: "bondingMethod",
    title: "Bonding method",
    options: [
      { key: "CLEAN_ONLY", label: "Clean bonding only - avoid pad adjustment at all costs" },
      { key: "CLEAN_OR_PAD", label: "Clean and/or Pad-Adjusted - produce the best possible Tx plan" },
    ],
  },
];

export const MAX_EXTRA = 1000;

export const TOOTH_NUMBERING: { key: "UNIVERSAL" | "VIOLA" | "PALMER"; label: string }[] = [
  { key: "UNIVERSAL", label: "Universal (American)" },
  { key: "VIOLA", label: "Viola" },
  { key: "PALMER", label: "Palmer" },
];
