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
  link,
  button,
  buttonContainer,
} from './_shared/styles.ts';

interface AdminNotificationProps {
  // Common fields
  eventType?: 'submission' | 'search'; // Optional for backwards compatibility
  adminDashboardUrl: string;
  
  // Submission-specific fields
  submissionType?: string;
  userName?: string;
  userEmail?: string;
  details?: string;
  
  // Search-specific fields
  searchTerm?: string;
  source?: string;
  timestamp?: string;
}

export const AdminNotification = ({
  eventType = 'submission', // Default to submission for backwards compatibility
  submissionType,
  userName,
  userEmail,
  details,
  adminDashboardUrl,
  searchTerm,
  source,
  timestamp,
}: AdminNotificationProps) => {
  // Search alert layout
  if (eventType === 'search') {
    return (
      <Html>
        <Head />
        <Preview>🔍 New LL Search: "{searchTerm}" by {userEmail || 'Guest'}</Preview>
        <Body style={main}>
          <Container style={container}>
            <Heading style={h1}>🔍 New Search Alert</Heading>
            <Text style={text}>Someone just searched the leaderboard.</Text>
            <Section style={detailsBox}>
              <Text style={detailsText}><strong>Search Term:</strong> "{searchTerm}"</Text>
              <Text style={detailsText}><strong>Source:</strong> {source || 'Unknown'}</Text>
              <Text style={detailsText}><strong>User:</strong> {userEmail || 'Guest / Anonymous'}</Text>
              <Text style={detailsText}><strong>Time:</strong> {timestamp ? new Date(timestamp).toLocaleString() : 'N/A'}</Text>
            </Section>
            <Section style={buttonContainer}>
              <Link href={adminDashboardUrl} style={button}>
                View Admin Dashboard
              </Link>
            </Section>
            <Text style={footer}>
              PSCS Admin System
            </Text>
          </Container>
        </Body>
      </Html>
    );
  }

  // Default submission alert layout (original behavior)
  return (
    <Html>
      <Head />
      <Preview>New submission requires review - {submissionType}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>New Submission Alert</Heading>
          <Text style={text}>A new {submissionType} has been submitted and requires your review.</Text>
          <Section style={detailsBox}>
            <Text style={detailsText}><strong>Type:</strong> {submissionType}</Text>
            <Text style={detailsText}><strong>Submitted by:</strong> {userName}</Text>
            <Text style={detailsText}><strong>Email:</strong> {userEmail}</Text>
            <Text style={detailsText}><strong>Details:</strong> {details}</Text>
          </Section>
          <Section style={buttonContainer}>
            <Link href={adminDashboardUrl} style={button}>
              Review in Admin Dashboard
            </Link>
          </Section>
          <Text style={footer}>
            Best regards,<br />
            The PSCS Team
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export default AdminNotification;
