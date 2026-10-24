const fs = require('fs');

console.log('--- NOTIFICATIONS PAGE EXTRACT ---');
if (fs.existsSync('src/app/(admin)/superadmin/notifications/page.tsx')) {
  const content = fs.readFileSync('src/app/(admin)/superadmin/notifications/page.tsx', 'utf8');
  console.log(content.slice(0, 700));
}

console.log('\n--- UPLOAD / CLOUDINARY SEARCH ---');
const files = ['src/services/cloudinary.ts', 'src/lib/cloudinary.ts', 'src/actions/upload.ts'];
for (const f of files) {
  if (fs.existsSync(f)) console.log(`Existe: ${f}`);
}
