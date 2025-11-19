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

interface AdminNotificationProps {
  submissionType: string;
  userName: string;
  userEmail: string;
  details: string;
  adminDashboardUrl: string;
}

export const AdminNotification = ({
  submissionType,
  userName,
  userEmail,
  details,
  adminDashboardUrl,
}: AdminNotificationProps) => (
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
        <Link href={adminDashboardUrl} style={button}>
          Review in Admin Dashboard
        </Link>
        <Text style={footer}>
          PSCS Admin System
        </Text>
      </Container>
    </Body>
  </Html>
);

const main = { backgroundColor: '#f6f9fc', fontFamily: 'IBM Plex Mono, monospace' };
const container = { paddingLeft: '12px', paddingRight: '12px', margin: '0 auto', paddingTop: '40px', paddingBottom: '40px' };
const h1 = { color: '#333', fontSize: '24px', fontWeight: 'bold', margin: '40px 0 20px', fontFamily: 'IBM Plex Mono, monospace' };
const text = { color: '#333', fontSize: '14px', lineHeight: '24px', fontFamily: 'IBM Plex Mono, monospace' };
const detailsBox = { backgroundColor: '#fff3cd', padding: '20px', borderRadius: '5px', marginTop: '20px', marginBottom: '20px', border: '1px solid #ffc107' };
const detailsText = { color: '#333', fontSize: '14px', lineHeight: '24px', margin: '8px 0', fontFamily: 'IBM Plex Mono, monospace' };
const button = { backgroundColor: '#007bff', color: '#ffffff', padding: '12px 24px', borderRadius: '5px', textDecoration: 'none', display: 'inline-block', marginTop: '20px', fontFamily: 'IBM Plex Mono, monospace' };
const footer = { color: '#8898aa', fontSize: '12px', marginTop: '30px', fontFamily: 'IBM Plex Mono, monospace' };

export default AdminNotification;
