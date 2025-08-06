#!/usr/bin/env node

const { build } = require('electron-builder');
const path = require('path');

async function buildWindows() {
    console.log('Building CapsuleOS for Windows...');
    
    try {
        await build({
            targets: {
                win: ['nsis:x64']
            },
            config: {
                appId: 'com.capsuleos.app',
                productName: 'CapsuleOS',
                directories: {
                    output: 'dist'
                },
                files: [
                    'src/**/*',
                    'index.js',
                    'package.json',
                    '!node_modules/electron/dist/**/*'
                ],
                extraMetadata: {
                    main: 'index.js'
                },
                win: {
                    target: 'nsis',
                    artifactName: 'CapsuleOS-${version}-Windows-Setup.${ext}'
                },
                nsis: {
                    oneClick: false,
                    allowToChangeInstallationDirectory: true,
                    createDesktopShortcut: true,
                    createStartMenuShortcut: true
                }
            }
        });
        
        console.log('✓ Windows build completed successfully!');
        console.log('Installer saved to: dist/CapsuleOS-0.0.1-Windows-Setup.exe');
        
    } catch (error) {
        console.error('Build failed:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    buildWindows();
}

module.exports = buildWindows;