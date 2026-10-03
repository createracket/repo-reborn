import * as React from 'react'
import { Body, Button, Container, Head, Heading, Html, Link, Preview, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Props { creatorName?: string; campaignTitle?: string; platform?: string; postUrl?: string; formUrl?: string; message?: string; copyNote?: string }
const Email = ({ creatorName, campaignTitle, platform, postUrl, formUrl, message, copyNote }: Props) => (
  <Html lang="en"><Head /><Preview>Ad-code request for your live {platform === 'tiktok' ? 'TikTok' : 'Instagram'} post</Preview><Body style={main}><Container style={container}>
    {copyNote && <Text style={note}>{copyNote}</Text>}
    <Heading style={heading}>Ad-code request</Heading><Text>Hi {creatorName || 'there'},</Text>
    {message && <Text style={quote}>{message}</Text>}
    {postUrl && <Text>The post: <Link href={postUrl}>{postUrl}</Link></Text>}
    <Text>{platform === 'tiktok' ? 'Please share the Spark Ads authorisation code for this specific live video and its expiry date.' : 'Please share a partnership-ad code for this specific post, or confirm that you enabled content-level permission for the brand partner to boost it.'}</Text>
    {formUrl && <Button href={formUrl} style={button}>Share ad code</Button>}
    <Text>Thank you — the Racket team</Text>
  </Container></Body></Html>
)
export const template = { component: Email, subject: (d: Record<string, any>) => `${d.copyNote ? '[Copy] ' : ''}Ad-code request — ${d.campaignTitle || 'your Racket campaign'}`, displayName: 'Creator ad-code request', previewData: { creatorName: 'Sam', campaignTitle: 'Tixel', platform: 'tiktok', postUrl: 'https://www.tiktok.com/@sam/video/123', formUrl: 'https://createracket.com/ad-code/example', message: 'Thanks for the post!' } } satisfies TemplateEntry
const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { maxWidth: '560px', padding: '32px 28px' }
const heading = { color: '#111111', fontSize: '26px' }
const note = { backgroundColor: '#f2f2f2', padding: '8px 12px' }
const quote = { backgroundColor: '#fafafa', padding: '12px 16px', whiteSpace: 'pre-wrap' as const }
const button = { backgroundColor: '#b6e34a', color: '#111111', borderRadius: '6px', padding: '12px 22px', textDecoration: 'none' }
