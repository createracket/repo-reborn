import * as React from 'react'
import { Body, Button, Container, Head, Heading, Html, Link, Preview, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Props {
  creatorName?: string
  campaignTitle?: string
  postUrl?: string
  formUrl?: string
  message?: string
  fieldsLabel?: string
  copyNote?: string
}

const StatsRequest = ({ creatorName, campaignTitle, postUrl, formUrl, message, fieldsLabel, copyNote }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Could you share the in-app stats for your {campaignTitle ?? 'campaign'} post?</Preview>
    <Body style={main}>
      <Container style={container}>
        {copyNote ? <Text style={note}>{copyNote}</Text> : null}
        <Heading style={h1}>Quick stats request</Heading>
        <Text style={text}>{creatorName ? `Hi ${creatorName},` : 'Hi there,'}</Text>
        {message ? <Text style={quote}>{message}</Text> : null}
        {postUrl ? (
          <Text style={text}>
            The post: <Link href={postUrl} style={link}>{postUrl}</Link>
          </Text>
        ) : null}
        {fieldsLabel ? <Text style={text}>We're looking for: {fieldsLabel}.</Text> : null}
        <Text style={text}>
          It takes a minute — type the numbers in, or just upload a screenshot of your in-app insights.
        </Text>
        {formUrl ? (
          <Button href={formUrl} style={button}>Share my stats</Button>
        ) : null}
        <Text style={footer}>Thanks so much — the Racket team</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: StatsRequest,
  subject: (d: Record<string, any>) =>
    `${d?.copyNote ? '[Copy] ' : ''}Stats request — ${d?.campaignTitle ?? 'your Racket campaign post'}`,
  displayName: 'Creator stats request',
  previewData: {
    creatorName: 'Sam',
    campaignTitle: 'Tixel Always-On Socials',
    postUrl: 'https://www.tiktok.com/@sam/video/123',
    formUrl: 'https://createracket.com/stats/abc123',
    message: 'Loved your post for Tixel! Could you share the in-app insights so we can include them in the client report?',
    fieldsLabel: 'views, accounts reached, watch time',
  },
} satisfies TemplateEntry

export default StatsRequest

const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, Arial, sans-serif' }
const container = { padding: '32px 28px', maxWidth: '560px' }
const h1 = { fontSize: '26px', fontWeight: 'bold' as const, color: '#111111', margin: '0 0 20px' }
const text = { fontSize: '15px', color: '#333333', lineHeight: '1.6', margin: '0 0 16px' }
const quote = { fontSize: '15px', color: '#333333', lineHeight: '1.6', margin: '0 0 20px', padding: '12px 16px', borderLeft: '3px solid #ff4fa3', backgroundColor: '#fafafa', whiteSpace: 'pre-wrap' as const }
const note = { fontSize: '13px', color: '#666666', margin: '0 0 16px', padding: '8px 12px', backgroundColor: '#f2f2f2', borderRadius: '6px' }
const link = { color: '#111111', textDecoration: 'underline', wordBreak: 'break-all' as const }
const button = { backgroundColor: '#b6e34a', color: '#111111', fontWeight: 'bold' as const, fontSize: '15px', padding: '12px 22px', borderRadius: '999px', textDecoration: 'none', display: 'inline-block', margin: '8px 0 8px' }
const footer = { fontSize: '13px', color: '#888888', margin: '28px 0 0' }
