const fs = require('fs');
const { execSync } = require('child_process');
const swaggerSpec = require('../src/config/swagger');

fs.writeFileSync('swagger.json', JSON.stringify(swaggerSpec, null, 2));
console.log('Saved swagger.json');
try {
    execSync('npx openapi-to-postmanv2 -s swagger.json -o postman_collection.json -p "{\\"folderStrategy\\":\\"Tags\\"}"', { stdio: 'inherit' });
    console.log('Updated postman_collection.json successfully.');
} catch (err) {
    console.error('Failed to convert', err);
}
