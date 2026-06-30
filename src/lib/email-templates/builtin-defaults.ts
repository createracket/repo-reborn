/**
 * Markdown source for built-in templates, used when an admin opens a
 * built-in in the editor to create/edit a database override.
 * Keep these in rough sync with the React Email components in this folder.
 */
export interface BuiltinDefault {
  display_name: string
  subject: string
  body_markdown: string
  sample_data: Record<string, any>
}

export const BUILTIN_DEFAULTS: Record<string, BuiltinDefault> = {
  'waitlist-confirmation': {
    display_name: 'Waitlist confirmation',
    subject: "You're on the Create Racket waitlist",
    body_markdown: `# You're in. 🎉

Nice one — we've added **{{email}}** to the list. We'll be in touch as soon as access to **Create Racket** opens up — keep an eye on your inbox.

In the meantime, follow along at [createracket.com](https://createracket.com).

---

*You're getting this because you joined the waitlist at createracket.com.*`,
    sample_data: { email: 'friend@example.com' },
  },
  'contact-confirmation': {
    display_name: 'Contact confirmation',
    subject: 'We got your message',
    body_markdown: `# Thanks, {{name}} 👋

We got your message and someone from the Create Racket team will get back to you soon. For reference, here's what you sent:

> {{message}}

---

*You're getting this because you contacted us via createracket.com.*`,
    sample_data: {
      name: 'Alex',
      message: "Hey — love what you're building. Can we collab?",
    },
  },
}
