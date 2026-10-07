let sequence = 0;

export function doctorInput(overrides: Record<string, unknown> = {}) {
  sequence += 1;
  return {
    name: `Dr. Test ${sequence}`,
    specialization: 'Cardiology',
    hospital: 'City General',
    phone: `+1 555 010${sequence % 10}`,
    email: `doctor${sequence}@example.com`,
    ...overrides,
  };
}

export function patientInput(overrides: Record<string, unknown> = {}) {
  sequence += 1;
  return {
    name: `Patient ${sequence}`,
    age: 40,
    gender: 'female',
    phone: `+1 555 020${sequence % 10}`,
    condition: 'diabetes',
    status: 'admitted',
    admissionDate: '2026-01-15',
    ...overrides,
  };
}
