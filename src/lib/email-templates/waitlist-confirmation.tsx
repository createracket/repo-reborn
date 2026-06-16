import * as React from 'react'
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
} from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Props {
  email?: string
}

const WaitlistConfirmation = ({ email }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>You're on the Create Racket waitlist 🎉</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>You're in. 🎉</Heading>
        <Text style={text}>
          Nice one{email ? ` — we've added ${email} to the list` : ''}. We'll be
          in touch as soon as access to <strong>Create Racket</strong> opens
          up — keep an eye on your inbox.
        </Text>
        <Text style={text}>
          In the meantime, follow along at{' '}
          <Link href="https://createracket.com" style={link}>
            createracket.com
          </Link>
          .
        </Text>
        <Text style={footer}>
          You're getting this because you joined the waitlist at createracket.com.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: WaitlistConfirmation,
  subject: "You're on the Create Racket waitlist",
  displayName: 'Waitlist confirmation',
  previewData: { email: 'friend@example.com' },
} satisfies TemplateEntry

export default WaitlistConfirmation

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
const link = { color: '#3a8a00', textDecoration: 'underline' }
const footer = {
  fontSize: '12px',
  color: '#888888',
  margin: '32px 0 0',
  lineHeight: '1.5',
}
