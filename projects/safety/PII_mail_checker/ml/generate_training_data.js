const fs = require('fs');
const path = require('path');

// Configurable parameters
const TOTAL_SAMPLES = parseInt(process.argv[2], 10) || 500;
const PII_RATIO = parseFloat(process.argv[3]) || 0.5; // e.g., 0.5 = 50% PII

// PII types and example templates
const piiTypes = [
  {
    type: 'ssn',
    templates: [
      'My SSN is {ssn}',
      'Social security number: {ssn}',
      'SSN: {ssn}',
      'The applicant\'s SSN is {ssn}',
      'Please verify {ssn} as the SSN',
    ],
    generator: () => {
      // Generate a fake SSN
      const part1 = Math.floor(100 + Math.random() * 900);
      const part2 = Math.floor(10 + Math.random() * 90);
      const part3 = Math.floor(1000 + Math.random() * 9000);
      return `${part1}-${part2}-${part3}`;
    }
  },
  {
    type: 'creditCard',
    templates: [
      'Credit card: {cc}',
      'Card number: {cc}',
      'Please charge {cc}',
      'Payment card: {cc}',
      'CC#: {cc}',
    ],
    generator: () => {
      // Generate a fake credit card number
      const parts = [];
      for (let i = 0; i < 4; i++) {
        parts.push(Math.floor(1000 + Math.random() * 9000));
      }
      return parts.join('-');
    }
  },
  {
    type: 'email',
    templates: [
      'Contact: {email}',
      'Email me at {email}',
      'Send info to {email}',
      'Primary email: {email}',
      'Reach out at {email}',
    ],
    generator: () => {
      const names = ['john', 'jane', 'alex', 'maria', 'sam', 'lisa', 'chris', 'pat', 'kim', 'lee'];
      const domains = ['example.com', 'mail.com', 'company.org', 'test.net', 'demo.co'];
      const name = names[Math.floor(Math.random() * names.length)];
      const domain = domains[Math.floor(Math.random() * domains.length)];
      return `${name}.${Math.floor(Math.random()*1000)}@${domain}`;
    }
  },
  {
    type: 'phone',
    templates: [
      'Call me at {phone}',
      'Phone: {phone}',
      'Mobile: {phone}',
      'Contact number: {phone}',
      'Reach me at {phone}',
    ],
    generator: () => {
      // US phone format
      const area = Math.floor(200 + Math.random() * 800);
      const mid = Math.floor(100 + Math.random() * 900);
      const end = Math.floor(1000 + Math.random() * 9000);
      return `${area}-${mid}-${end}`;
    }
  },
  {
    type: 'bankAccount',
    templates: [
      'Account number: {acct}',
      'Bank account: {acct}',
      'Routing number: {acct}',
      'Deposit to {acct}',
      'ABA: {acct}',
    ],
    generator: () => {
      // 8-17 digit account number
      const len = 8 + Math.floor(Math.random() * 10);
      let acct = '';
      for (let i = 0; i < len; i++) {
        acct += Math.floor(Math.random() * 10);
      }
      return acct;
    }
  }
];

// Non-PII templates
const nonPiiTemplates = [
  'The meeting is scheduled for tomorrow',
  'Please review the attached document',
  'The project deadline is next week',
  'We need to discuss the budget',
  'The weather is nice today',
  'Page {num} of the report',
  'Chapter {num} contains important information',
  'Version {ver} of the software',
  'The price is ${price}',
  'Room number {num} on the third floor',
  'The temperature is {temp} degrees',
  'The file size is {size} MB',
  'The meeting starts at {hour} PM',
  'The building has {num} floors',
  'The document is {num} pages long',
  'Lunch is at {hour}:{min}',
  'The code is running as expected',
  'No errors were found in the log',
  'The shipment will arrive on Friday',
  'The color of the car is blue',
  'The book was published in {year}',
  'The event is on {month} {day}',
  'The website loads quickly',
  'The password was updated',
  'The user logged in successfully',
  'The server uptime is {uptime} days',
  'The average score is {score}',
  'The product is out of stock',
  'The customer is satisfied',
  'The order was shipped yesterday',
  'The invoice was paid',
];

function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function fillNonPiiTemplate(template) {
  return template
    .replace('{num}', Math.floor(1 + Math.random() * 200))
    .replace('{ver}', `${Math.floor(1 + Math.random() * 5)}.${Math.floor(Math.random() * 10)}`)
    .replace('{price}', (10 + Math.random() * 990).toFixed(2))
    .replace('{temp}', (50 + Math.random() * 50).toFixed(1))
    .replace('{size}', (0.5 + Math.random() * 9.5).toFixed(1))
    .replace('{hour}', Math.floor(1 + Math.random() * 12))
    .replace('{min}', Math.floor(Math.random() * 60).toString().padStart(2, '0'))
    .replace('{year}', 1990 + Math.floor(Math.random() * 34))
    .replace('{month}', randomFrom(['January','February','March','April','May','June','July','August','September','October','November','December']))
    .replace('{day}', Math.floor(1 + Math.random() * 28))
    .replace('{uptime}', Math.floor(1 + Math.random() * 365))
    .replace('{score}', (50 + Math.random() * 50).toFixed(1));
}

function generateDataset(total, piiRatio) {
  const numPii = Math.round(total * piiRatio);
  const numNonPii = total - numPii;
  const samples = [];
  const labels = [];

  // Generate PII samples
  for (let i = 0; i < numPii; i++) {
    const piiType = randomFrom(piiTypes);
    const template = randomFrom(piiType.templates);
    let value = '';
    switch (piiType.type) {
      case 'ssn': value = piiType.generator(); break;
      case 'creditCard': value = piiType.generator(); break;
      case 'email': value = piiType.generator(); break;
      case 'phone': value = piiType.generator(); break;
      case 'bankAccount': value = piiType.generator(); break;
      default: value = 'UNKNOWN';
    }
    let sample = template
      .replace('{ssn}', value)
      .replace('{cc}', value)
      .replace('{email}', value)
      .replace('{phone}', value)
      .replace('{acct}', value);
    samples.push(sample);
    labels.push(1);
  }

  // Generate non-PII samples
  for (let i = 0; i < numNonPii; i++) {
    const template = randomFrom(nonPiiTemplates);
    samples.push(fillNonPiiTemplate(template));
    labels.push(0);
  }

  // Shuffle
  for (let i = samples.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [samples[i], samples[j]] = [samples[j], samples[i]];
    [labels[i], labels[j]] = [labels[j], labels[i]];
  }

  return { samples, labels };
}

function main() {
  const { samples, labels } = generateDataset(TOTAL_SAMPLES, PII_RATIO);
  const outPath = path.join(__dirname, 'synthetic_training_data.json');
  const data = samples.map((text, i) => ({ text, label: labels[i] }));
  fs.writeFileSync(outPath, JSON.stringify(data, null, 2));
  console.log(`✅ Generated ${TOTAL_SAMPLES} samples (${Math.round(PII_RATIO*100)}% PII)`);
  console.log(`Output: ${outPath}`);
}

if (require.main === module) {
  main();
} 