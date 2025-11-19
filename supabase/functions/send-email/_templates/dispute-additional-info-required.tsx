import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "https://esm.sh/@react-email/components@0.0.22?deps=react@18.3.1,react-dom@18.3.1";
import * as React from "https://esm.sh/react@18.3.1";

interface DisputeAdditionalInfoRequiredProps {
  recipientName: string;
  reportId: string;
  round: number;
  adminRequest: string;
  deadline: string;
  disputeId: string;
}

export const DisputeAdditionalInfoRequired = ({
  recipientName,
  reportId,
  round,
  adminRequest,
  deadline,
  disputeId,
}: DisputeAdditionalInfoRequiredProps) => {
  return (
    <Html>
      <Head />
      <Preview>Additional information required for your dispute</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>
            📋 Additional Information Required
          </Heading>
          
          <Text style={text}>Hi {recipientName},</Text>
          
          <Text style={text}>
            The LL™ admin team has reviewed your evidence for Report <strong>#{reportId}</strong> and requires additional information to proceed.
          </Text>

          <Section style={requestBox}>
            <Text style={requestLabel}>Admin Request:</Text>
            <Text style={requestText}>{adminRequest}</Text>
          </Section>

          <Section style={infoBox}>
            <Text style={infoText}>
              <strong>Report:</strong> #{reportId}<br />
              <strong>Current Round:</strong> {round}<br />
              <strong>Deadline:</strong> {deadline}
            </Text>
          </Section>

          <Heading style={h2}>How to Respond:</Heading>
          <Text style={text}>
            1. Review the admin's request carefully<br />
            2. Gather the requested documentation or information<br />
            3. Submit your response through the dispute portal<br />
            4. Ensure all files are clear and legible
          </Text>

          <Section style={warningBox}>
            <Text style={warningText}>
              ⏰ <strong>Response Deadline: {deadline}</strong><br />
              Failure to respond may result in your case being weakened or closed.
            </Text>
          </Section>

          <Link href={`https://leakedliability.com/dispute/${disputeId}`} style={button}>
            Submit Additional Information
          </Link>

          <Text style={footer}>
            All submissions are timestamped and immutable. This protects both parties and ensures a fair process.
          </Text>

          <Text style={footer}>
            <Link href="https://leakedliability.com" style={link}>
              Leaked Liability™
            </Link>
            <br />
            Fair, Transparent Dispute Resolution
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export default DisputeAdditionalInfoRequired;

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
  color: "#333",
  fontSize: "24px",
  fontWeight: "bold",
  margin: "40px 0 20px",
  padding: "0 40px",
};

const h2 = {
  color: "#333",
  fontSize: "18px",
  fontWeight: "bold",
  margin: "30px 40px 10px",
};

const text = {
  color: "#333",
  fontSize: "16px",
  lineHeight: "26px",
  margin: "16px 40px",
};

const requestBox = {
  backgroundColor: "#e3f2fd",
  border: "2px solid #2196f3",
  borderRadius: "5px",
  padding: "20px",
  margin: "20px 40px",
};

const requestLabel = {
  color: "#1565c0",
  fontSize: "14px",
  fontWeight: "bold",
  textTransform: "uppercase" as const,
  margin: "0 0 10px 0",
};

const requestText = {
  color: "#0d47a1",
  fontSize: "15px",
  lineHeight: "24px",
  margin: "0",
  fontStyle: "italic" as const,
};

const infoBox = {
  backgroundColor: "#f0f0f0",
  borderRadius: "5px",
  padding: "15px",
  margin: "20px 40px",
};

const infoText = {
  color: "#333",
  fontSize: "14px",
  lineHeight: "22px",
  margin: "0",
};

const warningBox = {
  backgroundColor: "#fff3cd",
  border: "1px solid #ffeaa7",
  borderRadius: "5px",
  padding: "15px",
  margin: "20px 40px",
};

const warningText = {
  color: "#856404",
  fontSize: "14px",
  lineHeight: "22px",
  margin: "0",
};

const button = {
  backgroundColor: "#000000",
  borderRadius: "5px",
  color: "#ffffff",
  display: "inline-block",
  fontSize: "16px",
  fontWeight: "bold",
  textDecoration: "none",
  textAlign: "center" as const,
  padding: "12px 40px",
  margin: "20px 40px",
};

const link = {
  color: "#000000",
  textDecoration: "underline",
};

const footer = {
  color: "#8898aa",
  fontSize: "12px",
  lineHeight: "16px",
  margin: "20px 40px",
};