import test from 'node:test';
import assert from 'node:assert/strict';
import { extractResumeEvidence, scoreClubRecommendations } from './resumeService.js';

const clubs = [
  {
    name: 'The Byte Club',
    description: 'Full-stack development, software engineering, practical engineering, and hackathons.'
  },
  {
    name: 'ONYX E-Cell (Entrepreneurship Cell)',
    description: 'Entrepreneurship, leadership development, event organizing, founder networking, and startup incubation.'
  }
];

const resume = {
  skills: ['Python', 'Machine Learning', 'SQL', 'Django'],
  resumeEvidence: ['Python', 'Machine Learning', 'SQL', 'Django']
};

test('questionnaire changes club rankings without changing resume evidence', () => {
  const technicalRecommendations = scoreClubRecommendations(clubs, {
    ...resume,
    preferences: {
      interests: ['AI & Machine Learning'],
      goals: ['Improve technical skills'],
      activityPreference: 'Technical/building',
      experienceLevel: 'Beginner willing to learn',
      availability: '3-5 hours/week'
    }
  });
  const leadershipRecommendations = scoreClubRecommendations(clubs, {
    ...resume,
    preferences: {
      interests: ['Entrepreneurship', 'Leadership', 'Event Organizing'],
      goals: ['Gain leadership experience', 'Networking', 'Organize college events'],
      activityPreference: 'Combination of technical and managerial',
      experienceLevel: 'Beginner willing to learn',
      availability: '3-5 hours/week'
    }
  });

  assert.equal(technicalRecommendations[0].club.name, 'The Byte Club');
  assert.equal(leadershipRecommendations[0].club.name, 'ONYX E-Cell (Entrepreneurship Cell)');
  assert.equal(technicalRecommendations.find(item => item.club.name === 'The Byte Club').resumeMatchScore, 100);
  assert.equal(leadershipRecommendations.find(item => item.club.name === 'ONYX E-Cell (Entrepreneurship Cell)').interestMatchScore, 100);
  assert.deepEqual(
    leadershipRecommendations.find(item => item.club.name === 'ONYX E-Cell (Entrepreneurship Cell)').matchingGoals,
    ['Gain leadership experience', 'Networking', 'Organize college events']
  );
});

test('recommendation output exposes normalized component scores and resume evidence', () => {
  const [recommendation] = scoreClubRecommendations(clubs, {
    ...resume,
    preferences: { interests: ['Entrepreneurship'], goals: ['Networking'] }
  });

  for (const score of [
    recommendation.matchScore,
    recommendation.resumeMatchScore,
    recommendation.interestMatchScore,
    recommendation.goalMatchScore,
    recommendation.activityPreferenceScore,
    recommendation.experienceCompatibilityScore,
    recommendation.availabilityCompatibilityScore,
    recommendation.explicitPreferenceScore
  ]) {
    assert.ok(score >= 0 && score <= 100);
  }
  assert.ok(recommendation.reason.length > 0);
  assert.ok(Array.isArray(recommendation.skillsToDevelop));
});

test('club descriptions, openings, social metadata, and activities inform compatibility', () => {
  const [recommendation] = scoreClubRecommendations([{
    name: 'Campus Creators',
    description: 'Entrepreneurship and event organizing community.',
    socialLinks: JSON.stringify({
      domain: 'Leadership',
      initiatives: [{ title: 'Founder networking', desc: 'Organize college festivals.' }]
    }),
    openings: [{ title: 'New member', requirements: 'Beginners welcome; no experience required.' }],
    events: [{ title: 'Industry networking mixer', description: 'Monthly student networking event.' }]
  }], {
    preferences: {
      interests: ['Entrepreneurship', 'Leadership', 'Event Organizing', 'Networking'],
      goals: ['Gain leadership experience', 'Organize college events'],
      activityPreference: 'Management/event organizing',
      experienceLevel: 'Beginner willing to learn',
      availability: '1-2 hours/week'
    }
  });

  assert.equal(recommendation.interestMatchScore, 100);
  assert.equal(recommendation.goalMatchScore, 100);
  assert.equal(recommendation.activityPreferenceScore, 100);
  assert.equal(recommendation.experienceCompatibilityScore, 100);
  assert.deepEqual(recommendation.matchingInterests, ['Entrepreneurship', 'Leadership', 'Event Organizing', 'Networking']);
});

test('resume evidence includes recognized project, experience, and interest terms', () => {
  const evidence = extractResumeEvidence(
    'Built machine learning projects, led event organizing, and gained startup leadership experience.'
  );

  assert.ok(evidence.includes('Machine Learning'));
  assert.ok(evidence.includes('projects'));
  assert.ok(evidence.includes('event organizing'));
  assert.ok(evidence.includes('startup'));
  assert.ok(evidence.includes('leadership'));
});
