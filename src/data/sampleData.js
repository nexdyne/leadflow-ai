import { initialState } from './initialState';

export function getSampleData() {
  return {
    ...initialState,
    projectInfo: {
      propertyAddress: '4217 Maple Avenue',
      city: 'Flint',
      state: 'MI',
      zip: '48503',
      yearBuilt: '1926',
      inspectionDate: '2026-04-11',
      reportDate: '2026-04-11',
      inspectionType: 'Risk Assessment',
      programType: 'HUD',
      inspectorName: 'David Seyaker',
      inspectorCert: 'P-12345',
      inspectorEmail: 'david@example.com',
      companyName: 'Environmental Testing Company',
      companyPhone: '810-555-0123',
      clientName: 'Genesee County Land Bank',
      clientAddress: '432 Main St, Flint, MI 48502',
      clientPhone: '810-555-0100',
      xrfModel: 'Viken Pb200e',
      xrfSerial: '2891'
    },
    xrfData: [
      // Living Room
      { reading: '1', date: '2026-04-11', time: '09:00', room: 'Living Room', component: 'Window Sash', substrate: 'Paint', side: 'A', condition: 'Deteriorated', result: 2.5 },
      { reading: '2', date: '2026-04-11', time: '09:05', room: 'Living Room', component: 'Window Casing', substrate: 'Paint', side: 'B', condition: 'Intact', result: 1.2 },
      { reading: '3', date: '2026-04-11', time: '09:10', room: 'Living Room', component: 'Door Frame', substrate: 'Paint', side: 'A', condition: 'Deteriorated', result: 3.1 },
      { reading: '4', date: '2026-04-11', time: '09:15', room: 'Living Room', component: 'Wall', substrate: 'Paint', side: '', condition: 'Intact', result: 0.8 },

      // Kitchen
      { reading: '5', date: '2026-04-11', time: '09:20', room: 'Kitchen', component: 'Cabinet', substrate: 'Paint', side: 'A', condition: 'Intact', result: 0.6 },
      { reading: '6', date: '2026-04-11', time: '09:25', room: 'Kitchen', component: 'Window Sill', substrate: 'Paint', side: 'A', condition: 'Deteriorated', result: 1.8 },
      { reading: '7', date: '2026-04-11', time: '09:30', room: 'Kitchen', component: 'Door', substrate: 'Paint', side: 'B', condition: 'Intact', result: 0.5 },

      // Bedroom
      { reading: '8', date: '2026-04-11', time: '09:35', room: 'Bedroom 1', component: 'Window Sash', substrate: 'Paint', side: 'A', condition: 'Deteriorated', result: 2.2 },
      { reading: '9', date: '2026-04-11', time: '09:40', room: 'Bedroom 1', component: 'Window Casing', substrate: 'Paint', side: 'B', condition: 'Deteriorated', result: 1.9 },
      { reading: '10', date: '2026-04-11', time: '09:45', room: 'Bedroom 1', component: 'Wall', substrate: 'Paint', side: '', condition: 'Intact', result: 0.4 },

      // Bedroom 2
      { reading: '11', date: '2026-04-11', time: '09:50', room: 'Bedroom 2', component: 'Window Sash', substrate: 'Paint', side: 'A', condition: 'Intact', result: 1.1 },
      { reading: '12', date: '2026-04-11', time: '09:55', room: 'Bedroom 2', component: 'Door', substrate: 'Paint', side: 'A', condition: 'Intact', result: 0.7 },

      // Bathroom
      { reading: '13', date: '2026-04-11', time: '10:00', room: 'Bathroom', component: 'Window', substrate: 'Paint', side: 'A', condition: 'Intact', result: 0.9 },
      { reading: '14', date: '2026-04-11', time: '10:05', room: 'Bathroom', component: 'Door', substrate: 'Paint', side: 'B', condition: 'Intact', result: 0.3 },

      // Stairwell
      { reading: '15', date: '2026-04-11', time: '10:10', room: 'Stairwell', component: 'Banister Rail', substrate: 'Paint', side: 'A', condition: 'Deteriorated', result: 1.5 },
      { reading: '16', date: '2026-04-11', time: '10:15', room: 'Stairwell', component: 'Wall', substrate: 'Paint', side: '', condition: 'Intact', result: 0.6 },

      // Basement
      { reading: '17', date: '2026-04-11', time: '10:20', room: 'Basement', component: 'Window', substrate: 'Paint', side: 'A', condition: 'Deteriorated', result: 1.3 },
      { reading: '18', date: '2026-04-11', time: '10:25', room: 'Basement', component: 'Concrete', substrate: 'Paint', side: '', condition: 'Intact', result: 0.2 },

      // Exterior
      { reading: '19', date: '2026-04-11', time: '10:30', room: 'Exterior - Front', component: 'Porch Rail', substrate: 'Paint', side: 'A', condition: 'Deteriorated', result: 2.7 },
      { reading: '20', date: '2026-04-11', time: '10:35', room: 'Exterior - Front', component: 'Porch Floor', substrate: 'Paint', side: '', condition: 'Deteriorated', result: 1.6 },
      { reading: '21', date: '2026-04-11', time: '10:40', room: 'Exterior - Front', component: 'Door Frame', substrate: 'Paint', side: 'B', condition: 'Deteriorated', result: 2.9 },
      { reading: '22', date: '2026-04-11', time: '10:45', room: 'Exterior - Side', component: 'Siding', substrate: 'Paint', side: '', condition: 'Intact', result: 0.5 },
      { reading: '23', date: '2026-04-11', time: '10:50', room: 'Exterior - Side', component: 'Window', substrate: 'Paint', side: 'A', condition: 'Deteriorated', result: 1.4 },
      { reading: '24', date: '2026-04-11', time: '10:55', room: 'Exterior - Back', component: 'Door', substrate: 'Paint', side: 'A', condition: 'Intact', result: 0.8 },
    ],
    dustWipeSamples: [
      { sampleId: 'D-001', location: 'Living Room Floor', surfaceType: 'Hard Floor', result: 15.2 },
      { sampleId: 'D-002', location: 'Kitchen Floor', surfaceType: 'Hard Floor', result: 8.5 },
      { sampleId: 'D-003', location: 'Living Room Window Sill', surfaceType: 'Sill/Stool', result: 125.7 },
      { sampleId: 'D-004', location: 'Kitchen Window Sill', surfaceType: 'Sill/Stool', result: 85.2 },
      { sampleId: 'D-005', location: 'Living Room Window Trough', surfaceType: 'Trough', result: 160.3 },
      { sampleId: 'D-006', location: 'Bedroom 1 Floor', surfaceType: 'Hard Floor', result: 12.1 },
      { sampleId: 'D-007', location: 'Front Porch Floor', surfaceType: 'Porch Floor', result: 55.8 },
      { sampleId: 'D-008', location: 'Basement Floor', surfaceType: 'Hard Floor', result: 9.3 },
    ],
    soilSamples: [
      { sampleId: 'S-001', location: 'Front Yard - Play Area', areaType: 'Play Area', area: '400', result: 520 },
      { sampleId: 'S-002', location: 'Side Yard - Dripline', areaType: 'Dripline', area: '200', result: 180 },
      { sampleId: 'S-003', location: 'Back Yard', areaType: 'Rest of Yard', area: '600', result: 1450 },
      { sampleId: 'S-004', location: 'Garden Area', areaType: 'Rest of Yard', area: '300', result: 850 },
    ],
    labName: 'Advanced Environmental Lab',
    labCertNumber: 'MICH-EL-2024-001'
  };
}
