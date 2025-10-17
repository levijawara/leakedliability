import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from 'https://esm.sh/@react-email/components@0.0.22?deps=react@18.3.1,react-dom@18.3.1';
import * as React from 'https://esm.sh/react@18.3.1';

interface VendorReportRejectedProps {
  vendorCompany: string;
  contactName: string;
  producerName: string;
  projectName: string;
  invoiceNumber: string;
  rejectionReason: string;
}

export const VendorReportRejected = ({
  vendorCompany,
  contactName,
  producerName,
  projectName,
  invoiceNumber,
  rejectionReason,
}: VendorReportRejectedProps) => (
  <Html>
    <Head />
    <Preview>Your vendor report requires additional information</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Vendor Report Requires Additional Information</Heading>
        <Text style={text}>Hi {contactName},</Text>
        <Text style={text}>
          Thank you for submitting your vendor report for {vendorCompany}. 
          After reviewing your submission, we need additional information before we can verify it.
        </Text>
        <Section style={detailsBox}>
          <Text style={detailsText}><strong>Producer/Company:</strong> {producerName}</Text>
          <Text style={detailsText}><strong>Project:</strong> {projectName}</Text>
          <Text style={detailsText}><strong>Invoice #:</strong> {invoiceNumber}</Text>
        </Section>
        <Section style={reasonBox}>
          <Text style={reasonTitle}><strong>Reason for Additional Information Request:</strong></Text>
          <Text style={text}>{rejectionReason}</Text>
        </Section>
        <Text style={text}>
          <strong>What you need to do:</strong>
        </Text>
        <Text style={text}>
          1. Review the reason above<br />
          2. Gather the requested documentation or clarification<br />
          3. Submit a new vendor report with the complete information<br />
          4. Or reply to this email with the additional details
        </Text>
        <Text style={text}>
          <strong>Common reasons for additional information requests:</strong>
        </Text>
        <Text style={text}>
          • Missing or unclear invoice documentation<br />
          • Need purchase order or booking confirmation<br />
          • Contract/agreement terms not provided<br />
          • Dates or amounts don't match across documents<br />
          • Need additional proof of service delivery
        </Text>
        <Text style={text}>
          We understand payment issues are frustrating, and we're here to help create 
          transparency. Providing complete documentation ensures we can verify and publish 
          your report accurately.
        </Text>
        <Text style={text}>
          If you have any questions about what's needed, please reply to this email 
          and we'll guide you through the process.
        </Text>
        <Text style={footer}>
          Best regards,<br />
          The Leaked Liability™ Team
        </Text>
      </Container>
    </Body>
  </Html>
);

const main = { backgroundColor: '#f6f9fc', fontFamily: 'IBM Plex Mono, monospace' };
const container = { paddingLeft: '12px', paddingRight: '12px', margin: '0 auto', paddingTop: '40px', paddingBottom: '40px' };
const h1 = { color: '#d97706', fontSize: '24px', fontWeight: 'bold', margin: '40px 0 20px', fontFamily: 'IBM Plex Mono, monospace' };
const text = { color: '#333', fontSize: '14px', lineHeight: '24px', fontFamily: 'IBM Plex Mono, monospace', marginBottom: '12px' };
const detailsBox = { backgroundColor: '#fef3c7', padding: '20px', borderRadius: '5px', marginTop: '20px', marginBottom: '20px' };
const detailsText = { color: '#333', fontSize: '14px', lineHeight: '24px', margin: '8px 0', fontFamily: 'IBM Plex Mono, monospace' };
const reasonBox = { backgroundColor: '#fee2e2', padding: '20px', borderRadius: '5px', marginTop: '20px', marginBottom: '20px', border: '2px solid #dc2626' };
const reasonTitle = { color: '#991b1b', fontSize: '14px', marginBottom: '12px', fontFamily: 'IBM Plex Mono, monospace' };
const footer = { color: '#8898aa', fontSize: '12px', marginTop: '30px', fontFamily: 'IBM Plex Mono, monospace' };

export default VendorReportRejected;
