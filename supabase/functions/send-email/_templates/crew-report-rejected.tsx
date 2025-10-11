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
} from 'https://esm.sh/@react-email/components@0.0.22';
import * as React from 'https://esm.sh/react@18.3.1';

interface CrewReportRejectedProps {
  reportId: string;
  producerName: string;
  amount: number;
  projectName: string;
  rejectionReason: string;
}

export const CrewReportRejected = ({
  reportId,
  producerName,
  amount,
  projectName,
  rejectionReason,
}: CrewReportRejectedProps) => (
  <Html>
    <Head />
    <Preview>Your payment report needs additional information</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Report Requires More Information</Heading>
        
        <Text style={text}>
          Thank you for submitting your payment report. Unfortunately, we need additional information or clarification before we can verify it.
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
            <strong>Amount:</strong> ${amount.toLocaleString()}
          </Text>
        </Section>

        <Section style={reasonBox}>
          <Text style={reasonTitle}>Reason for Additional Review:</Text>
          <Text style={reasonText}>{rejectionReason}</Text>
        </Section>

        <Text style={text}>
          Please review the reason above and consider resubmitting your report with the necessary corrections or additional documentation.
        </Text>

        <Text style={text}>
          We appreciate your patience and your commitment to creating a more transparent industry. If you have any questions, please don't hesitate to reach out.
        </Text>

        <Hr style={hr} />

        <Text style={footer}>
          Thank you for helping build a better industry for everyone.
        </Text>
      </Container>
    </Body>
  </Html>
);

export default CrewReportRejected;

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
  color: "#ea580c",
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

const reasonBox = {
  backgroundColor: "#fef2f2",
  border: "1px solid #fecaca",
  borderRadius: "8px",
  margin: "24px",
  padding: "20px",
};

const reasonTitle = {
  color: "#991b1b",
  fontSize: "16px",
  fontWeight: "600",
  margin: "0 0 12px 0",
};

const reasonText = {
  color: "#7f1d1d",
  fontSize: "15px",
  lineHeight: "24px",
  margin: "0",
  whiteSpace: "pre-wrap" as const,
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
