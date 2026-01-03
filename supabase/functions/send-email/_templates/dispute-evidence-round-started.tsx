// @ts-nocheck
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
  Button,
} from "https://esm.sh/@react-email/components@0.0.22?deps=react@18.3.1,react-dom@18.3.1";
import * as React from "https://esm.sh/react@18.3.1";
import {
  main,
  container,
  h1,
  text,
  detailsBox,
  detailsText,
  footer,
  link,
  button,
  buttonContainer,
} from './_shared/styles.ts';

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
            {isFirstRound ? 'Dispute Opened — Evidence Required' : `Round ${round} — Additional Evidence Required`}
          </Heading>
          
          <Text style={text}>Hi {recipientName},</Text>
          
          <Text style={text}>
            {isFirstRound ? (
              <>A dispute has been opened regarding Report <strong>#{reportId}</strong>. Both parties must submit evidence to support their position.</>
            ) : (
              <>Additional information has been requested for Round {round} of the dispute for Report <strong>#{reportId}</strong>.</>
            )}
          </Text>

          <Section style={detailsBox}>
            <Text style={detailsText}><strong>Report ID:</strong> #{reportId}</Text>
            <Text style={detailsText}><strong>Amount:</strong> ${amountOwed.toLocaleString()}</Text>
            <Text style={detailsText}><strong>Project:</strong> {projectName}</Text>
            <Text style={detailsText}><strong>Round:</strong> {round}</Text>
            <Text style={detailsText}><strong>Deadline:</strong> {deadline}</Text>
          </Section>

          <Text style={text}>
            <strong>What you need to submit:</strong>
          </Text>
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

          <Section style={detailsBox}>
            <Text style={detailsText}>
              <strong>Deadline:</strong> {deadline}<br />
              Failure to submit evidence by the deadline may weaken your case.
            </Text>
          </Section>

          <Section style={buttonContainer}>
            <Button href={`https://leakedliability.com/dispute/${disputeId}`} style={button}>
              Submit Evidence
            </Button>
          </Section>

          <Text style={text}>
            All submissions are timestamped and cannot be edited after submission. This ensures an immutable audit trail for legal protection.
          </Text>

          <Text style={footer}>
            Best regards,<br />
            The PSCS Team
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export default DisputeEvidenceRoundStarted;
