import { PDFParse } from 'pdf-parse';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Comprehensive skill catalog with canonical names and regex match patterns
const SKILL_CATALOG = [
  // Programming Languages
  { name: 'Python', regex: /\bpython\b/i },
  { name: 'JavaScript', regex: /\b(javascript|js|es6)\b/i },
  { name: 'TypeScript', regex: /\b(typescript|ts)\b/i },
  { name: 'Java', regex: /\bjava\b(?!\s*script)/i },
  { name: 'C++', regex: /\b(c\+\+|cpp)\b/i },
  { name: 'C#', regex: /\b(c#|csharp)\b/i },
  { name: 'C', regex: /\b(?<!\w)c(?!\w|\+|\#)/i },
  { name: 'Go', regex: /\b(golang|go)\b/i },
  { name: 'Rust', regex: /\brust\b/i },
  { name: 'Kotlin', regex: /\bkotlin\b/i },
  { name: 'Swift', regex: /\bswift\b/i },
  { name: 'PHP', regex: /\bphp\b/i },
  { name: 'Ruby', regex: /\bruby\b/i },
  { name: 'SQL', regex: /\bsql\b/i },

  // Web Development & Frameworks
  { name: 'React', regex: /\b(react|reactjs|react\.js)\b/i },
  { name: 'Next.js', regex: /\b(nextjs|next\.js)\b/i },
  { name: 'Node.js', regex: /\b(nodejs|node\.js|node)\b/i },
  { name: 'Express.js', regex: /\b(express|expressjs|express\.js)\b/i },
  { name: 'Vue.js', regex: /\b(vue|vuejs|vue\.js)\b/i },
  { name: 'Angular', regex: /\bangular\b/i },
  { name: 'Django', regex: /\bdjango\b/i },
  { name: 'Flask', regex: /\bflask\b/i },
  { name: 'FastAPI', regex: /\bfastapi\b/i },
  { name: 'Spring Boot', regex: /\b(spring boot|springboot|spring)\b/i },
  { name: 'HTML5', regex: /\b(html|html5)\b/i },
  { name: 'CSS3', regex: /\b(css|css3)\b/i },
  { name: 'Tailwind CSS', regex: /\b(tailwind|tailwindcss)\b/i },
  { name: 'Bootstrap', regex: /\bbootstrap\b/i },
  { name: 'REST API', regex: /\b(rest|restful|rest api|apis)\b/i },
  { name: 'GraphQL', regex: /\bgraphql\b/i },
  { name: 'Full-Stack', regex: /\b(full[\s-]?stack|web development)\b/i },

  // Databases & Storage
  { name: 'PostgreSQL', regex: /\b(postgres|postgresql)\b/i },
  { name: 'MySQL', regex: /\bmysql\b/i },
  { name: 'MongoDB', regex: /\b(mongo|mongodb)\b/i },
  { name: 'SQLite', regex: /\bsqlite\b/i },
  { name: 'Redis', regex: /\bredis\b/i },
  { name: 'Firebase', regex: /\bfirebase\b/i },
  { name: 'Supabase', regex: /\bsupabase\b/i },
  { name: 'Prisma', regex: /\bprisma\b/i },

  // Cloud & DevOps
  { name: 'Docker', regex: /\bdocker\b/i },
  { name: 'Kubernetes', regex: /\b(k8s|kubernetes)\b/i },
  { name: 'AWS', regex: /\b(aws|amazon web services)\b/i },
  { name: 'Azure', regex: /\b(azure|microsoft azure)\b/i },
  { name: 'Google Cloud (GCP)', regex: /\b(gcp|google cloud)\b/i },
  { name: 'Git & GitHub', regex: /\b(git|github|gitlab)\b/i },
  { name: 'CI/CD', regex: /\b(ci\/cd|github actions|jenkins)\b/i },
  { name: 'Linux', regex: /\b(linux|ubuntu|debian|unix)\b/i },
  { name: 'Bash', regex: /\b(bash|shell scripting|shell)\b/i },

  // AI, Data Science & Machine Learning
  { name: 'Machine Learning', regex: /\b(machine learning|ml)\b/i },
  { name: 'Deep Learning', regex: /\b(deep learning|dl|neural networks)\b/i },
  { name: 'Artificial Intelligence', regex: /\b(artificial intelligence|ai)\b/i },
  { name: 'TensorFlow', regex: /\btensorflow\b/i },
  { name: 'PyTorch', regex: /\bpytorch\b/i },
  { name: 'Scikit-learn', regex: /\b(scikit[\s-]?learn|sklearn)\b/i },
  { name: 'Pandas', regex: /\bpandas\b/i },
  { name: 'NumPy', regex: /\bnumpy\b/i },
  { name: 'Computer Vision', regex: /\b(computer vision|opencv)\b/i },
  { name: 'NLP', regex: /\b(natural language processing|nlp)\b/i },
  { name: 'Large Language Models (LLM)', regex: /\b(llm|large language model|generative ai|genai)\b/i },
  { name: 'Data Analytics', regex: /\b(data analytics|data analysis|power bi|tableau)\b/i },

  // Cybersecurity
  { name: 'Cybersecurity', regex: /\b(cybersecurity|cyber security|infosec|information security)\b/i },
  { name: 'Ethical Hacking', regex: /\b(ethical hacking|penetration testing|pen testing)\b/i },
  { name: 'Network Security', regex: /\b(network security|firewall|wireshark)\b/i },
  { name: 'Cryptography', regex: /\b(cryptography|encryption)\b/i },
  { name: 'OWASP & AppSec', regex: /\b(owasp|application security|appsec)\b/i },
  { name: 'CTF (Capture The Flag)', regex: /\b(ctf|capture the flag)\b/i },
  { name: 'Threat Intelligence', regex: /\b(threat intelligence|soc|siem|incident response)\b/i },

  // Hardware, Robotics & IoT
  { name: 'Robotics', regex: /\brobotics\b/i },
  { name: 'IoT', regex: /\b(iot|internet of things)\b/i },
  { name: 'Arduino', regex: /\barduino\b/i },
  { name: 'Raspberry Pi', regex: /\braspberry pi\b/i },
  { name: 'Embedded Systems', regex: /\b(embedded systems|microcontroller|arm|stm32)\b/i },
  { name: 'Circuit Design & VLSI', regex: /\b(vlsi|circuit design|pcb|verilog|vhdl|matlab)\b/i },
  { name: '3D Printing & CAD', regex: /\b(3d printing|cad|autocad|solidworks)\b/i },

  // Entrepreneurship & Management
  { name: 'Entrepreneurship', regex: /\b(entrepreneurship|entrepreneur|founder)\b/i },
  { name: 'Startup Incubation', regex: /\b(startup|startups|incubation|mvp)\b/i },
  { name: 'Pitching & Business Modeling', regex: /\b(pitch deck|pitching|business model|venture capital)\b/i },
  { name: 'Product Management', regex: /\b(product management|agile|scrum)\b/i },
  { name: 'Marketing & Growth', regex: /\b(marketing|growth hacking|seo|sales)\b/i },

  // Design & Media
  { name: 'UI/UX Design', regex: /\b(ui\/ux|ui design|ux design|user experience)\b/i },
  { name: 'Figma', regex: /\bfigma\b/i },
  { name: 'Graphic Design', regex: /\b(graphic design|photoshop|illustrator)\b/i },
  { name: 'Video Editing', regex: /\b(video editing|premiere pro|after effects)\b/i },
  { name: 'Public Speaking', regex: /\b(public speaking|anchoring|communication skills)\b/i }
];

// Club Domain keyword weighting for smart matching
export const CLUB_KEYWORDS = {
  'The Byte Club': [
    'react', 'next.js', 'node.js', 'express.js', 'javascript', 'typescript', 'full-stack',
    'html5', 'css3', 'tailwind css', 'bootstrap', 'rest api', 'graphql', 'git & github',
    'python', 'mongodb', 'postgresql', 'sql', 'django', 'machine learning', 'artificial intelligence',
    'c++', 'java', 'web development', 'hackathon', 'project development'
  ],
  'OWASP NIE Student Chapter': [
    'cybersecurity', 'ethical hacking', 'network security', 'cryptography', 'owasp & appsec',
    'ctf (capture the flag)', 'linux', 'bash', 'git & github', 'python', 'c'
  ],
  'ISSA Cyber-Tech Club': [
    'cybersecurity', 'network security', 'threat intelligence', 'cloud & devops', 'aws',
    'azure', 'docker', 'kubernetes', 'linux', 'bash', 'ci/cd', 'information security'
  ],
  'ONYX E-Cell (Entrepreneurship Cell)': [
    'entrepreneurship', 'startup incubation', 'pitching & business modeling', 'product management',
    'marketing & growth', 'public speaking', 'leadership', 'business'
  ],
  'Alpha Club': [
    'robotics', 'iot', 'arduino', 'raspberry pi', 'embedded systems', '3d printing & cad',
    'circuit design & vlsi', 'c', 'c++', 'python', 'hardware'
  ],
  'NIE IEEE Student Branch (NISB)': [
    'artificial intelligence', 'machine learning', 'deep learning', 'python', 'tensorflow',
    'pytorch', 'circuit design & vlsi', 'embedded systems', 'data analytics', 'research',
    'c++', 'matlab', 'computer vision'
  ],
  'The 4th Wall': [
    'ui/ux design', 'figma', 'graphic design', 'video editing', 'public speaking',
    'creative', 'media', 'scriptwriting', 'directing', 'filmmaking', 'cinematography', 'storytelling'
  ],
  'Kalasamhitha Cultural Club': [
    'music', 'dance', 'theater', 'fine arts', 'cultural festivals', 'event organizing',
    'leadership', 'creative expression', 'performing arts', 'public speaking'
  ]
};

/**
 * Extract plain text from PDF buffer using pdf-parse v2
 */
export async function parsePdfBuffer(buffer) {
  try {
    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    return result.text || '';
  } catch (error) {
    console.error('Error parsing PDF buffer with PDFParse:', error);
    // Fallback: try raw string extraction if simple text stream
    return buffer.toString('utf-8');
  }
}

/**
 * Extract technical skills from text using catalog
 */
export function extractSkillsFromText(text) {
  if (!text || typeof text !== 'string') return [];
  const extracted = new Set();

  for (const item of SKILL_CATALOG) {
    if (item.regex.test(text)) {
      extracted.add(item.name);
    }
  }

  return Array.from(extracted);
}

export const RECOMMENDATION_WEIGHTS = Object.freeze({
  resumeMatch: 30,
  interestMatch: 25,
  goalMatch: 15,
  activityPreference: 10,
  experienceCompatibility: 8,
  availabilityCompatibility: 7,
  explicitPreference: 5
});

const INTEREST_TERMS = {
  'technology and coding': ['technology', 'coding', 'programming', 'software', 'engineering'],
  'ai and machine learning': ['artificial intelligence', 'machine learning', 'deep learning', 'data science', 'ai'],
  cybersecurity: ['cybersecurity', 'cyber security', 'ethical hacking', 'information security'],
  'robotics and hardware': ['robotics', 'hardware', 'iot', 'embedded systems', 'electronics', 'makerspace'],
  entrepreneurship: ['entrepreneurship', 'startup', 'startups', 'business', 'incubation', 'founder'],
  leadership: ['leadership', 'leader', 'lead', 'management', 'coordinating', 'team'],
  'event organizing': ['event', 'events', 'organizing', 'organized', 'festival', 'fest', 'ideathon', 'competition'],
  networking: ['networking', 'industry connect', 'professional network', 'industry visit', 'mentor', 'connect'],
  'design and media': ['design', 'ui/ux', 'graphic', 'media', 'visual', 'creative'],
  'filmmaking and storytelling': ['filmmaking', 'film', 'cinema', 'storytelling', 'scriptwriting', 'cinematography'],
  research: ['research', 'publication', 'paper', 'scientific'],
  'public speaking': ['public speaking', 'pitch', 'presentation', 'anchoring', 'communication'],
  marketing: ['marketing', 'growth', 'promotion', 'branding', 'social media'],
  'social impact': ['social impact', 'community', 'outreach', 'volunteer', 'sustainability'],
  'performing arts': ['music', 'dance', 'theater', 'theatre', 'performing arts', 'fine arts', 'cultural']
};

const GOAL_TERMS = {
  'gain leadership experience': ['leadership', 'leader', 'lead', 'management', 'coordinating', 'team'],
  networking: ['networking', 'industry connect', 'professional network', 'industry visit', 'mentor', 'connect'],
  'organize college events': ['event', 'events', 'organizing', 'organized', 'festival', 'fest', 'ideathon', 'competition'],
  'build projects': ['project', 'build', 'prototype', 'hackathon', 'makerspace', 'product development'],
  'develop startup skills': ['startup', 'entrepreneurship', 'venture', 'pitch', 'business model', 'incubation'],
  'improve technical skills': ['technical', 'programming', 'engineering', 'coding', 'software', 'hardware'],
  'create a creative portfolio': ['creative', 'film', 'design', 'media', 'storytelling', 'arts'],
  'gain research experience': ['research', 'publication', 'paper', 'mentoring', 'scientific']
};

const ACTIVITY_TERMS = {
  'technical building': ['technical', 'coding', 'development', 'engineering', 'build', 'prototype', 'hands-on', 'makerspace', 'hardware'],
  'management event organizing': ['event', 'organizing', 'festival', 'leadership', 'management', 'coordination', 'entrepreneurship', 'pitch'],
  'combination of technical and managerial': {
    technical: ['technical', 'coding', 'development', 'engineering', 'build', 'prototype', 'hands-on', 'makerspace', 'hardware'],
    managerial: ['event', 'organizing', 'festival', 'leadership', 'management', 'coordination', 'entrepreneurship', 'pitch']
  },
  'creative production': ['filmmaking', 'film', 'design', 'media', 'creative', 'music', 'dance', 'arts'],
  'research and learning': ['workshop', 'training', 'research', 'learning', 'mentorship', 'session', 'publication'],
  'networking and industry events': ['networking', 'industry', 'corporate', 'seminar', 'talk', 'visit', 'connect']
};

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/\+/g, ' plus ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function containsTerm(normalizedCorpus, term) {
  const normalizedTerm = normalizeText(term);
  return Boolean(normalizedTerm) && (` ${normalizedCorpus} `).includes(` ${normalizedTerm} `);
}

function textValues(value) {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(textValues);
  if (value && typeof value === 'object') return Object.values(value).flatMap(textValues);
  return [];
}

function clubCorpus(club) {
  let socialMetadata = [];
  if (club.socialLinks) {
    try {
      socialMetadata = textValues(JSON.parse(club.socialLinks));
    } catch (error) {
      console.warn(`Ignoring invalid socialLinks metadata for club "${club.name}":`, error.message);
    }
  }
  const knownKeywords = CLUB_KEYWORDS[club.name] || [];
  const profileText = [
    club.name,
    club.description,
    ...socialMetadata,
    ...(club.openings || []).flatMap(opening => [opening.title, opening.description, opening.requirements]),
    ...(club.events || []).flatMap(event => [event.title, event.description])
  ].filter(Boolean);

  return { text: normalizeText([...profileText, ...knownKeywords].join(' ')), knownKeywords };
}

function normalizedPreferences(preferences = {}) {
  const list = value => Array.isArray(value) ? value.filter(item => typeof item === 'string' && item.trim()) : [];
  return {
    interests: list(preferences.interests),
    goals: list(preferences.goals),
    activityPreference: typeof preferences.activityPreference === 'string' ? preferences.activityPreference : '',
    experienceLevel: typeof preferences.experienceLevel === 'string' ? preferences.experienceLevel : '',
    availability: typeof preferences.availability === 'string' ? preferences.availability : '',
    interestedClubs: list(preferences.interestedClubs)
  };
}

function matchedTerms(selectedTerms, corpus, termGroups) {
  return selectedTerms.filter(term => {
    const mappedTerms = termGroups[normalizeText(term)] || [term];
    return mappedTerms.some(mappedTerm => containsTerm(corpus, mappedTerm));
  });
}

function activityPreferenceScore(preference, corpus) {
  if (!preference) return 50;
  const selectedTerms = ACTIVITY_TERMS[normalizeText(preference)];
  if (!selectedTerms) return 0;
  if (Array.isArray(selectedTerms)) {
    return selectedTerms.some(term => containsTerm(corpus, term)) ? 100 : 0;
  }
  const matchedCategories = Object.values(selectedTerms)
    .filter(terms => terms.some(term => containsTerm(corpus, term))).length;
  return Math.round((matchedCategories / Object.keys(selectedTerms).length) * 100);
}

function experienceCompatibilityScore(level, corpus) {
  if (!level) return 50;
  const welcomesBeginners = ['beginner', 'no experience', 'willing to learn', 'all skill levels']
    .some(term => containsTerm(corpus, term));
  const requiresExperience = ['advanced', 'prior experience', 'previous experience', 'required experience']
    .some(term => containsTerm(corpus, term));
  const normalizedLevel = normalizeText(level);

  if (normalizedLevel === 'beginner willing to learn' || normalizedLevel === 'beginner') {
    return requiresExperience ? 30 : welcomesBeginners ? 100 : 80;
  }
  if (normalizedLevel === 'intermediate') return requiresExperience ? 75 : 80;
  if (normalizedLevel === 'advanced') return requiresExperience ? 100 : welcomesBeginners ? 60 : 75;
  return 50;
}

function availabilityCompatibilityScore(availability, sourceText, corpus) {
  if (!availability) return 50;
  const source = normalizeText(sourceText);
  const availabilityTerms = {
    '1-2 hours/week': ['1 2 hours per week', '1 2 hours weekly', 'up to 2 hours per week'],
    '3-5 hours/week': ['3 5 hours per week', '3 5 hours weekly'],
    '6+ hours/week': ['6 or more hours per week', '6 plus hours per week', 'over 5 hours per week']
  };
  const selected = availabilityTerms[availability];
  const declaredCommitment = Object.entries(availabilityTerms)
    .find(([, terms]) => terms.some(term => containsTerm(source, term)))?.[0];
  if (!selected || !declaredCommitment) {
    return containsTerm(corpus, 'monthly') || containsTerm(corpus, 'occasional') ? 85 : 75;
  }
  return declaredCommitment === availability ? 100 : 35;
}

function explicitPreferenceScore(preferences, clubName) {
  if (!preferences.interestedClubs.length) return 50;
  return preferences.interestedClubs.some(name => normalizeText(name) === normalizeText(clubName)) ? 100 : 0;
}

function scoreReason({ matchedSkills, matchedResumeEvidence, matchingInterests, matchingGoals, activityScore, explicitScore, preferences, club }) {
  const reasons = [];
  if (matchedSkills.length) reasons.push(`your resume skills (${matchedSkills.slice(0, 3).join(', ')})`);
  else if (matchedResumeEvidence.length) reasons.push(`resume evidence (${matchedResumeEvidence.slice(0, 3).join(', ')})`);
  if (matchingInterests.length) reasons.push(`your interests (${matchingInterests.join(', ')})`);
  if (matchingGoals.length) reasons.push(`your goals (${matchingGoals.join(', ')})`);
  if (preferences.activityPreference && activityScore > 0) reasons.push('your preferred activities');
  if (explicitScore === 100) reasons.push(`your explicit interest in ${club.name}`);
  return reasons.length
    ? `Recommended because ${reasons.join(' and ')} align with this club's keywords, description, requirements, or activities.`
    : `This club may help you explore ${club.name}'s activities and develop new skills.`;
}

export function scoreClubRecommendations(clubs, { skills = [], resumeEvidence = [], preferences = {} } = {}) {
  const studentPreferences = normalizedPreferences(preferences);
  const resumeSignals = [];
  const seenResumeSignals = new Set();
  for (const signal of [...skills, ...resumeEvidence]) {
    if (typeof signal !== 'string' || !signal.trim()) continue;
    const normalizedSignal = normalizeText(signal);
    if (!seenResumeSignals.has(normalizedSignal)) {
      seenResumeSignals.add(normalizedSignal);
      resumeSignals.push(signal);
    }
  }

  return clubs.map(club => {
    const { text: corpus, knownKeywords } = clubCorpus(club);
    const matchedSkills = skills.filter(skill => containsTerm(corpus, skill));
    const matchedResumeEvidence = resumeSignals.filter(signal => containsTerm(corpus, signal));
    const resumeDenominator = Math.min(Math.max(resumeSignals.length, 3), 8);
    const resumeMatchScore = resumeSignals.length
      ? Math.round((matchedResumeEvidence.length / resumeDenominator) * 100)
      : 0;
    const matchingInterests = matchedTerms(studentPreferences.interests, corpus, INTEREST_TERMS);
    const matchingGoals = matchedTerms(studentPreferences.goals, corpus, GOAL_TERMS);
    const interestMatchScore = studentPreferences.interests.length
      ? Math.round((matchingInterests.length / studentPreferences.interests.length) * 100)
      : 50;
    const goalMatchScore = studentPreferences.goals.length
      ? Math.round((matchingGoals.length / studentPreferences.goals.length) * 100)
      : 50;
    const activityScore = activityPreferenceScore(studentPreferences.activityPreference, corpus);
    const experienceScore = experienceCompatibilityScore(studentPreferences.experienceLevel, corpus);
    const availabilityScore = availabilityCompatibilityScore(
      studentPreferences.availability,
      `${club.description || ''} ${(club.openings || []).map(opening => opening.requirements || '').join(' ')}`,
      corpus
    );
    const explicitScore = explicitPreferenceScore(studentPreferences, club.name);
    const scoreBreakdown = {
      resumeMatchScore,
      interestMatchScore,
      goalMatchScore,
      activityPreferenceScore: activityScore,
      experienceCompatibilityScore: experienceScore,
      availabilityCompatibilityScore: availabilityScore,
      explicitPreferenceScore: explicitScore
    };
    const matchScore = Math.round(Object.entries(RECOMMENDATION_WEIGHTS)
      .reduce((total, [key, weight]) => total + scoreBreakdown[`${key}Score`] * weight, 0) / 100);
    const skillsToDevelop = knownKeywords
      .filter(keyword => !seenResumeSignals.has(normalizeText(keyword)))
      .slice(0, 4);

    return {
      club,
      matchScore,
      ...scoreBreakdown,
      matchedSkills,
      matchedResumeEvidence,
      matchingInterests,
      matchingGoals,
      skillsToDevelop,
      reason: scoreReason({
        matchedSkills,
        matchedResumeEvidence,
        matchingInterests,
        matchingGoals,
        activityScore,
        explicitScore,
        preferences: studentPreferences,
        club
      })
    };
  }).sort((a, b) => b.matchScore - a.matchScore || a.club.name.localeCompare(b.club.name));
}

export function extractResumeEvidence(text, skills = extractSkillsFromText(text)) {
  const normalizedResume = normalizeText(text);
  const terms = new Set(skills);
  const questionnaireTerms = [
    ...Object.keys(INTEREST_TERMS),
    ...Object.values(INTEREST_TERMS).flat(),
    ...Object.keys(GOAL_TERMS),
    ...Object.values(GOAL_TERMS).flat()
  ];
  const resumeContextTerms = [
    'project', 'projects', 'internship', 'intern', 'leadership experience',
    'volunteer experience', 'team lead', 'event organizing'
  ];
  const recognizedTerms = [
    ...Object.values(CLUB_KEYWORDS).flat(),
    ...questionnaireTerms,
    ...resumeContextTerms
  ];
  for (const keyword of recognizedTerms) {
    if (containsTerm(normalizedResume, keyword)) terms.add(keyword);
  }
  return Array.from(terms);
}

export function parseStoredResume(value) {
  if (!value) return { skills: [], evidence: [] };
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return { skills: parsed, evidence: parsed };
    if (parsed && typeof parsed === 'object') {
      return {
        skills: Array.isArray(parsed.skills) ? parsed.skills : [],
        evidence: Array.isArray(parsed.evidence) ? parsed.evidence : []
      };
    }
  } catch (error) {
    console.error('Unable to parse stored resume evidence:', error);
  }
  return { skills: [], evidence: [] };
}

export function parseStoredPreferences(value) {
  if (!value) return {};
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch (error) {
    console.error('Unable to parse stored club preferences:', error);
    return {};
  }
}

/**
 * Rank clubs using resume evidence, questionnaire preferences, and the club's profile.
 */
export async function matchClubsForSkills(userSkills = [], preferences = {}, resumeEvidence = userSkills) {
  const clubs = await prisma.club.findMany({
    include: {
      facultyCoordinator: { select: { name: true, email: true } },
      _count: { select: { members: true, events: true } },
      openings: { select: { title: true, description: true, requirements: true } },
      events: { select: { title: true, description: true } }
    }
  });

  return scoreClubRecommendations(clubs, {
    skills: userSkills,
    resumeEvidence,
    preferences
  });
}
