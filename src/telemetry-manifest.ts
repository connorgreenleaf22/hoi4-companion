/** Explicit bounded coverage, not a complete campaign inventory. Keep ID order stable per manifest. */
export const telemetryManifest = {
  id: 'ger-m65-1', gameVersion: '1.19.4.2', country: 'GER',
  focuses: ['GER_prioritize_economic_growth', 'GER_the_four_year_plan'],
  technologies: ['infantry_weapons', 'basic_machine_tools', 'construction1'],
} as const;
export const telemetryNumbers = {
  warSupport: {wire:'ws',variable:'has_war_support',unit:'fraction'},
  researchSlots: {wire:'slots',variable:'amount_research_slots',unit:'count'},
  civilianFactories: {wire:'civ',variable:'num_of_civilian_factories',unit:'count'},
  militaryFactories: {wire:'mil',variable:'num_of_military_factories',unit:'count'},
  dockyards: {wire:'dock',variable:'num_of_naval_factories',unit:'count'},
} as const;
export type TelemetryNumber = keyof typeof telemetryNumbers;
