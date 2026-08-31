import { installationIdFor } from './installation-license';

describe('installationIdFor', () => {
  it('genera un identificador estable y normalizado de 24 caracteres', () => {
    expect(installationIdFor(' equipo-123 ')).toBe(installationIdFor('equipo-123'));
    expect(installationIdFor('equipo-123')).toMatch(/^[A-F0-9]{24}$/);
  });

  it('distingue equipos diferentes', () => {
    expect(installationIdFor('equipo-123')).not.toBe(installationIdFor('equipo-456'));
  });
});
