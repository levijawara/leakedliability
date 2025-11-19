// @ts-nocheck
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Hr,
  Link,
  Preview,
  Section,
  Text,
  Button,
} from 'https://esm.sh/@react-email/components@0.0.22?deps=react@18.3.1,react-dom@18.3.1';
import * as React from 'https://esm.sh/react@18.3.1';

interface LiabilityLoopDetectedProps {
  reportId: string;
  originalName: string;
  amountOwed: number;
  projectName: string;
}

export const LiabilityLoopDetected = ({
  reportId,
  originalName,
  amountOwed,
  projectName,
}: LiabilityLoopDetectedProps) => (
  <Html>
    <Head />
    <Preview>Liability Loop Detected - Report Reverted</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>🔄 Liability Loop Detected</Heading>
        
        <Text style={text}>
          A liability loop has been detected in Report #{reportId}.
        </Text>
        
        <Section style={reportDetailsBox}>
          <Text style={reportDetailLabel}>Report Details</Text>
          <Text style={reportDetail}><strong>Report ID:</strong> {reportId}</Text>
          <Text style={reportDetail}><strong>Amount Owed:</strong> ${amountOwed.toLocaleString()}</Text>
          <Text style={reportDetail}><strong>Project:</strong> {projectName}</Text>
        </Section>
        
        <Hr style={hr} />
        
        <Section style={infoBox}>
          <Text style={infoHeading}>What Happened?</Text>
          <Text style={infoText}>
            The accused parties in this payment report have pointed liability to each other, 
            creating a circular chain. This indicates disputed responsibility for the outstanding payment.
          </Text>
        </Section>
        
        <Section style={resolutionBox}>
          <Text style={resolutionHeading}>⚖️ Resolution</Text>
          <Text style={resolutionText}>
            The debt has been <strong>reverted to the original accused party:</strong>
          </Text>
          <Text style={resolutionName}>{originalName}</Text>
          <Text style={resolutionText}>
            All parties involved have been notified. The report will remain attributed 
            to the original party until payment is made or a formal dispute is resolved.
          </Text>
        </Section>
        
        <Hr style={hr} />
        
        <Section style={ctaSection}>
          <Text style={text}>
            If you believe this determination is incorrect, you may file a formal dispute 
            with supporting documentation.
          </Text>
          
          <Button href="https://leakedliability.com/submit-report" style={primaryButton}>
            Contact Support
          </Button>
        </Section>
        
        <Hr style={hr} />
        
        <Section style={warningBox}>
          <Text style={warningHeading}>⚠️ Important Notice</Text>
          <Text style={warningText}>
            Leaked Liability™ maintains a complete audit trail of all liability redirects, 
            including timestamps, affirmations, and IP addresses. Making false claims may 
            expose you to legal action and account suspension.
          </Text>
        </Section>
        
        <Text style={footer}>
          <Link
            href="https://leakedliability.com"
            target="_blank"
            style={footerLink}
          >
            Leaked Liability™
          </Link>
          <br />
          Transparency in Film & TV Production Payments
        </Text>
      </Container>
    </Body>
  </Html>
);

export default LiabilityLoopDetected;

const main = {
  backgroundColor: '#f6f6f6',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  maxWidth: '600px',
};

const h1 = {
  color: '#1a1a1a',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '40px 0 20px',
  padding: '0 40px',
};

const text = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '16px 40px',
};

const reportDetailsBox = {
  backgroundColor: '#f9f9f9',
  border: '1px solid #e0e0e0',
  borderRadius: '8px',
  margin: '24px 40px',
  padding: '24px',
};

const reportDetailLabel = {
  color: '#666',
  fontSize: '12px',
  fontWeight: 'bold',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
  margin: '0 0 12px 0',
};

const reportDetail = {
  color: '#333',
  fontSize: '14px',
  lineHeight: '24px',
  margin: '8px 0',
};

const hr = {
  borderColor: '#e0e0e0',
  margin: '32px 40px',
};

const infoBox = {
  backgroundColor: '#e3f2fd',
  border: '1px solid #2196f3',
  borderRadius: '8px',
  margin: '24px 40px',
  padding: '24px',
};

const infoHeading = {
  color: '#1976d2',
  fontSize: '16px',
  fontWeight: 'bold',
  margin: '0 0 12px 0',
};

const infoText = {
  color: '#0d47a1',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '0',
};

const resolutionBox = {
  backgroundColor: '#fff3cd',
  border: '1px solid #ffc107',
  borderRadius: '8px',
  margin: '24px 40px',
  padding: '24px',
};

const resolutionHeading = {
  color: '#f57f17',
  fontSize: '16px',
  fontWeight: 'bold',
  margin: '0 0 12px 0',
};

const resolutionText = {
  color: '#856404',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '8px 0',
};

const resolutionName = {
  color: '#1a1a1a',
  fontSize: '18px',
  fontWeight: 'bold',
  margin: '12px 0',
  textAlign: 'center' as const,
};

const ctaSection = {
  margin: '32px 40px',
  textAlign: 'center' as const,
};

const primaryButton = {
  backgroundColor: '#ff4444',
  borderRadius: '6px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '14px 40px',
  margin: '16px 0',
};

const warningBox = {
  backgroundColor: '#ffebee',
  border: '1px solid #ef5350',
  borderRadius: '8px',
  margin: '24px 40px',
  padding: '24px',
};

const warningHeading = {
  color: '#c62828',
  fontSize: '16px',
  fontWeight: 'bold',
  margin: '0 0 12px 0',
};

const warningText = {
  color: '#b71c1c',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '0',
};

const footer = {
  color: '#898989',
  fontSize: '12px',
  lineHeight: '22px',
  margin: '32px 40px 0',
  textAlign: 'center' as const,
};

const footerLink = {
  color: '#ff4444',
  textDecoration: 'underline',
};
