import {
  ComplaintCategory,
  ComplaintPriority,
  AIAnalysisResult,
  DuplicateMatch,
  CATEGORY_LABELS,
} from '../../shared/types.js';
import { db } from '../db/index.js';

// Predefined category taxonomy with lexical signals and weighted terms
const CATEGORY_KEYWORDS: Record<ComplaintCategory, { primary: string[]; secondary: string[] }> = {
  ROADS: {
    primary: ['pothole', 'road', 'asphalt', 'tar', 'crater', 'divider', 'speed breaker', 'gadda', 'sadak', 'footpath', 'pavement', 'sinkhole'],
    secondary: ['traffic', 'accident', 'drive', 'vehicle', 'car', 'bike', 'scooter', 'damage', 'surface', 'lane']
  },
  WATER: {
    primary: ['water leak', 'pipeline', 'pipe burst', 'contamination', 'dirty water', 'water supply', 'no water', 'paani', 'jal', 'meter leak', 'borewell', 'tap'],
    secondary: ['drinking', 'pressure', 'muddy', 'smell', 'flooding', 'tanker', 'valve', 'main']
  },
  GARBAGE: {
    primary: ['garbage', 'trash', 'waste', 'dump', 'kachra', 'dustbin', 'rubbish', 'stench', 'rotting', 'sanitation', 'litter', 'debris'],
    secondary: ['unhygienic', 'flies', 'mosquitoes', 'overflowing', 'smell', 'cleaning', 'sweeper', 'pile']
  },
  ELECTRICITY: {
    primary: ['streetlight', 'light', 'lamp post', 'electric pole', 'power cut', 'blackout', 'transformer', 'sparks', 'loose wire', 'bijli', 'current', 'voltage'],
    secondary: ['dark', 'night', 'safety', 'fuse', 'meter', 'shock', 'cable', 'illumination']
  },
  DRAINAGE: {
    primary: ['drainage', 'gutter', 'sewage', 'sewer', 'manhole', 'naali', 'clogged drain', 'storm drain', 'overflowing drain', 'sludge'],
    secondary: ['stagnant', 'foul', 'mosquito', 'choked', 'monsoon', 'backflow', 'grate']
  },
  PUBLIC_SAFETY: {
    primary: ['hazard', 'danger', 'open borewell', 'collapse', 'falling tree', 'broken railing', 'open pit', 'live wire', 'khatra', 'structural crack', 'landslide'],
    secondary: ['children', 'risk', 'injury', 'school', 'hospital', 'life threatening', 'emergency', 'urgent']
  },
  OTHER: {
    primary: ['encroachment', 'noise', 'stray animals', 'dog bite', 'park', 'illegal parking', 'tree pruning', 'property tax', 'signage'],
    secondary: ['nuisance', 'permit', 'maintenance', 'civic', 'complaint']
  }
};

// Urgency and priority indicators
const CRITICAL_SIGNALS = [
  'live wire', 'open borewell', 'sparking', 'fire hazard', 'cave in', 'collapse',
  'contamination', 'electric shock', 'open manhole on main road', 'life threatening',
  'hospital access blocked', 'immediate hazard', 'school zone danger', 'deep pit'
];

const HIGH_SIGNALS = [
  'pipeline burst', 'major water leak', 'main road blocked', 'continuous overflow',
  'blackout for days', 'accident zone', 'severe stench', 'urgent', 'huge crater',
  'dangerous crossing', 'deep pothole', 'school children'
];

const LOW_SIGNALS = [
  'faded marking', 'garden maintenance', 'sign board rusted', 'minor paint',
  'relocate bin', 'aesthetic', 'request for park bench', 'trimming ornamental'
];

// Department mapping
const CATEGORY_DEPARTMENT_MAP: Record<ComplaintCategory, { code: string; name: string }> = {
  ROADS: { code: 'DEPT_ROADS', name: 'Public Works & Roads Department (PWD)' },
  WATER: { code: 'DEPT_WATER', name: 'Bangalore Water Supply & Sewerage Board (BWSSB)' },
  GARBAGE: { code: 'DEPT_SANITATION', name: 'Solid Waste Management & Sanitation Dept' },
  ELECTRICITY: { code: 'DEPT_POWER', name: 'Electricity Supply & Streetlight Authority' },
  DRAINAGE: { code: 'DEPT_DRAINAGE', name: 'Stormwater & Underground Drainage Cell' },
  PUBLIC_SAFETY: { code: 'DEPT_SAFETY', name: 'Disaster Management & Public Safety Cell' },
  OTHER: { code: 'DEPT_GENERAL', name: 'Municipal Administration & General Grievance Cell' }
};

