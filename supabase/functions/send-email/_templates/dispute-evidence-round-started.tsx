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

interface DisputeEvidenceRoundStartedProps {
  recipientName: string;
  recipientRole: 'reporter' | 'producer';
  reportId: string;
  round: number;
  amountOwed: number;
  projectName: string;
  deadline: string;
  disputeId: string;
}

export const DisputeEvidenceRoundStarted = ({
  recipientName,
  recipientRole,
  reportId,
  round,
  amountOwed,
  projectName,
  deadline,
  disputeId,
}: DisputeEvidenceRoundStartedProps) => {
  const isFirstRound = round === 1;
  
  return (
    <Html>
      <Head />
      <Preview>{isFirstRound ? 'Dispute opened - Evidence required' : `Round ${round} evidence required`}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>
            {isFirstRound ? '⚖️ Dispute Opened — Evidence Required' : `⚖️ Round ${round} — Additional Evidence Required`}
          </Heading>
          
          <Text style={text}>Hi {recipientName},</Text>
          
          <Text style={text}>
            {isFirstRound ? (
              <>A dispute has been opened regarding Report <strong>#{reportId}</strong>. Both parties must submit evidence to support their position.</>
            ) : (
              <>Additional information has been requested for Round {round} of the dispute for Report <strong>#{reportId}</strong>.</>
            )}
          </Text>

          <Section style={infoBox}>
            <Text style={infoLabel}>Report Details</Text>
            <Text style={infoText}>
              <strong>Amount:</strong> ${amountOwed.toLocaleString()}<br />
              <strong>Project:</strong> {projectName}<br />
              <strong>Round:</strong> {round}<br />
              <strong>Deadline:</strong> {deadline}
            </Text>
          </Section>

          <Heading style={h2}>What You Need to Submit:</Heading>
          <Text style={text}>
            {recipientRole === 'reporter' ? (
              <>
                • Invoices, call sheets, or contracts<br />
                • Communication logs (emails, texts, DMs)<br />
                • Payment agreements or W-9 documentation<br />
                • Work logs showing dates and services performed<br />
                • Any other evidence supporting your claim
              </>
            ) : (
              <>
                • Payment records or bank statements<br />
                • Communication logs (emails, texts, DMs)<br />
                • Contracts or work agreements<br />
                • Evidence showing payment was made or is not owed<br />
                • Any documentation proving your position
              </>
            )}
          </Text>

          <Section style={warningBox}>
            <Text style={warningText}>
              ⏰ <strong>Deadline: {deadline}</strong><br />
              Failure to submit evidence by the deadline may weaken your case.
            </Text>
          </Section>

          <Link href={`https://leakedliability.com/dispute/${disputeId}`} style={button}>
            Submit Evidence
          </Link>

          <Text style={footer}>
            All submissions are timestamped and cannot be edited after submission.<br />
            This ensures an immutable audit trail for legal protection.
          </Text>

          <Text style={footer}>
            <Link href="https://leakedliability.com" style={link}>
              Leaked Liability™
            </Link>
            <br />
            Transparency in Film Production Payments
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export default DisputeEvidenceRoundStarted;

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

const infoBox = {
  backgroundColor: "#f0f0f0",
  borderRadius: "5px",
  padding: "20px",
  margin: "20px 40px",
};

const infoLabel = {
  color: "#666",
  fontSize: "12px",
  fontWeight: "bold",
  textTransform: "uppercase" as const,
  margin: "0 0 10px 0",
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