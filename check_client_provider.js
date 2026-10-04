const fs = require('fs');
const content = fs.readFileSync('src/firebase/client-provider.tsx', 'utf8');
console.log(content);
