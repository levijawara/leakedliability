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

interface DisputeResolvedMutualProps {
  recipientName: string;
  recipientRole: 'reporter' | 'producer' | 'admin';
  reportId: string;
  amountOwed: number;
  projectName: string;
  producerName: string;
  resolutionDate: string;
}

export const DisputeResolvedMutual = ({
  recipientName,
  recipientRole,
  reportId,
  amountOwed,
  projectName,
  producerName,
  resolutionDate,
}: DisputeResolvedMutualProps) => {
  return (
    <Html>
      <Head />
      <Preview>Dispute resolved - Mutual agreement reached</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>
            🤝 Dispute Resolved — Mutual Agreement
          </Heading>
          
          <Text style={text}>Hi {recipientName},</Text>
          
          {recipientRole === 'reporter' && (
            <>
              <Text style={text}>
                The dispute regarding Report <strong>#{reportId}</strong> has been resolved through mutual agreement. Both parties have confirmed that the matter has been settled privately.
              </Text>
              
              <Section style={successBox}>
                <Text style={successText}>
                  🤝 <strong>Resolution Confirmed</strong><br />
                  This dispute has been closed by mutual agreement.
                </Text>
              </Section>
            </>
          )}

          {recipientRole === 'producer' && (
            <>
              <Text style={text}>
                The dispute regarding Report <strong>#{reportId}</strong> has been resolved. Both parties have agreed to settle this matter privately, and the dispute is now closed.
              </Text>
              
              <Section style={successBox}>
                <Text style={successText}>
                  🤝 <strong>Agreement Reached</strong><br />
                  This report has been marked as resolved by mutual agreement.
                </Text>
              </Section>
            </>
          )}

          {recipientRole === 'admin' && (
            <>
              <Text style={text}>
                Dispute for Report <strong>#{reportId}</strong> has been resolved via mutual agreement between both parties.
              </Text>
            </>
          )}

          <Section style={infoBox}>
            <Text style={infoLabel}>Resolution Details</Text>
            <Text style={infoText}>
              <strong>Report:</strong> #{reportId}<br />
              <strong>Producer:</strong> {producerName}<br />
              <strong>Project:</strong> {projectName}<br />
              <strong>Original Amount:</strong> ${amountOwed.toLocaleString()}<br />
              <strong>Resolution Date:</strong> {resolutionDate}<br />
              <strong>Status:</strong> Resolved - Mutual Agreement
            </Text>
          </Section>

          {recipientRole === 'reporter' && (
            <>
              <Heading style={h2}>What This Means:</Heading>
              <Text style={text}>
                • The dispute is now closed<br />
                • The report status has been updated to "RESOLVED"<br />
                • No further action is required from either party<br />
                • This resolution is recorded in LL™'s system for transparency
              </Text>
            </>
          )}

          {recipientRole === 'producer' && (
            <>
              <Heading style={h2}>Impact on Your Record:</Heading>
              <Text style={text}>
                • This mutual resolution is recorded on your profile<br />
                • The dispute is permanently closed<br />
                • Your PSCS score reflects this amicable resolution<br />
                • This demonstrates your willingness to resolve issues fairly
              </Text>
            </>
          )}

          {recipientRole === 'admin' && (
            <>
              <Heading style={h2}>Admin Note:</Heading>
              <Text style={text}>
                Both parties confirmed mutual resolution. The report has been updated to "resolved" status and removed from active disputes. Timeline and evidence remain archived for record-keeping.
              </Text>
            </>
          )}

          {recipientRole !== 'admin' && (
            <Section style={noteBox}>
              <Text style={noteText}>
                ℹ️ <strong>Note:</strong> If either party later disputes this resolution, they may reopen the case through the LL™ admin team with new evidence.
              </Text>
            </Section>
          )}

          <Text style={footer}>
            <Link href="https://leakedliability.com" style={link}>
              Leaked Liability™
            </Link>
            <br />
            Promoting Fair Resolution in Production
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export default DisputeResolvedMutual;

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

const successBox = {
  backgroundColor: "#e8f5e9",
  border: "2px solid #4caf50",
  borderRadius: "5px",
  padding: "20px",
  margin: "20px 40px",
};

const successText = {
  color: "#2e7d32",
  fontSize: "15px",
  lineHeight: "24px",
  margin: "0",
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

const noteBox = {
  backgroundColor: "#e3f2fd",
  border: "1px solid #90caf9",
  borderRadius: "5px",
  padding: "15px",
  margin: "20px 40px",
};

const noteText = {
  color: "#0d47a1",
  fontSize: "13px",
  lineHeight: "20px",
  margin: "0",
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