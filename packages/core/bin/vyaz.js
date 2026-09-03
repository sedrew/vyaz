#!/usr/bin/env node

const args = process.argv.slice(2);

if (args.includes('--check') || args.includes('check')) {
  import('../dist/cli/check.js')
    .then(mod => mod.run())
    .catch(err => {
      console.error('Failed to load check module:', err.message);
      process.exit(1);
    });
} else if (args.includes('--help') || args.includes('-h') || args.length === 0) {
  printHelp();
} else {
  printHelp();
  process.exit(1);
}

function printHelp() {
  console.log(`
vyaz CLI — environment diagnostics

Usage:
  vyaz --check     Check environment (napi-rs/canvas, fontkit, fontconfig, pretext)
  vyaz --help      Show this help
`);
}