const fs = require('fs');

const inbox = fs.readFileSync('src/app/(admin)/superadmin/notifications/components/InboxTab.tsx', 'utf8');
const lines = inbox.split('\n').slice(15, 35).join('\n');
console.log('--- COLECCIÓN EN INBOXTAB ---');
console.log(lines);

if (fs.existsSync('src/ai/flows/upload-media-flow.ts')) {
  console.log('\n--- UPLOAD MEDIA FLOW ---');
  console.log(fs.readFileSync('src/ai/flows/upload-media-flow.ts', 'utf8').slice(0, 500));
}
