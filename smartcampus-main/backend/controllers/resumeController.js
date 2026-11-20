import { PrismaClient } from '@prisma/client';
import {
  parsePdfBuffer,
  extractSkillsFromText,
  extractResumeEvidence,
  matchClubsForSkills,
  parseStoredPreferences,
  parseStoredResume
} from '../services/resumeService.js';

const prisma = new PrismaClient();

// Upload and analyze resume
export const uploadResume = async (req, res) => {
  try {
    let rawText = '';

    if (req.file) {
      if (req.file.mimetype === 'application/pdf' || req.file.originalname.toLowerCase().endsWith('.pdf')) {
        rawText = await parsePdfBuffer(req.file.buffer);
      } else {
        // Plain text file
        rawText = req.file.buffer.toString('utf-8');
      }
    } else if (req.body.resumeText) {
      rawText = req.body.resumeText;
    } else {
      return res.status(400).json({ error: 'Please upload a PDF or text resume file.' });
    }

    if (!rawText || rawText.trim().length === 0) {
      return res.status(400).json({ error: 'Could not extract text from the uploaded file. Please make sure the PDF has selectable text.' });
    }

    // Extract skills and relevant experience/interest signals without retaining raw resume text.
    const extractedSkills = extractSkillsFromText(rawText);
    const resumeEvidence = extractResumeEvidence(rawText, extractedSkills);
    const existingUser = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { skills: true, clubPreferences: true }
    });
    const currentSkills = existingUser?.skills
      ? existingUser.skills.split(',').map(skill => skill.trim()).filter(Boolean)
      : [];
    const mergedSkills = Array.from(new Set([...currentSkills, ...extractedSkills]));

    await prisma.resume.upsert({
      where: { userId: req.user.id },
      create: {
        userId: req.user.id,
        techTags: JSON.stringify({ skills: extractedSkills, evidence: resumeEvidence })
      },
      update: {
        techTags: JSON.stringify({ skills: extractedSkills, evidence: resumeEvidence })
      }
    });

    if (extractedSkills.length > 0) {
      await prisma.user.update({
        where: { id: req.user.id },
        data: { skills: mergedSkills.join(', ') }
      });
    }

    const recommendations = await matchClubsForSkills(
      mergedSkills,
      parseStoredPreferences(existingUser?.clubPreferences),
      resumeEvidence
    );

    res.status(200).json({
      success: true,
      message: extractedSkills.length
        ? `Extracted ${extractedSkills.length} skills successfully!`
        : 'Resume analyzed. No standard technical skills were identified, but its project and interest evidence was included.',
      skills: mergedSkills,
      newlyExtracted: extractedSkills,
      recommendations
    });
  } catch (error) {
    console.error('Error processing resume upload:', error);
    res.status(500).json({ error: 'Failed to process resume: ' + error.message });
  }
};

// Get current recommendations based on stored skills or resume
export const getRecommendations = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { resume: true }
    });

    let skills = [];
    let resumeEvidence = [];
    if (user?.resume?.techTags) {
      const storedResume = parseStoredResume(user.resume.techTags);
      skills = storedResume.skills;
      resumeEvidence = storedResume.evidence;
    }

    if (skills.length === 0 && user?.skills) {
      skills = user.skills.split(',').map(s => s.trim()).filter(Boolean);
    }
    if (resumeEvidence.length === 0) resumeEvidence = skills;

    const recommendations = await matchClubsForSkills(
      skills,
      parseStoredPreferences(user?.clubPreferences),
      resumeEvidence
    );

    res.status(200).json({
      success: true,
      skills,
      hasResume: !!user?.resume,
      recommendations
    });
  } catch (error) {
    console.error('Error fetching recommendations:', error);
    res.status(500).json({ error: 'Failed to get recommendations' });
  }
};
