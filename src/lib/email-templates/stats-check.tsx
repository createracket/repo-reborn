import * as React from 'react'
import { Body, Button, Container, Head, Heading, Html, Link, Preview, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Props {
  creatorName?: string
  campaignTitle?: string
  postUrl?: string
  formUrl?: string
  message?: string
  statsSummary?: string
  copyNote?: string
}

const StatsCheck = ({ creatorName, campaignTitle, postUrl, formUrl, message, statsSummary, copyNote }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Can you confirm the stats for your {campaignTitle ?? 'campaign'} post?</Preview>
    <Body style={main}>
      <Container style={container}>
        {copyNote ? <Text style={note}>{copyNote}</Text> : null}
        <Heading style={h1}>A quick check on your stats</Heading>
        <Text style={text}>{creatorName ? `Hi ${creatorName},` : 'Hi there,'}</Text>
        {message ? <Text style={text}>{message}</Text> : null}
        {postUrl ? <Text style={text}>Your post: <Link href={postUrl} style={link}>{postUrl}</Link></Text> : null}
        {statsSummary ? <Text style={summary}>{statsSummary}</Text> : null}
        <Text style={text}>If anything needs correcting, you can update your response using the same link below. You can also reply to this email.</Text>
        {formUrl ? <Button href={formUrl} style={button}>Check or update my stats</Button> : null}
        <Text style={footer}>Thanks so much — the Racket team</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: StatsCheck,
  subject: (d: Record<string, any>) => `${d?.copyNote ? '[Copy] ' : ''}Please check your stats — ${d?.campaignTitle ?? 'your Racket campaign post'}`,
  displayName: 'Creator stats check',
  previewData: {
    creatorName: 'Sam',
    campaignTitle: 'Tixel Always-On Socials',
    postUrl: 'https://www.tiktok.com/@sam/video/123',
    formUrl: 'https://createracket.com/stats/abc123',
    message: 'Thanks for sharing your insights. Could you check these numbers are correct before we add them to the report?',
    statsSummary: 'Views / plays: 12,400\nAccounts reached: 9,100',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, Arial, sans-serif' }
const container = { padding: '32px 28px', maxWidth: '560px' }
const h1 = { fontSize: '26px', fontWeight: 'bold' as const, color: '#111111', margin: '0 0 20px' }
const text = { fontSize: '15px', color: '#333333', lineHeight: '1.6', margin: '0 0 16px' }
const summary = { fontSize: '15px', color: '#333333', lineHeight: '1.6', margin: '0 0 20px', padding: '12px 16px', borderLeft: '3px solid #ff4fa3', backgroundColor: '#fafafa', whiteSpace: 'pre-wrap' as const }
const note = { fontSize: '13px', color: '#666666', margin: '0 0 16px', padding: '8px 12px', backgroundColor: '#f2f2f2', borderRadius: '6px' }
const link = { color: '#111111', textDecoration: 'underline', wordBreak: 'break-all' as const }
const button = { backgroundColor: '#b6e34a', color: '#111111', fontWeight: 'bold' as const, fontSize: '15px', padding: '12px 22px', borderRadius: '999px', textDecoration: 'none', display: 'inline-block', margin: '8px 0 8px' }
const footer = { fontSize: '13px', color: '#888888', margin: '28px 0 0' }