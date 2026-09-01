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
  reportTitle?: string
  reportUrl?: string
  total?: number
  done?: number
  failed?: number
  failures?: string
  durationLabel?: string
}

const MetricsUpdateComplete = ({
  reportTitle,
  reportUrl,
  total,
  done,
  failed,
  failures,
  durationLabel,
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Metrics update finished for {reportTitle ?? 'your campaign report'}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Metrics updated</Heading>
        <Text style={text}>
          The bulk metrics update for <strong>{reportTitle ?? 'your campaign report'}</strong> has
          finished{durationLabel ? ` in ${durationLabel}` : ''}.
        </Text>
        <Text style={text}>
          {done ?? 0} of {total ?? 0} posts updated{(failed ?? 0) > 0 ? ` · ${failed} failed` : ''}.
        </Text>
        {failures ? <Text style={quote}>{failures}</Text> : null}
        {reportUrl ? (
          <Text style={text}>
            <Link href={reportUrl} style={link}>
              Open the report
            </Link>
          </Text>
        ) : null}
        <Text style={footer}>
          You're getting this because you started a metrics update in the Create Racket admin.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: MetricsUpdateComplete,
  subject: (data: Record<string, any>) =>
    `Metrics updated — ${data?.reportTitle ?? 'campaign report'}`,
  displayName: 'Metrics update complete',
  previewData: {
    reportTitle: 'Tixel Always-On Socials',
    reportUrl: 'https://createracket.com/report/tixel-report',
    total: 54,
    done: 52,
    failed: 2,
    failures: '2 posts failed: No Instagram post returned.',
    durationLabel: '4 minutes',
  },
} satisfies TemplateEntry

export default MetricsUpdateComplete

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
const link = { color: '#111111', textDecoration: 'underline' }
const footer = {
  fontSize: '12px',
  color: '#888888',
  margin: '32px 0 0',
  lineHeight: '1.5',
}
