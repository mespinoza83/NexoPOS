import { execFileSync } from 'node:child_process';
import { createHash, timingSafeEqual } from 'node:crypto';

const LICENSE_ID_LENGTH = 24;

export function installationIdFor(machineGuid: string) {
  return createHash('sha256')
    .update(machineGuid.trim(), 'utf8')
    .digest('hex')
    .slice(0, LICENSE_ID_LENGTH)
    .toUpperCase();
}

function readWindowsMachineGuid() {
  const output = execFileSync(
    'reg.exe',
    ['query', 'HKLM\\SOFTWARE\\Microsoft\\Cryptography', '/v', 'MachineGuid'],
    { encoding: 'utf8', windowsHide: true },
  );
  const match = output.match(/MachineGuid\s+REG_SZ\s+([^\r\n]+)/i);
  if (!match?.[1]) throw new Error('No se pudo identificar este equipo.');
  return match[1].trim();
}

export function assertInstallationLicense() {
  const licensedId = process.env.NEXOPOS_INSTALLATION_ID?.trim().toUpperCase();
  if (!licensedId) return;
  if (process.platform !== 'win32') {
    throw new Error('La licencia local de NexoPOS solo es válida en Windows.');
  }

  const expectedId = installationIdFor(readWindowsMachineGuid());
  const licensed = Buffer.from(licensedId, 'utf8');
  const expected = Buffer.from(expectedId, 'utf8');
  if (licensed.length !== expected.length || !timingSafeEqual(licensed, expected)) {
    throw new Error('La licencia de NexoPOS no corresponde a este equipo.');
  }
}
