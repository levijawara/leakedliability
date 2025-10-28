-- Delete the 10 duplicate error confirmations for Dain August
DELETE FROM payment_confirmations
WHERE id IN (
  '934fe028-d360-4538-81b5-67dd3a967504',
  '1d83f07c-f41e-4c89-b429-987c7e2f4a30',
  '541f6397-6b2e-460e-be99-9781340a61ae',
  '5aa91560-3a01-4c9e-a5d0-4108010349a4',
  'd6d3859a-d82e-41af-b0bf-1cfa97fa917f',
  '34860abc-9521-40e7-9f93-d8215a6915a0',
  '58738186-4fcc-4a16-8feb-e2dc4e06122c',
  '3087dfaf-9e7e-447d-990f-9aeaac2381f8',
  'fae836a6-b5bb-4af4-a440-d6442aeea0ac',
  'bfd1352c-588b-48d5-8854-69425adbc460'
);