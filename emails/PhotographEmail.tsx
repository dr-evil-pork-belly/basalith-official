import {
  Html, Head, Body, Container,
  Section, Img, Text, Hr,
  Preview, Font,
} from '@react-email/components'

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
}

export function PhotographEmail({
  archiveName,
  photographUrl,
  yearEstimate,
  portalUrl,
}: PhotographEmailProps) {
  return (
    <Html>
      <Head>
        <Font fontFamily="Georgia" fallbackFontFamily="serif" />
      </Head>
      <Preview>
        {archiveName} · {yearEstimate || 'Unknown year'} · Do you know this moment?
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
              What do you remember about this photograph?
            </Text>
            <Text style={{
              fontFamily: 'Georgia, serif',
              fontSize: '15px',
              fontWeight: 300,
              color: '#B8B4AB',
              lineHeight: '1.8',
              margin: 0,
            }}>
              Reply to this email with anything you know — who is in it, when and where it was
              taken, what was happening, what you want the family to remember about this moment.
            </Text>
            <Text style={{
              fontFamily: 'Georgia, serif',
              fontSize: '14px',
              fontStyle: 'italic',
              color: '#706C65',
              margin: '16px 0 0',
              lineHeight: '1.6',
            }}>
              Every reply becomes part of {archiveName} permanently.
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
                Want to do more than reply?
              </Text>
              <a href={portalUrl} style={{
                fontFamily:    'Courier New, monospace',
                fontSize:      '10px',
                letterSpacing: '2px',
                color:         '#C4A24A',
                textDecoration: 'none',
              }}>
                VISIT YOUR CONTRIBUTOR PORTAL →
              </a>
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
              BASALITH · XYZ{'\n'}{archiveName} · Generation I{'\n'}Reply to share your memory
            </Text>
          </Section>

        </Container>
      </Body>
    </Html>
  )
}
