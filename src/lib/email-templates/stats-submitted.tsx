import * as React from 'react'
import { Body, Container, Head, Heading, Html, Link, Preview, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Props {
  creatorName?: string
  campaignTitle?: string
  summary?: string
  screenshots?: number
  builderUrl?: string
}

const StatsSubmitted = ({ creatorName, campaignTitle, summary, screenshots, builderUrl }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{creatorName ?? 'A creator'} shared their stats</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Stats received</Heading>
        <Text style={text}>
          <strong>{creatorName ?? 'A creator'}</strong> shared stats for <strong>{campaignTitle ?? 'a campaign report'}</strong>.
        </Text>
        {summary ? <Text style={quote}>{summary}</Text> : null}
        {screenshots ? <Text style={text}>{screenshots} screenshot{screenshots === 1 ? '' : 's'} attached in the builder.</Text> : null}
        {builderUrl ? (
          <Text style={text}><Link href={builderUrl} style={link}>Review and apply in the report builder</Link></Text>
        ) : null}
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: StatsSubmitted,
  subject: (d: Record<string, any>) => `Stats received — ${d?.creatorName ?? 'creator'} (${d?.campaignTitle ?? 'report'})`,
  displayName: 'Creator stats received',
  to: 'community@createracket.com',
  previewData: { creatorName: 'Sam', campaignTitle: 'Tixel report', summary: 'Views: 12,400\nAccounts reached: 9,100', screenshots: 1, builderUrl: 'https://createracket.com/campaign-reports' },
} satisfies TemplateEntry

export default StatsSubmitted

const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, Arial, sans-serif' }
const container = { padding: '32px 28px', maxWidth: '560px' }
const h1 = { fontSize: '26px', fontWeight: 'bold' as const, color: '#111111', margin: '0 0 20px' }
const text = { fontSize: '15px', color: '#333333', lineHeight: '1.6', margin: '0 0 16px' }
const quote = { fontSize: '14px', color: '#333333', lineHeight: '1.7', margin: '0 0 20px', padding: '12px 16px', borderLeft: '3px solid #b6e34a', backgroundColor: '#fafafa', whiteSpace: 'pre-wrap' as const }
const link = { color: '#111111', textDecoration: 'underline' }
