import bcrypt from 'bcryptjs';
import { db, runInTransaction } from './index.js';
import { AIEngineService } from '../services/aiEngine.js';

export async function seedDatabase() {
  console.log('--- Starting SmartGov Connect AI Database Seeding ---');

  const salt = await bcrypt.genSalt(10);
  const adminHash = await bcrypt.hash('Admin@12345', salt);
  const citizenHash = await bcrypt.hash('Citizen@12345', salt);
  const now = new Date();

  const getDate = (offsetHoursAgo: number) => {
    return new Date(now.getTime() - offsetHoursAgo * 60 * 60 * 1000).toISOString();
  };

  runInTransaction(() => {
    // Clear existing tables in correct order
    db.exec(`
      DELETE FROM audit_logs;
      DELETE FROM notifications;
      DELETE FROM complaint_status_history;
      DELETE FROM complaint_analyses;
      DELETE FROM complaints;
      DELETE FROM master_issues;
      DELETE FROM departments;
      DELETE FROM security_events;
      DELETE FROM users;
      DELETE FROM system_settings;
    `);

    // 1. Seed Users
    const insertUser = db.prepare(`
      INSERT INTO users (id, phone, name, email, password_hash, role, status, created_at, updated_at, last_login_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // Admin
    insertUser.run(
      'USR-ADMIN-001',
      '+919876543210',
      'Chief Grievance Administrator',
      'admin@smartgov.local',
      adminHash,
      'ADMIN',
      'ACTIVE',
      getDate(720),
      getDate(1),
      getDate(1)
    );

    // Primary Demo Citizen (Priya Sharma)
    insertUser.run(
      'USR-CITIZEN-001',
      '+919876543211',
      'Priya Sharma',
      'priya.sharma@example.com',
      citizenHash,
      'CITIZEN',
      'ACTIVE',
      getDate(360),
      getDate(2),
      getDate(2)
    );

    // Additional fictional citizens
    const citizens = [
      { id: 'USR-CITIZEN-002', phone: '+919876543212', name: 'Rahul Verma', email: 'rahul.verma@example.com' },
      { id: 'USR-CITIZEN-003', phone: '+919876543213', name: 'Ananya Rao', email: 'ananya.rao@example.com' },
      { id: 'USR-CITIZEN-004', phone: '+919876543214', name: 'Vikram Patel', email: 'vikram.patel@example.com' },
      { id: 'USR-CITIZEN-005', phone: '+919876543215', name: 'Sunita Reddy', email: 'sunita.reddy@example.com' },
    ];

    for (const c of citizens) {
      insertUser.run(c.id, c.phone, c.name, c.email, citizenHash, 'CITIZEN', 'ACTIVE', getDate(200), getDate(5), getDate(5));
    }

    // 2. Seed Departments
    const insertDept = db.prepare(`
      INSERT INTO departments (id, code, name, description, categories_json, head_name, contact_email, contact_phone, active, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
    `);

    const departments = [
      {
        id: 'DEPT-ROADS',
        code: 'DEPT_ROADS',
        name: 'Public Works & Roads Department (PWD)',
        desc: 'Responsible for arterial roads, pothole repairs, bridges, flyovers, and pedestrian footpaths.',
        categories: ['ROADS'],
        head: 'Er. R. K. Nambiar (Chief Engineer - Roads)',
        email: 'pwd.roads@smartgov.local',
        phone: '+91 80 2297 5001'
      },
      {
        id: 'DEPT-WATER',
        code: 'DEPT_WATER',
        name: 'Water Supply & Sewerage Board (BWSSB)',
        desc: 'Operates drinking water distribution pipelines, reservoir maintenance, and major leak repairs.',
        categories: ['WATER'],
        head: 'Smt. Deepa Sundaram (Executive Engineer)',
        email: 'bwssb.water@smartgov.local',
        phone: '+91 80 2297 5002'
      },
      {
        id: 'DEPT-SANITATION',
        code: 'DEPT_SANITATION',
        name: 'Solid Waste Management & Sanitation Dept',
        desc: 'Daily doorstep garbage collection, commercial waste clearance, and community sanitation bins.',
        categories: ['GARBAGE'],
        head: 'Dr. Mohan Kumar (Joint Commissioner SWM)',
        email: 'sanitation@smartgov.local',
        phone: '+91 80 2297 5003'
      },
      {
        id: 'DEPT-POWER',
        code: 'DEPT_POWER',
        name: 'Electricity Supply & Streetlight Authority (BESCOM)',
        desc: 'Maintains low and high-voltage transmission lines, transformers, and public streetlight infrastructure.',
        categories: ['ELECTRICITY'],
        head: 'Er. Arvind Swamy (Superintending Engineer)',
        email: 'power.streetlights@smartgov.local',
        phone: '+91 80 2297 5004'
      },
      {
        id: 'DEPT-DRAINAGE',
        code: 'DEPT_DRAINAGE',
        name: 'Stormwater & Underground Drainage Cell',
        desc: 'Stormwater drain desilting, culvert maintenance, and flood mitigation canals.',
        categories: ['DRAINAGE'],
        head: 'Er. V. Chandrasekhar (Chief Hydrologist)',
        email: 'drainage.flood@smartgov.local',
        phone: '+91 80 2297 5005'
      },
      {
        id: 'DEPT-SAFETY',
        code: 'DEPT_SAFETY',
        name: 'Disaster Management & Public Safety Cell',
        desc: 'Emergency structural risk management, tree fall clearance, hazard perimeter cordoning.',
        categories: ['PUBLIC_SAFETY', 'OTHER'],
        head: 'Col. (Retd.) Sanjeev Hegde (Director Disaster Cell)',
        email: 'safety.emergency@smartgov.local',
        phone: '+91 80 2297 5006'
      }
    ];

    for (const d of departments) {
      insertDept.run(d.id, d.code, d.name, d.desc, JSON.stringify(d.categories), d.head, d.email, d.phone, getDate(700));
    }

    // 3. Seed Master Issues
    const insertMI = db.prepare(`
      INSERT INTO master_issues (id, title, description, category, priority, status, locality, city, state, complaint_count, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertMI.run(
      'MI-2026-0001',
      '100 Feet Road Indiranagar Underground Pipeline Rupture & Road Inundation',
      'Major 600mm potable water transmission line ruptured underneath 100 Feet Road near 12th Main junction, causing extensive road sinkage, localized waterlogging, and pressure loss across Indiranagar 2nd Stage.',
      'WATER',
      'CRITICAL',
      'IN_PROGRESS',
      'Indiranagar',
      'Bengaluru',
      'Karnataka',
      3,
      getDate(72),
      getDate(4)
    );

    insertMI.run(
      'MI-2026-0002',
      'Koramangala 4th Block Market Waste Accumulation & Drain Blockage',
      'Overflowing community dumpster combined with illegal dumping of commercial packaging and green waste blocking rainwater entry grates along 80 Feet Road.',
      'GARBAGE',
      'HIGH',
      'INVESTIGATING',
      'Koramangala',
      'Bengaluru',
      'Karnataka',
      2,
      getDate(48),
      getDate(6)
    );

    // 4. Seed 14 Diverse Complaints (at least 12 required by prompt)
    const seedComplaints = [
      // Connected to Master Issue 1 (Indiranagar Pipeline)
      {
        id: 'SGC-2026-00001',
        citizenId: 'USR-CITIZEN-001',
        title: 'Massive water leak flooded 100 Feet Road junction near 12th Main',
        description: 'Potable water is gushing out like a fountain from beneath the tarmac since morning. The entire junction is submerged and two-wheelers are skidding. Urgent repair needed before the road caves in.',
        category: 'WATER',
        priority: 'CRITICAL',
        status: 'IN_PROGRESS',
        locality: 'Indiranagar',
        address: '100 Feet Road, opposite Metro Pillar 42, 12th Main Junction',
        deptId: 'DEPT-WATER',
        masterIssueId: 'MI-2026-0001',
        createdHours: 72,
        remarks: 'BWSSB emergency maintenance squad deployed with dewatering pumps. Excavation underway to isolate pipeline valve.',
      },
      {
        id: 'SGC-2026-00002',
        citizenId: 'USR-CITIZEN-002',
        title: 'Road sinking and crater formed due to underground water gush',
        description: 'Deep road cave in formed right next to the water pipe rupture on 100 Feet Road Indiranagar. Traffic is backed up for 2 kilometers.',
        category: 'ROADS',
        priority: 'CRITICAL',
        status: 'ASSIGNED',
        locality: 'Indiranagar',
        address: 'Near 100 Feet Road, 12th Main Crossing',
        deptId: 'DEPT-ROADS',
        masterIssueId: 'MI-2026-0001',
        createdHours: 65,
        remarks: 'Joint site inspection coordinated between PWD and BWSSB. Barricades placed around sunken patch.',
      },
      {
        id: 'SGC-2026-00003',
        citizenId: 'USR-CITIZEN-003',
        title: 'Zero tap water pressure in residential houses near 100 Feet Road',
        description: 'No municipal water supply since yesterday evening in Indiranagar 2nd Stage. It seems the main pipeline burst on 100 Feet road has cut off our line.',
        category: 'WATER',
        priority: 'HIGH',
        status: 'IN_PROGRESS',
        locality: 'Indiranagar',
        address: 'House #442, 9th Cross, Indiranagar 2nd Stage',
        deptId: 'DEPT-WATER',
        masterIssueId: 'MI-2026-0001',
        createdHours: 40,
        remarks: 'Secondary bypass feed activated. Water tankers dispatched to affected residential lanes.',
      },

      // Connected to Master Issue 2 (Koramangala Sanitation)
      {
        id: 'SGC-2026-00004',
        citizenId: 'USR-CITIZEN-004',
        title: 'Severe garbage accumulation and unhygienic waste dump on 80ft Road',
        description: 'The community garbage bins at 4th Block Koramangala market have not been cleared for four days. Rotten food waste is spilled all over the street with unbearable stench.',
        category: 'GARBAGE',
        priority: 'HIGH',
        status: 'UNDER_REVIEW',
        locality: 'Koramangala',
        address: '80 Feet Road, near 4th Block Vegetable Market',
        deptId: 'DEPT-SANITATION',
        masterIssueId: 'MI-2026-0002',
        createdHours: 48,
        remarks: 'Under review by SWM Health Inspector. Additional compactors requested.',
      },
      {
        id: 'SGC-2026-00005',
        citizenId: 'USR-CITIZEN-005',
        title: 'Rainwater drain choked with plastic waste near market corner',
        description: 'Plastic sacks and waste debris from the overflowing dumpster have washed into the stormwater drain grate, completely clogging the water flow.',
        category: 'DRAINAGE',
        priority: 'HIGH',
        status: 'SUBMITTED',
        locality: 'Koramangala',
        address: 'Corner of 4th Block Main Road, near market',
        deptId: 'DEPT-DRAINAGE',
        masterIssueId: 'MI-2026-0002',
        createdHours: 24,
        remarks: null,
      },

      // Other Standalone Realistic Civic Grievances
      {
        id: 'SGC-2026-00006',
        citizenId: 'USR-CITIZEN-001',
        title: 'Live electric wire dangling dangerously from utility pole near school gate',
        description: 'High voltage electric cable snapped during yesterday storm and is hanging only 4 feet above the ground directly outside National Public School footpath. Extreme hazard for school children.',
        category: 'PUBLIC_SAFETY',
        priority: 'CRITICAL',
        status: 'RESOLVED',
        locality: 'HSR Layout',
        address: 'Sector 2, 14th Main Road, outside school gate',
        deptId: 'DEPT-POWER',
        masterIssueId: null,
        createdHours: 120,
        resolvedHours: 96,
        remarks: 'Emergency lineman crew replaced snapped cable and re-insulated feeder drop within 4 hours. Area certified safe.',
      },
      {
        id: 'SGC-2026-00007',
        citizenId: 'USR-CITIZEN-001',
        title: 'Dangerous deep pothole on outer ring road flyover exit',
        description: 'Sharp crater approximately 1.5 feet deep on the left descent lane of Bellandur flyover. Several motorbikes have suffered punctured tires and near accidents in the dark.',
        category: 'ROADS',
        priority: 'HIGH',
        status: 'IN_PROGRESS',
        locality: 'Bellandur',
        address: 'Outer Ring Road, Bellandur Flyover Southbound Ramp',
        deptId: 'DEPT-ROADS',
        masterIssueId: null,
        createdHours: 85,
        remarks: 'Cold mix asphalt patch planned for tonight between 11 PM and 4 AM during non-peak traffic.',
      },
      {
        id: 'SGC-2026-00008',
        citizenId: 'USR-CITIZEN-002',
        title: 'All streetlights out for 1 km stretch on 24th Main Road',
        description: 'Complete blackout along residential stretch from 5th Cross to 12th Cross. Entire road pitch dark at night, causing safety concerns for women and elderly walking in the evening.',
        category: 'ELECTRICITY',
        priority: 'MEDIUM',
        status: 'ASSIGNED',
        locality: 'JP Nagar',
        address: '24th Main Road, JP Nagar 5th Phase',
        deptId: 'DEPT-POWER',
        masterIssueId: null,
        createdHours: 50,
        remarks: 'Assigned to BESCOM Subdivision 4. Central timer circuit switch inspected and parts requisitioned.',
      },
      {
        id: 'SGC-2026-00009',
        citizenId: 'USR-CITIZEN-003',
        title: 'Sewage overflowing from broken manhole into apartment driveway',
        description: 'Manhole chamber cover cracked and foul black sewage water is bubbling up onto the road and into the basement entrance of Greenwood Apartments.',
        category: 'DRAINAGE',
        priority: 'CRITICAL',
        status: 'UNDER_REVIEW',
        locality: 'Whitefield',
        address: 'Hope Farm Junction Road, near Greenwood Apts',
        deptId: 'DEPT-DRAINAGE',
        masterIssueId: null,
        createdHours: 18,
        remarks: 'Under review by drainage division. Suction jetting vehicle scheduled.',
      },
      {
        id: 'SGC-2026-00010',
        citizenId: 'USR-CITIZEN-004',
        title: 'Contaminated brown water coming from municipal tap supply',
        description: 'Water has foul sewage smell and muddy brown coloration since last 2 days. Several families have fallen sick with stomach upset. Suspect underground sewage line seepage into water pipe.',
        category: 'WATER',
        priority: 'CRITICAL',
        status: 'ASSIGNED',
        locality: 'Malleshwaram',
        address: '8th Cross, Temple Road, Ward 65',
        deptId: 'DEPT-WATER',
        masterIssueId: null,
        createdHours: 30,
        remarks: 'Assigned to BWSSB quality control lab. Water samples collected for chlorination testing.',
      },
      {
        id: 'SGC-2026-00011',
        citizenId: 'USR-CITIZEN-005',
        title: 'Commercial construction debris dumped illegally on public park boundary',
        description: 'Unidentified tipper truck dumped heaps of concrete slabs and drywall debris along the park perimeter walking track at midnight.',
        category: 'GARBAGE',
        priority: 'MEDIUM',
        status: 'RESOLVED',
        locality: 'Jayanagar',
        address: '9th Block Park, East Gate',
        deptId: 'DEPT-SANITATION',
        masterIssueId: null,
        createdHours: 150,
        resolvedHours: 120,
        remarks: 'Debris cleared with earthmover. Warning notice served to nearby construction contractor.',
      },
      {
        id: 'SGC-2026-00012',
        citizenId: 'USR-CITIZEN-001',
        title: 'Faded pedestrian zebra crossing outside Government Primary School',
        description: 'The white zebra stripes and school zone cautionary signs have completely washed away. Vehicles do not slow down for children crossing.',
        category: 'ROADS',
        priority: 'LOW',
        status: 'CLOSED',
        locality: 'BTM Layout',
        address: '16th Main Road, near Ward Office',
        deptId: 'DEPT-ROADS',
        masterIssueId: null,
        createdHours: 250,
        resolvedHours: 200,
        remarks: 'Thermoplastic retro-reflective paint applied with speed breaker indicator signage. Complaint verified and closed.',
      },
      {
        id: 'SGC-2026-00013',
        citizenId: 'USR-CITIZEN-002',
        title: 'Dry branches of dead tree leaning over high-tension electricity lines',
        description: 'Large gulmohar tree dried out and two heavy branches are resting directly on top of 11kV overhead power cables.',
        category: 'PUBLIC_SAFETY',
        priority: 'HIGH',
        status: 'SUBMITTED',
        locality: 'Basavanagudi',
        address: 'Gandhi Bazaar Main Road, opposite Post Office',
        deptId: 'DEPT-SAFETY',
        masterIssueId: null,
        createdHours: 10,
        remarks: null,
      },
      {
        id: 'SGC-2026-00014',
        citizenId: 'USR-CITIZEN-003',
        title: 'Open storm drain without safety grate on busy footpath',
        description: 'A 4-foot deep open stormwater drain inlet has lost its cast-iron cover. It is completely hidden when it rains and anyone walking can fall in.',
        category: 'DRAINAGE',
        priority: 'CRITICAL',
        status: 'ASSIGNED',
        locality: 'Koramangala',
        address: '5th Block, near Jyoti Nivas College Road',
        deptId: 'DEPT-DRAINAGE',
        masterIssueId: null,
        createdHours: 14,
        remarks: 'Precast concrete slab temporary cover placed. Permanent heavy-duty grating requisitioned.',
      }
    ];

    const insertComplaint = db.prepare(`
      INSERT INTO complaints (
        id, citizen_id, title, description, category, predicted_category, priority,
        status, state, city, locality, address, latitude, longitude,
        language, image_url, assigned_department_id, recommended_department_id, master_issue_id,
        created_at, updated_at, resolved_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?,
        ?, 'Karnataka', 'Bengaluru', ?, ?, ?, ?,
        'en', NULL, ?, ?, ?,
        ?, ?, ?
      )
    `);

    const insertAnalysis = db.prepare(`
      INSERT INTO complaint_analyses (
        id, complaint_id, cleaned_text, tokens_count, language_detected,
        category_predicted, category_confidence, category_explanation,
        priority_predicted, priority_confidence, priority_reasons_json,
        recommended_department_code, recommended_department_name,
        urgency_score, sentiment_score, sentiment_label,
        potential_duplicates_json, master_issue_suggested, suggested_master_issue_id,
        processed_at, engine_version
      ) VALUES (
        ?, ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?,
        ?, ?,
        ?, ?, ?,
        ?, ?, ?,
        ?, ?
      )
    `);

    const insertHistory = db.prepare(`
      INSERT INTO complaint_status_history (
        id, complaint_id, previous_status, new_status, actor_id, actor_name, actor_role, citizen_remark, internal_note, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (let i = 0; i < seedComplaints.length; i++) {
      const c = seedComplaints[i];
      const createdDate = getDate(c.createdHours);
      const resolvedDate = c.resolvedHours ? getDate(c.resolvedHours) : null;
      const updatedDate = resolvedDate || createdDate;

      // Run AI analysis
      const analysis = AIEngineService.analyzeComplaint({
        complaintId: c.id,
        title: c.title,
        description: c.description,
        userCategory: c.category as any,
        locality: c.locality,
        city: 'Bengaluru',
      });

      insertComplaint.run(
        c.id,
        c.citizenId,
        c.title,
        c.description,
        c.category,
        analysis.categoryPredicted,
        c.priority,
        c.status,
        c.locality,
        c.address,
        12.9716 + (Math.random() - 0.5) * 0.08,
        77.5946 + (Math.random() - 0.5) * 0.08,
        c.deptId,
        c.deptId,
        c.masterIssueId,
        createdDate,
        updatedDate,
        resolvedDate
      );

      insertAnalysis.run(
        `AIA-SEED-${i + 1}`,
        c.id,
        analysis.cleanedText,
        analysis.tokensCount,
        analysis.languageDetected,
        analysis.categoryPredicted,
        analysis.categoryConfidence,
        analysis.categoryExplanation,
        analysis.priorityPredicted,
        analysis.priorityConfidence,
        JSON.stringify(analysis.priorityReasons),
        analysis.recommendedDepartmentCode,
        analysis.recommendedDepartmentName,
        analysis.urgencyScore,
        analysis.sentimentScore,
        analysis.sentimentLabel,
        JSON.stringify(analysis.potentialDuplicates),
        c.masterIssueId ? 1 : (analysis.masterIssueSuggested ? 1 : 0),
        c.masterIssueId || analysis.suggestedMasterIssueId || null,
        createdDate,
        AIEngineService.VERSION
      );

      // Initial submission history
      insertHistory.run(
        `HIS-SEED-${i + 1}-1`,
        c.id,
        null,
        'SUBMITTED',
        c.citizenId,
        'Citizen',
        'CITIZEN',
        'Grievance registered in municipal portal.',
        'Initial automated ingestion.',
        createdDate
      );

      // Follow-up status history if changed
      if (c.status !== 'SUBMITTED') {
        insertHistory.run(
          `HIS-SEED-${i + 1}-2`,
          c.id,
          'SUBMITTED',
          c.status,
          'USR-ADMIN-001',
          'Chief Grievance Administrator',
          'ADMIN',
          c.remarks || `Status transitioned to ${c.status}.`,
          'Reviewed by central control room.',
          updatedDate
        );
      }
    }

    // 5. Seed Notifications for Demo Citizen
    const insertNotif = db.prepare(`
      INSERT INTO notifications (id, user_id, complaint_id, title, message, type, read, link, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertNotif.run(
      'NOTIF-SEED-001',
      'USR-CITIZEN-001',
      'SGC-2026-00001',
      'Field Team Dispatched for Pipeline Leak',
      'BWSSB emergency squad has arrived at 100 Feet Road Indiranagar to excavate and isolate the ruptured pipeline.',
      'STATUS_UPDATE',
      0,
      '/complaints/SGC-2026-00001',
      getDate(6)
    );

    insertNotif.run(
      'NOTIF-SEED-002',
      'USR-CITIZEN-001',
      'SGC-2026-00006',
      'Hazard Cleared & Grievance Resolved',
      'The dangling high-voltage wire on Sector 2 HSR Layout has been safely reconnected. Area cleared for school children.',
      'RESOLVED',
      1,
      '/complaints/SGC-2026-00006',
      getDate(96)
    );

    insertNotif.run(
      'NOTIF-SEED-003',
      'USR-CITIZEN-001',
      'SGC-2026-00007',
      'Repair Scheduled: Bellandur Flyover Crater',
      'PWD has scheduled overnight bituminous repair on the flyover descent lane.',
      'ASSIGNMENT',
      0,
      '/complaints/SGC-2026-00007',
      getDate(20)
    );

    // 6. System Settings
    const insertSetting = db.prepare(`
      INSERT INTO system_settings (key, value_json, updated_at)
      VALUES (?, ?, ?)
    `);

    insertSetting.run('auto_routing_enabled', JSON.stringify(true), getDate(100));
    insertSetting.run('duplicate_similarity_threshold', JSON.stringify(55), getDate(100));
    insertSetting.run('sms_notifications_enabled', JSON.stringify(false), getDate(100));
    insertSetting.run('default_city', JSON.stringify('Bengaluru'), getDate(100));

    console.log('--- Database Seeding Complete! ---');
    console.log('Seeded:');
    console.log('  1 Administrator (Phone: +919876543210, Password: Admin@12345)');
    console.log('  5 Citizens (Demo: +919876543211, Password: Citizen@12345)');
    console.log('  6 Municipal Departments');
    console.log('  2 Master Civic Issues');
    console.log('  14 Fictional Complaints with full AI analysis & status timelines');
    console.log('  Active notifications and system settings');
  });
}

// Allow direct execution
if (process.argv[1]?.endsWith('seed.ts')) {
  seedDatabase().catch((err) => {
    console.error('Seeding failed:', err);
    process.exit(1);
  });
}
