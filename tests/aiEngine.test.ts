import { describe, it, expect } from 'vitest';
import { AIEngineService } from '../src/server/services/aiEngine.js';

describe('AI Complaint Processing Engine', () => {
  it('preprocesses text and normalizes tokens', () => {
    const raw = '   Massive   POTHOLE near 100ft   road!!!   ';
    const { cleaned, tokens } = AIEngineService.preprocessText(raw);
    expect(cleaned).toBe('Massive POTHOLE near 100ft road!!!');
    expect(tokens).toContain('massive');
    expect(tokens).toContain('pothole');
    expect(tokens).toContain('100ft');
    expect(tokens).toContain('road');
  });

  it('predicts category accurately for civic grievances', () => {
    // Water
    const water = AIEngineService.predictCategory(
      'Major pipeline burst leaking water',
      'Drinking water gushing out onto the road with zero pressure at home.'
    );
    expect(water.category).toBe('WATER');
    expect(water.confidence).toBeGreaterThan(0.6);

    // Electricity
    const electricity = AIEngineService.predictCategory(
      'Streetlights not working on dark street',
      'The lamp posts are dark and transformer is sparking.'
    );
    expect(electricity.category).toBe('ELECTRICITY');

    // Garbage
    const garbage = AIEngineService.predictCategory(
      'Overflowing garbage dumpster and terrible stench',
      'Rotting trash and food waste spilled on the pavement.'
    );
    expect(garbage.category).toBe('GARBAGE');

    // Roads
    const roads = AIEngineService.predictCategory(
      'Deep pothole on asphalt main road',
      'Crater in the middle of the road causing two wheeler damage.'
    );
    expect(roads.category).toBe('ROADS');

    // Drainage
    const drainage = AIEngineService.predictCategory(
      'Clogged gutter and overflowing sewage',
      'Foul black drain water entering houses after rain.'
    );
    expect(drainage.category).toBe('DRAINAGE');

    // Public Safety
    const safety = AIEngineService.predictCategory(
      'Open borewell pit and structural collapse risk',
      'Hazardous open pit where children play near school.'
    );
    expect(safety.category).toBe('PUBLIC_SAFETY');
  });

  it('detects priority and severity correctly', () => {
    // Critical priority for live electric wire or open borewell
    const critical = AIEngineService.detectPriority(
      'Live wire snapped and dangling outside hospital',
      'Sparks and life threatening danger for pedestrians',
      'PUBLIC_SAFETY'
    );
    expect(critical.priority).toBe('CRITICAL');
    expect(critical.urgencyScore).toBeGreaterThanOrEqual(90);

    // High priority for major water pipeline burst
    const high = AIEngineService.detectPriority(
      'Major pipeline burst on main road',
      'Submerged road and severe water wastage',
      'WATER'
    );
    expect(high.priority).toBe('HIGH');

    // Low priority for cosmetic issues
    const low = AIEngineService.detectPriority(
      'Faded marking on speed breaker',
      'Aesthetic paint request for zebra stripes',
      'ROADS'
    );
    expect(low.priority).toBe('LOW');
  });

  it('recommends correct municipal department based on category', () => {
    expect(AIEngineService.recommendDepartment('ROADS').code).toBe('DEPT_ROADS');
    expect(AIEngineService.recommendDepartment('WATER').code).toBe('DEPT_WATER');
    expect(AIEngineService.recommendDepartment('GARBAGE').code).toBe('DEPT_SANITATION');
    expect(AIEngineService.recommendDepartment('ELECTRICITY').code).toBe('DEPT_POWER');
    expect(AIEngineService.recommendDepartment('DRAINAGE').code).toBe('DEPT_DRAINAGE');
    expect(AIEngineService.recommendDepartment('PUBLIC_SAFETY').code).toBe('DEPT_SAFETY');
  });
});
