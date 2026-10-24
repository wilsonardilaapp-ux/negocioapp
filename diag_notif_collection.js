const fs = require('fs');
const content = fs.readFileSync('src/app/(admin)/superadmin/notifications/components/InboxTab.tsx', 'utf8');
const matches = content.match(/collection\([^)]+\)/g);
console.log('Colecciones usadas en InboxTab:', matches);
