import selfsigned from 'selfsigned';
import fs from 'fs';
import os from 'os';

// Get the local IP address
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const interfaceName in interfaces) {
    const addresses = interfaces[interfaceName];
    for (const addr of addresses) {
      if (addr.family === 'IPv4' && !addr.internal) {
        return addr.address;
      }
    }
  }
  return '192.168.1.100'; // fallback
}

const localIP = getLocalIP();
console.log(`Local IP detected: ${localIP}`);

// Certificate attributes
const attrs = [
  { name: 'commonName', value: 'localhost' },
  { name: 'countryName', value: 'US' },
  { shortName: 'ST', value: 'CA' },
  { name: 'localityName', value: 'San Francisco' },
  { name: 'organizationName', value: 'Dev Cert' },
  { shortName: 'OU', value: 'Development' }
];

// Certificate options
const opts = {
  keySize: 2048,
  days: 365,
  algorithm: 'sha256',
  extensions: [
    {
      name: 'basicConstraints',
      cA: true
    },
    {
      name: 'keyUsage',
      keyCertSign: true,
      digitalSignature: true,
      nonRepudiation: true,
      keyEncipherment: true,
      dataEncipherment: true
    },
    {
      name: 'subjectAltName',
      altNames: [
        { type: 2, value: 'localhost' },
        { type: 2, value: '127.0.0.1' },
        { type: 7, ip: '127.0.0.1' },
        { type: 2, value: localIP },
        { type: 7, ip: localIP }
      ]
    }
  ]
};

console.log('Generating SSL certificate...');

// Generate the certificate
const pems = selfsigned.generate(attrs, opts);

// Create certs directory if it doesn't exist
if (!fs.existsSync('certs')) {
  fs.mkdirSync('certs');
}

// Write certificate files
fs.writeFileSync('certs/cert.pem', pems.cert);
fs.writeFileSync('certs/key.pem', pems.private);

console.log('✅ SSL certificates generated successfully!');
console.log('📁 Files created:');
console.log('   - certs/cert.pem (certificate)');
console.log('   - certs/key.pem (private key)');
console.log('');
console.log('🌐 Certificate valid for:');
console.log('   - localhost');
console.log('   - 127.0.0.1');
console.log(`   - ${localIP}`);
console.log('');
console.log('⏰ Certificate expires in 365 days'); 