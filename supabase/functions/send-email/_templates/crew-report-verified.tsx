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
          <Text style={detailsTitle}>Report Details:</Text>
          <Text style={detailsText}>
            <strong>Report ID:</strong> {reportId}
          </Text>
          <Text style={detailsText}>
            <strong>Producer/Company:</strong> {producerName}
          </Text>
          <Text style={detailsText}>
            <strong>Project:</strong> {projectName}
          </Text>
          <Text style={detailsText}>
            <strong>Amount:</strong> ${(typeof amount === 'number' && isFinite(amount) ? amount : 0).toLocaleString()}
          </Text>
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

        <Hr style={hr} />

        <Text style={footer}>
          Thank you for contributing to a more transparent and accountable industry.
        </Text>
      </Container>
    </Body>
  </Html>
);

export default CrewReportVerified;

const main = {
  backgroundColor: "#f6f9fc",
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "20px 0 48px",
  marginBottom: "64px",
};

const h1 = {
  color: "#16a34a",
  fontSize: "24px",
  fontWeight: "bold",
  margin: "40px 0",
  padding: "0",
  textAlign: "center" as const,
};

const text = {
  color: "#333",
  fontSize: "16px",
  lineHeight: "26px",
  margin: "16px 24px",
};

const detailsBox = {
  backgroundColor: "#f8f9fa",
  border: "1px solid #e1e8ed",
  borderRadius: "8px",
  margin: "24px",
  padding: "20px",
};

const detailsTitle = {
  color: "#333",
  fontSize: "18px",
  fontWeight: "600",
  margin: "0 0 12px 0",
};

const detailsText = {
  color: "#555",
  fontSize: "14px",
  lineHeight: "22px",
  margin: "8px 0",
};

const hr = {
  borderColor: "#e1e8ed",
  margin: "32px 24px",
};

const footer = {
  color: "#8898aa",
  fontSize: "14px",
  lineHeight: "24px",
  margin: "16px 24px",
  textAlign: "center" as const,
};
