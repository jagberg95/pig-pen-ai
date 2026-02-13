// Verification script for setup installer
try {
  const { shouldHandleMessage } = require('./openclaw/skills/pigpen');
  console.log('       Pig Pen module loaded successfully.');

  const ok = shouldHandleMessage('Hey Jon, need your help');
  console.log('       Router test: ' + (ok ? 'PASS' : 'FAIL'));

  if (!ok) {
    process.exit(1);
  }
} catch (e) {
  console.log('  ERROR: ' + e.message);
  process.exit(1);
}
