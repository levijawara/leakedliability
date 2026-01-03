// Shared email styling system - matches Welcome Email design
// All templates must use these styles for consistency

export const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: 'IBM Plex Mono, monospace',
};

export const container = {
  paddingLeft: '12px',
  paddingRight: '12px',
  margin: '0 auto',
  paddingTop: '40px',
  paddingBottom: '40px',
};

export const h1 = {
  color: '#333',
  fontSize: '24px',
  fontWeight: 'bold' as const,
  margin: '40px 0 20px',
  fontFamily: 'IBM Plex Mono, monospace',
};

export const text = {
  color: '#333',
  fontSize: '14px',
  lineHeight: '24px',
  fontFamily: 'IBM Plex Mono, monospace',
};

export const detailsBox = {
  backgroundColor: '#f0f0f0',
  padding: '20px',
  borderRadius: '5px',
  marginTop: '20px',
  marginBottom: '20px',
};

export const detailsText = {
  color: '#333',
  fontSize: '14px',
  lineHeight: '24px',
  margin: '8px 0',
  fontFamily: 'IBM Plex Mono, monospace',
};

export const footer = {
  color: '#8898aa',
  fontSize: '12px',
  marginTop: '30px',
  fontFamily: 'IBM Plex Mono, monospace',
};

export const link = {
  color: '#333',
  textDecoration: 'underline' as const,
  fontFamily: 'IBM Plex Mono, monospace',
};

export const button = {
  backgroundColor: '#333',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: 'bold' as const,
  textDecoration: 'none' as const,
  textAlign: 'center' as const,
  display: 'inline-block' as const,
  padding: '12px 24px',
  borderRadius: '5px',
  fontFamily: 'IBM Plex Mono, monospace',
};

export const buttonContainer = {
  margin: '24px 0',
  textAlign: 'center' as const,
};

export const hr = {
  borderColor: '#e1e8ed',
  margin: '32px 0',
};

