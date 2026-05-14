import {
  Html, Head, Body, Container,
  Section, Img, Text, Hr,
  Preview, Font,
} from '@react-email/components'
import { t } from '@/lib/emailTranslations'

interface PhotographEmailProps {
  archiveName:     string
  familyName:      string
  photographUrl:   string
  yearEstimate:    string | null
  subjectContext:  string
  replyAddress:    string
  contributorName: string
  sessionId:       string
  portalUrl?:      string | null
  lang?:           string
  sparkQuestion?:  string | null  // Daily Spark appended below photo
}

export function PhotographEmail({
  archiveName,
  photographUrl,
  yearEstimate,
  portalUrl,
  lang = 'en',
  sparkQuestion,
}: PhotographEmailProps) {
  return (
    <Html>
      <Head>
        <Font fontFamily="Georgia" fallbackFontFamily="serif" />
      </Head>
      <Preview>
        {archiveName} · {yearEstimate || 'Unknown year'} · {t('doYouKnowThisMoment', lang)}
      </Preview>
      <Body style={{ backgroundColor: '#0A0908', fontFamily: 'Georgia, serif', margin: 0, padding: 0 }}>
        <Container style={{ maxWidth: '600px', margin: '0 auto', backgroundColor: '#0A0908' }}>

          <Section style={{ padding: '24px 32px 0', textAlign: 'center' as const }}>
            <Text style={{
              fontFamily: 'Courier New, monospace',
              fontSize: '11px',
              letterSpacing: '3px',
              color: '#C4A24A',
              textTransform: 'uppercase' as const,
              margin: 0,
            }}>
              {archiveName.toUpperCase()}
            </Text>
          </Section>

          <Section style={{ padding: '16px 0' }}>
            <Img
              src={photographUrl}
              alt="Archive photograph"
              width="600"
              style={{ display: 'block', width: '100%', maxWidth: '600px', height: 'auto', objectFit: 'cover' as const }}
            />
          </Section>

          {yearEstimate && (
            <Section style={{ padding: '0 32px', textAlign: 'center' as const }}>
              <Text style={{
                fontFamily: 'Courier New, monospace',
                fontSize: '11px',
                letterSpacing: '2px',
                color: '#706C65',
                margin: '8px 0 0',
              }}>
                {yearEstimate.toUpperCase()}
              </Text>
            </Section>
          )}

          <Section style={{ padding: '16px 32px' }}>
            <Hr style={{ border: 'none', borderTop: '1px solid rgba(196,162,74,0.2)', margin: 0 }} />
          </Section>

          <Section style={{ padding: '0 32px 16px' }}>
            <Text style={{
              fontFamily: 'Georgia, serif',
              fontSize: '18px',
              fontStyle: 'italic',
              color: '#F0EDE6',
              lineHeight: '1.6',
              margin: '0 0 16px',
            }}>
              {t('photoQuestion', lang)}
            </Text>
            <Text style={{
              fontFamily: 'Georgia, serif',
              fontSize: '15px',
              fontWeight: 300,
              color: '#B8B4AB',
              lineHeight: '1.8',
              margin: 0,
            }}>
              {t('photoReplyBody', lang)}
            </Text>
            <Text style={{
              fontFamily: 'Georgia, serif',
              fontSize: '14px',
              fontStyle: 'italic',
              color: '#706C65',
              margin: '16px 0 0',
              lineHeight: '1.6',
            }}>
              {t('photoReplyPermanent', lang)} {archiveName} {t('photoReplyPermanentEnd', lang)}
            </Text>
          </Section>

          {portalUrl && (
            <Section style={{ padding: '0 32px', textAlign: 'center' as const }}>
              <Hr style={{ border: 'none', borderTop: '1px solid rgba(240,237,230,0.06)', margin: '0 0 16px' }} />
              <Text style={{
                fontFamily: 'Georgia, serif',
                fontSize:   '13px',
                fontStyle:  'italic',
                color:      '#3A3830',
                margin:     '0 0 8px',
              }}>
                {t('photoMoreThanReply', lang)}
              </Text>
              <a href={portalUrl} style={{
                fontFamily:    'Courier New, monospace',
                fontSize:      '10px',
                letterSpacing: '2px',
                color:         '#C4A24A',
                textDecoration: 'none',
              }}>
                {t('visitPortal', lang)}
              </a>
            </Section>
          )}

          {sparkQuestion && (
            <Section style={{ padding: '0 32px 8px' }}>
              <Hr style={{ border: 'none', borderTop: '1px solid rgba(196,162,74,0.2)', margin: '0 0 20px' }} />
              <Text style={{
                fontFamily:    'Courier New, monospace',
                fontSize:      '9px',
                letterSpacing: '3px',
                color:         '#C4A24A',
                textTransform: 'uppercase' as const,
                margin:        '0 0 12px',
              }}>
                While You Are Here
              </Text>
              <Text style={{
                fontFamily: 'Georgia, serif',
                fontSize:   '18px',
                fontStyle:  'italic',
                fontWeight: 300,
                color:      '#F0EDE6',
                lineHeight: '1.7',
                margin:     '0 0 20px',
                borderLeft: '3px solid rgba(196,162,74,0.5)',
                paddingLeft:'16px',
              }}>
                {sparkQuestion}
              </Text>
              {portalUrl && (
                <a href={portalUrl} style={{
                  display:        'inline-block',
                  fontFamily:     'Courier New, monospace',
                  fontSize:       '10px',
                  letterSpacing:  '2px',
                  color:          '#0A0908',
                  background:     '#C4A24A',
                  textDecoration: 'none',
                  padding:        '10px 20px',
                }}>
                  Answer This →
                </a>
              )}
            </Section>
          )}

          <Section style={{ padding: '16px 32px 32px' }}>
            <Hr style={{ border: 'none', borderTop: '1px solid rgba(240,237,230,0.06)', margin: '0 0 16px' }} />
            <Text style={{
              fontFamily: 'Courier New, monospace',
              fontSize: '10px',
              letterSpacing: '2px',
              color: '#3A3830',
              margin: 0,
              lineHeight: '1.8',
            }}>
              BASALITH · XYZ{'\n'}{archiveName} · Generation I{'\n'}{t('replyWithMemory', lang)}
            </Text>
          </Section>

        </Container>
      </Body>
    </Html>
  )
}
