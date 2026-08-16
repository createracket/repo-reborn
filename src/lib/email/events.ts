/**
 * Catalogue of site actions that can send an email.
 * Client-safe: no server imports. The admin Triggers tab renders this list.
 */

export interface EmailEventDef {
  key: string
  label: string
  description: string
  recipient: string
  mergeTags: string[]
  /** Template used historically in code; shown as a suggestion in the picker. */
  suggestedTemplate?: string
}

export const EMAIL_EVENTS: EmailEventDef[] = [
  {
    key: 'contact_submitted',
    label: 'Contact form submitted',
    description: 'Confirmation to the person who sent a contact message.',
    recipient: 'The sender',
    mergeTags: ['name', 'message'],
    suggestedTemplate: 'contact-confirmation',
  },
  {
    key: 'waitlist_joined',
    label: 'Mailing list joined',
    description: 'Confirmation when someone joins the mailing list / waitlist.',
    recipient: 'The subscriber',
    mergeTags: ['email'],
    suggestedTemplate: 'waitlist-confirmation',
  },
  {
    key: 'interest_registered',
    label: 'Interest registered on a brief or spotlight',
    description: 'Confirmation to the person who registered interest.',
    recipient: 'The person registering',
    mergeTags: ['name', 'email', 'page_title', 'link'],
  },
  {
    key: 'interest_registered_admin',
    label: 'Interest registered — admin copy',
    description: 'Heads-up to you when someone registers interest.',
    recipient: 'Admin',
    mergeTags: ['name', 'email', 'page_title', 'note', 'link'],
  },
  {
    key: 'brief_shared',
    label: 'Brief shared to a planner',
    description: 'Sent when a brief is pushed to a user or external email.',
    recipient: 'The person it was shared with',
    mergeTags: ['name', 'page_title', 'link'],
  },
  {
    key: 'roster_shared',
    label: 'Roster shared with a user',
    description: 'Sent when a roster is shared to someone.',
    recipient: 'The person it was shared with',
    mergeTags: ['name', 'page_title', 'link'],
  },
  {
    key: 'report_shared',
    label: 'Campaign report shared',
    description: 'Sent when a campaign report is assigned to a client or brand contact.',
    recipient: 'Client or brand contact',
    mergeTags: ['name', 'page_title', 'link'],
  },
  {
    key: 'listening_report_shared',
    label: 'Listening report shared',
    description: 'Sent when a listening report is pushed to a planner.',
    recipient: 'The person it was shared with',
    mergeTags: ['name', 'page_title', 'link'],
  },
  {
    key: 'access_lead_captured',
    label: 'Access-gated page lead captured',
    description: 'Heads-up to you when someone unlocks a gated roster, report or spotlight.',
    recipient: 'Admin',
    mergeTags: ['email', 'page_title', 'link'],
  },
]

export const EMAIL_EVENT_KEYS = EMAIL_EVENTS.map((e) => e.key)

export function getEmailEvent(key: string): EmailEventDef | undefined {
  return EMAIL_EVENTS.find((e) => e.key === key)
}