export class AIEngineService {
  public static readonly VERSION = 'SmartGov-CivicNLP-v2.4 (Honest Rule & Lexical Semantic Engine)';

  /**
   * 1. Text Preprocessing
   */
  public static preprocessText(text: string): { cleaned: string; tokens: string[] } {
    if (!text) return { cleaned: '', tokens: [] };
    // Normalize unicode, collapse whitespace, strip unusual punctuation
    const cleaned = text
      .trim()
      .replace(/[\r\n\t]+/g, ' ')
      .replace(/\s+/g, ' ');

    const normalizedLower = cleaned.toLowerCase();
    const tokens = normalizedLower
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length > 2);

    return { cleaned, tokens };
  }

  /**
   * Detect language hints (English, Telugu transliteration, Hindi transliteration)
   */
  public static detectLanguageHint(text: string): string {
    const lower = text.toLowerCase();
    const teluguKeywords = ['gadda', 'neellu', 'chetha', 'naala', 'veedhi', 'dhaari', 'currentu', 'badulu'];
    const hindiKeywords = ['sadak', 'paani', 'kachra', 'naali', 'bijli', 'gaddha', 'roshni', 'bimar'];

    const hasTelugu = teluguKeywords.some((k) => lower.includes(k));
    const hasHindi = hindiKeywords.some((k) => lower.includes(k));

    if (hasTelugu) return 'Telugu (Transliterated / Mixed)';
    if (hasHindi) return 'Hindi (Transliterated / Mixed)';
    return 'English';
  }

  /**
   * 2. Category Prediction
   */
  public static predictCategory(title: string, description: string): {
    category: ComplaintCategory;
    confidence: number;
    explanation: string;
  } {
    const combined = `${title} ${description}`.toLowerCase();
    const scores: Record<ComplaintCategory, number> = {
      ROADS: 0,
      WATER: 0,
      GARBAGE: 0,
      ELECTRICITY: 0,
      DRAINAGE: 0,
      PUBLIC_SAFETY: 0,
      OTHER: 0.1, // Base prior for other
    };

    const matchedWords: Record<ComplaintCategory, string[]> = {
      ROADS: [],
      WATER: [],
      GARBAGE: [],
      ELECTRICITY: [],
      DRAINAGE: [],
      PUBLIC_SAFETY: [],
      OTHER: [],
    };

    // Score based on primary (weight 3) and secondary (weight 1) keywords
    for (const [cat, dict] of Object.entries(CATEGORY_KEYWORDS) as [ComplaintCategory, { primary: string[]; secondary: string[] }][]) {
      for (const kw of dict.primary) {
        if (combined.includes(kw)) {
          scores[cat] += 3;
          matchedWords[cat].push(kw);
        }
      }
      for (const kw of dict.secondary) {
        if (combined.includes(kw)) {
          scores[cat] += 1;
          matchedWords[cat].push(kw);
        }
      }
    }

    // Determine highest scoring category
    let bestCategory: ComplaintCategory = 'OTHER';
    let maxScore = 0;

    for (const [cat, score] of Object.entries(scores) as [ComplaintCategory, number][]) {
      if (score > maxScore) {
        maxScore = score;
        bestCategory = cat;
      }
    }

    // Calculate normalized confidence (0.50 to 0.96)
    let confidence = 0.50;
    if (maxScore > 0) {
      confidence = Math.min(0.96, Math.max(0.65, 0.60 + maxScore * 0.05));
    }

    const matchedList = matchedWords[bestCategory].slice(0, 4);
    const explanation = matchedList.length > 0
      ? `Predicted ${CATEGORY_LABELS[bestCategory]} based on civic signals: "${matchedList.join('", "')}".`
      : `Classified as ${CATEGORY_LABELS[bestCategory]} based on general civic context.`;

    return { category: bestCategory, confidence: Number(confidence.toFixed(2)), explanation };
  }

  /**
   * 3. Priority Detection
   */
  public static detectPriority(title: string, description: string, category: ComplaintCategory): {
    priority: ComplaintPriority;
    confidence: number;
    reasons: string[];
    urgencyScore: number;
  } {
    const combined = `${title} ${description}`.toLowerCase();
    const reasons: string[] = [];
    let priority: ComplaintPriority = 'MEDIUM';
    let urgencyScore = 50;

    // Check critical signals
    for (const sig of CRITICAL_SIGNALS) {
      if (combined.includes(sig)) {
        priority = 'CRITICAL';
        urgencyScore = Math.max(urgencyScore, 92);
        reasons.push(`High hazard flag detected: "${sig}". Human safety or critical infrastructure risk.`);
        break;
      }
    }

    // Check high signals if not critical
    if (priority !== 'CRITICAL') {
      for (const sig of HIGH_SIGNALS) {
        if (combined.includes(sig)) {
          priority = 'HIGH';
          urgencyScore = Math.max(urgencyScore, 78);
          reasons.push(`Escalation indicator detected: "${sig}". Prompt department response recommended.`);
          break;
        }
      }
    }

    // Check low signals if not high or critical
    if (priority === 'MEDIUM') {
      for (const sig of LOW_SIGNALS) {
        if (combined.includes(sig)) {
          priority = 'LOW';
          urgencyScore = 25;
          reasons.push(`Routine maintenance signal detected: "${sig}".`);
          break;
        }
      }
    }

    // Category-specific baseline priority
    if (priority === 'MEDIUM') {
      if (category === 'PUBLIC_SAFETY') {
        priority = 'HIGH';
        urgencyScore = 75;
        reasons.push('Safety category carries high baseline priority for citizen protection.');
      } else if (category === 'WATER' && (combined.includes('leak') || combined.includes('burst'))) {
        priority = 'HIGH';
        urgencyScore = 72;
        reasons.push('Water loss and contamination prevention baseline priority.');
      } else {
        reasons.push('Standard medium urgency assigned based on standard municipal response SLA.');
      }
    }

    const confidence = priority === 'CRITICAL' ? 0.94 : priority === 'HIGH' ? 0.88 : 0.80;

    return {
      priority,
      confidence,
      reasons,
      urgencyScore,
    };
  }

  /**
   * 4. Department Recommendation
   */
  public static recommendDepartment(category: ComplaintCategory) {
    return CATEGORY_DEPARTMENT_MAP[category] || CATEGORY_DEPARTMENT_MAP.OTHER;
  }

  /**
   * 5. Duplicate Detection & Jaccard / Cosine Word Similarity
   */
  public static findDuplicates(
    currentId: string,
    title: string,
    description: string,
    category: ComplaintCategory,
    locality: string,
    city: string
  ): DuplicateMatch[] {
    const { tokens: currentTokens } = this.preprocessText(`${title} ${description}`);
    if (currentTokens.length === 0) return [];

    // Query active complaints in the same locality or category from database
    const stmt = db.prepare(`
      SELECT id, title, description, category, locality, status
      FROM complaints
      WHERE id != ? AND (locality = ? OR category = ?) AND status NOT IN ('RESOLVED', 'CLOSED')
      ORDER BY created_at DESC
      LIMIT 20
    `);

    const candidates = stmt.all(currentId, locality, category) as Array<{
      id: string;
      title: string;
      description: string;
      category: string;
      locality: string;
      status: string;
    }>;

    const duplicates: DuplicateMatch[] = [];

    for (const cand of candidates) {
      const { tokens: candTokens } = this.preprocessText(`${cand.title} ${cand.description}`);
      const setA = new Set(currentTokens);
      const setB = new Set(candTokens);

      let intersection = 0;
      for (const t of setA) {
        if (setB.has(t)) intersection++;
      }

      const union = new Set([...setA, ...setB]).size;
      const jaccard = union > 0 ? intersection / union : 0;

      // Locality match bonus
      const sameLocality = cand.locality.toLowerCase().trim() === locality.toLowerCase().trim();
      const sameCategory = cand.category === category;

      let score = jaccard * 0.7;
      if (sameLocality) score += 0.2;
      if (sameCategory) score += 0.1;

      score = Math.min(0.99, score);

      if (score >= 0.45) {
        const similarityPct = Math.round(score * 100);
        let reason = `Semantic overlap of ${similarityPct}%`;
        if (sameLocality && sameCategory) {
          reason += ` in the same locality (${locality}) for ${CATEGORY_LABELS[category]}.`;
        } else if (sameLocality) {
          reason += ` within the same locality (${locality}).`;
        } else {
          reason += ` regarding similar civic grievance keywords.`;
        }

        duplicates.push({
          id: cand.id,
          title: cand.title,
          similarityScore: similarityPct,
          locality: cand.locality,
          status: cand.status as any,
          reason,
        });
      }
    }

    // Sort descending by similarity
    duplicates.sort((a, b) => b.similarityScore - a.similarityScore);
    return duplicates.slice(0, 3);
  }

  /**
   * 6. Master-Issue Association Suggestion
   */
  public static checkMasterIssueSuggestion(
    category: ComplaintCategory,
    locality: string,
    city: string,
    duplicates: DuplicateMatch[]
  ): { suggested: boolean; masterIssueId: string | null } {
    // Check if an existing open Master Issue exists in this locality and category
    const stmt = db.prepare(`
      SELECT id, title, complaint_count
      FROM master_issues
      WHERE category = ? AND (locality = ? OR city = ?) AND status NOT IN ('RESOLVED')
      LIMIT 1
    `);

    const existingMI = stmt.get(category, locality, city) as { id: string; title: string; complaint_count: number } | undefined;
    if (existingMI) {
      return { suggested: true, masterIssueId: existingMI.id };
    }

    // If 2 or more active duplicates found in same locality, suggest master issue grouping
    if (duplicates.length >= 2 && duplicates[0].similarityScore >= 60) {
      return { suggested: true, masterIssueId: null };
    }

    return { suggested: false, masterIssueId: null };
  }

  /**
   * Complete Comprehensive AI Analysis Pipeline
   */
  public static analyzeComplaint(params: {
    complaintId: string;
    title: string;
    description: string;
    userCategory?: ComplaintCategory | 'AUTO_DETECT';
    locality: string;
    city: string;
  }): AIAnalysisResult {
    const { complaintId, title, description, userCategory, locality, city } = params;

    // 1. Text preprocessing
    const { cleaned, tokens } = this.preprocessText(`${title} ${description}`);
    const languageDetected = this.detectLanguageHint(`${title} ${description}`);

    // 2. Category prediction
    const catPred = this.predictCategory(title, description);
    const finalCategory = (userCategory && userCategory !== 'AUTO_DETECT') ? userCategory : catPred.category;

    // 3. Priority detection
    const prioPred = this.detectPriority(title, description, finalCategory);

    // 4. Department recommendation
    const deptRec = this.recommendDepartment(finalCategory);

    // 5. Duplicate detection
    const duplicates = this.findDuplicates(complaintId, title, description, finalCategory, locality, city);

    // 6. Master issue association
    const miSuggestion = this.checkMasterIssueSuggestion(finalCategory, locality, city, duplicates);

    // Sentiment heuristic based on urgency and negative keywords
    const lower = cleaned.toLowerCase();
    const hasFrustration = ['pathetic', 'ridiculous', 'nobody cares', 'terrible', 'worst', 'repeated', 'ignored'].some((w) => lower.includes(w));
    const sentimentLabel = prioPred.priority === 'CRITICAL' ? 'Urgent' : hasFrustration ? 'Frustrated' : 'Negative';
    const sentimentScore = prioPred.priority === 'CRITICAL' ? -0.85 : hasFrustration ? -0.70 : -0.45;

    return {
      id: `AIA-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      complaintId,
      cleanedText: cleaned,
      tokensCount: tokens.length,
      languageDetected,
      categoryPredicted: catPred.category,
      categoryConfidence: catPred.confidence,
      categoryExplanation: catPred.explanation,
      priorityPredicted: prioPred.priority,
      priorityConfidence: prioPred.confidence,
      priorityReasons: prioPred.reasons,
      recommendedDepartmentCode: deptRec.code,
      recommendedDepartmentName: deptRec.name,
      urgencyScore: prioPred.urgencyScore,
      sentimentScore,
      sentimentLabel,
      potentialDuplicates: duplicates,
      masterIssueSuggested: miSuggestion.suggested,
      suggestedMasterIssueId: miSuggestion.masterIssueId,
      processedAt: new Date().toISOString(),
      engineVersion: this.VERSION,
    };
  }
}
