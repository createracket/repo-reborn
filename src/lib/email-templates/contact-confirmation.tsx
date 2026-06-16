import * as React from 'react'
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Props {
  name?: string
  message?: string
}

const ContactConfirmation = ({ name, message }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>We got your message — thanks for reaching out</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Thanks{name ? `, ${name}` : ''} 👋</Heading>
        <Text style={text}>
          We got your message and someone from the Create Racket team will get
          back to you soon. For reference, here's what you sent:
        </Text>
        {message ? (
          <Text style={quote}>{message}</Text>
        ) : null}
        <Text style={footer}>
          You're getting this because you contacted us via createracket.com.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: ContactConfirmation,
  subject: "We got your message",
  displayName: 'Contact confirmation',
  previewData: {
    name: 'Alex',
    message: 'Hey — love what you\'re building. Can we collab?',
  },
} satisfies TemplateEntry

export default ContactConfirmation

const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, Arial, sans-serif' }
const container = { padding: '32px 28px', maxWidth: '560px' }
const h1 = {
  fontSize: '28px',
  fontWeight: 'bold' as const,
  color: '#111111',
  margin: '0 0 20px',
}
const text = {
  fontSize: '15px',
  color: '#333333',
  lineHeight: '1.6',
  margin: '0 0 16px',
}
const quote = {
  fontSize: '14px',
  color: '#555555',
  lineHeight: '1.6',
  margin: '0 0 24px',
  padding: '12px 16px',
  borderLeft: '3px solid #b6e34a',
  backgroundColor: '#fafafa',
  whiteSpace: 'pre-wrap' as const,
}
const footer = {
  fontSize: '12px',
  color: '#888888',
  margin: '32px 0 0',
  lineHeight: '1.5',
}
