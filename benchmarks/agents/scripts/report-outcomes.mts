import path from 'node:path';
import { createSchedule, readBoundedFile, reportAttempts } from './outcome-v2.mts';

try {
  const [command, input, root, ...extra] = process.argv.slice(2);
  if (command === 'schedule' && input !== undefined && root === undefined && !extra.length) {
    console.log(JSON.stringify(createSchedule(Number(input)), null, 2));
  } else if (command === 'report' && input && root && !extra.length) {
    const bytes = await readBoundedFile(path.dirname(path.resolve(input)), path.basename(input));
    const values: unknown = JSON.parse(bytes.toString('utf8'));
    if (!Array.isArray(values)) throw new Error('Input must be an array of attempts');
    console.log(JSON.stringify(await reportAttempts(values, root), null, 2));
  } else {
    throw new Error('Usage: outcomes schedule <uint32-seed> | outcomes report <attempts.json> <artifact-root>');
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Outcome report failed');
  process.exitCode = 1;
}
