import { build } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import path from 'path';
import fs from 'fs';

async function buildStandalone() {
  console.log('Building standalone single HTML file...');

  const outputDir = path.resolve('dist_standalone');

  await build({
    plugins: [
      react(),
      tailwindcss(),
      viteSingleFile({
        removeOptionalTags: true,
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve('.'),
      },
    },
    build: {
      outDir: outputDir,
      emptyOutDir: true,
      target: 'esnext',
      cssCodeSplit: false,
      inlineDynamicImports: true,
    },
    configFile: false,
  });

  const generatedHtmlPath = path.join(outputDir, 'index.html');
  const targetPublicPath = path.resolve('public', 'DayNight_昼夜簿_单文件本地版.html');

  if (fs.existsSync(generatedHtmlPath)) {
    fs.copyFileSync(generatedHtmlPath, targetPublicPath);
    console.log(`✅ Standalone single HTML file generated successfully: ${targetPublicPath}`);
  } else {
    console.error('Failed to find generated index.html');
  }
}

buildStandalone().catch((err) => {
  console.error('Failed to build standalone:', err);
  process.exit(1);
});
