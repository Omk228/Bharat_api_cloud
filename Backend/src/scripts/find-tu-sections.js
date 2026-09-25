import fs from 'fs';

const content = fs.readFileSync('frontend/src/routes/_authenticated/dashboard/test-api.tsx', 'utf8');
const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('selectedService === "transunion"') || line.includes('selectedService === \'transunion\'')) {
    console.log(`Line ${idx + 1}: ${line.trim().slice(0, 120)}`);
  }
});
