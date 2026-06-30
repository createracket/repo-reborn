import * as React from 'react'
import {
  Body,
  Container,
  Head,
  Html,
  Preview,
  Section,
} from '@react-email/components'

interface Props {
  subject: string
  bodyHtml: string
  preview?: string
}

/**
 * Generic shell for admin-authored custom templates.
 * `bodyHtml` MUST be already sanitized HTML produced by render-custom.server.ts.
 * The system appends the unsubscribe footer after this render.
 */
export const CustomEmail = ({ subject, bodyHtml, preview }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{preview || subject}</Preview>
    <Body style={main}>
      <Container style={container}>
        <div
          // bodyHtml is sanitized server-side via DOMPurify before this point.
          dangerouslySetInnerHTML={{ __html: bodyHtml }}
        />

      </Container>
    </Body>
  </Html>
)

export default CustomEmail

const main = {
  backgroundColor: '#ffffff',
  fontFamily: 'Inter, Arial, sans-serif',
  color: '#222222',
}
const container = {
  padding: '32px 28px',
  maxWidth: '560px',
  fontSize: '15px',
  lineHeight: '1.6',
}
