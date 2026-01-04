// @ts-nocheck
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
  Section,
  Hr,
} from 'https://esm.sh/@react-email/components@0.0.22?deps=react@18.3.1,react-dom@18.3.1';
import * as React from 'https://esm.sh/react@18.3.1';
import {
  main,
  container,
  h1,
  text,
  detailsBox,
  detailsText,
  footer,
} from './_shared/styles.ts';

interface CrewReportVerifiedProps {
  reportId: string;
  producerName: string;
  amount: number;
  projectName: string;
  verificationNotes?: string;
}

export const CrewReportVerified = ({
  reportId,
  producerName,
  amount,
  projectName,
  verificationNotes,
}: CrewReportVerifiedProps) => (
  <Html>
    <Head />
    <Preview>Your payment report has been verified ✓</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Report Verified! ✓</Heading>
        
        <Text style={text}>
          Great news! Your payment report has been verified and is now live on the PSCS leaderboard.
        </Text>

        <Section style={detailsBox}>
          <Text style={detailsText}><strong>Report ID:</strong> {reportId}</Text>
          <Text style={detailsText}><strong>Producer/Company:</strong> {producerName}</Text>
          <Text style={detailsText}><strong>Project:</strong> {projectName}</Text>
          <Text style={detailsText}><strong>Amount:</strong> ${(typeof amount === 'number' && isFinite(amount) ? amount : 0).toLocaleString()}</Text>
          {verificationNotes && (
            <Text style={detailsText}>
              <strong>Admin Notes:</strong> {verificationNotes}
            </Text>
          )}
        </Section>

        <Text style={text}>
          Your report is now visible to the public and contributes to the producer's PSCS score. 
          This helps protect other crew members in the industry.
        </Text>

        <Text style={footer}>
          Thank you for contributing to a more transparent and accountable industry.
        </Text>
      </Container>
    </Body>
  </Html>
);

export default CrewReportVerified;
