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
} from './_shared/styles.ts';

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
            Dispute Resolved — Mutual Agreement
          </Heading>
          
          <Text style={text}>Hi {recipientName},</Text>
          
          {recipientRole === 'reporter' && (
            <>
              <Text style={text}>
                The dispute regarding Report <strong>#{reportId}</strong> has been resolved through mutual agreement. Both parties have confirmed that the matter has been settled privately.
              </Text>
              
              <Section style={detailsBox}>
                <Text style={detailsText}><strong>Report ID:</strong> #{reportId}</Text>
                <Text style={detailsText}><strong>Producer:</strong> {producerName}</Text>
                <Text style={detailsText}><strong>Project:</strong> {projectName}</Text>
                <Text style={detailsText}><strong>Original Amount:</strong> ${amountOwed.toLocaleString()}</Text>
                <Text style={detailsText}><strong>Resolution Date:</strong> {resolutionDate}</Text>
                <Text style={detailsText}><strong>Status:</strong> Resolved - Mutual Agreement</Text>
              </Section>

              <Text style={text}>
                <strong>What this means:</strong>
              </Text>
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
              <Text style={text}>
                The dispute regarding Report <strong>#{reportId}</strong> has been resolved. Both parties have agreed to settle this matter privately, and the dispute is now closed.
              </Text>
              
              <Section style={detailsBox}>
                <Text style={detailsText}><strong>Report ID:</strong> #{reportId}</Text>
                <Text style={detailsText}><strong>Producer:</strong> {producerName}</Text>
                <Text style={detailsText}><strong>Project:</strong> {projectName}</Text>
                <Text style={detailsText}><strong>Original Amount:</strong> ${amountOwed.toLocaleString()}</Text>
                <Text style={detailsText}><strong>Resolution Date:</strong> {resolutionDate}</Text>
                <Text style={detailsText}><strong>Status:</strong> Resolved - Mutual Agreement</Text>
              </Section>

              <Text style={text}>
                <strong>Impact on your record:</strong>
              </Text>
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
              <Text style={text}>
                Dispute for Report <strong>#{reportId}</strong> has been resolved via mutual agreement between both parties.
              </Text>
              <Section style={detailsBox}>
                <Text style={detailsText}><strong>Report ID:</strong> #{reportId}</Text>
                <Text style={detailsText}><strong>Producer:</strong> {producerName}</Text>
                <Text style={detailsText}><strong>Project:</strong> {projectName}</Text>
                <Text style={detailsText}><strong>Original Amount:</strong> ${amountOwed.toLocaleString()}</Text>
                <Text style={detailsText}><strong>Resolution Date:</strong> {resolutionDate}</Text>
                <Text style={detailsText}><strong>Status:</strong> Resolved - Mutual Agreement</Text>
              </Section>
              <Text style={text}>
                Both parties confirmed mutual resolution. The report has been updated to "resolved" status and removed from active disputes. Timeline and evidence remain archived for record-keeping.
              </Text>
            </>
          )}

          {recipientRole !== 'admin' && (
            <Text style={text}>
              <strong>Note:</strong> If either party later disputes this resolution, they may reopen the case through the LL™ admin team with new evidence.
            </Text>
          )}

          <Text style={footer}>
            Best regards,<br />
            The PSCS Team
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export default DisputeResolvedMutual;
