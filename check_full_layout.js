const fs = require('fs');
const content = fs.readFileSync('src/app/(dashboard)/layout.tsx', 'utf8');
const lines = content.split('\n');
const startIdx = lines.findIndex(l => l.includes('export default function DashboardLayout'));
lines.slice(startIdx, startIdx + 85).forEach((l, i) => console.log(`L${startIdx + i + 1}: ${l}`));
