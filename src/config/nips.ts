export type NipImportance = 'critical' | 'recommended' | 'optional'

export interface NipDescriptor {
  id: number
  code: string
  label: string
  importance: NipImportance
}

export const KNOWN_NIPS: NipDescriptor[] = [
  {
    id: 1,
    code: 'NIP-01',
    label: 'Basic protocol',
    importance: 'critical',
  },
  {
    id: 11,
    code: 'NIP-11',
    label: 'Relay information document',
    importance: 'critical',
  },
  {
    id: 42,
    code: 'NIP-42',
    label: 'Authentication',
    importance: 'recommended',
  },
  {
    id: 45,
    code: 'NIP-45',
    label: 'COUNT',
    importance: 'critical',
  },
]

