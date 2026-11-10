import fs from 'fs';
import path from 'path';

const htmlPath = path.resolve('dist_standalone', 'index.html');
const targetTsPath = path.resolve('src', 'utils', 'standaloneHtml.ts');

if (!fs.existsSync(htmlPath)) {
  console.error('dist_standalone/index.html does not exist. Please run build-standalone.js first.');
  process.exit(1);
}

const htmlContent = fs.readFileSync(htmlPath, 'utf-8');

// Escape backslashes and backticks for a valid TS template literal
const escaped = htmlContent
  .replace(/\\/g, '\\\\')
  .replace(/`/g, '\\`')
  .replace(/\${/g, '\\${');

const tsContent = `/**
 * Pre-compiled standalone single-file HTML application bundle.
 * Generated automatically. Allows 100% client-side Blob download without cross-origin HTTP auth block.
 */
export const STANDALONE_HTML = \`${escaped}\`;
`;

fs.writeFileSync(targetTsPath, tsContent, 'utf-8');
console.log(`✅ Successfully generated src/utils/standaloneHtml.ts (${(tsContent.length / 1024 / 1024).toFixed(2)} MB)`);
