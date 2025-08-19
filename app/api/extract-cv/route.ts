import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { getOpenAIConfig } from '@/lib/openai-config';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Fonction pour normaliser les données extraites et assurer la rétrocompatibilité
function normalizeExtractedData(data: any) {
  console.log('🔍 [CV-EXTRACT] Starting normalization with data:', data);
  
  // Valider que data existe et est un objet
  if (!data || typeof data !== 'object') {
    console.error('❌ [CV-EXTRACT] Invalid data for normalization:', data);
    return createDefaultData();
  }

  // Normaliser les compétences
  let normalizedSkills = [];
  if (Array.isArray(data.skills)) {
    normalizedSkills = data.skills;
  } else if (data.skills && typeof data.skills === 'object' && Array.isArray(data.skills.technical)) {
    normalizedSkills = data.skills.technical;
  } else if (data.skills && typeof data.skills === 'object') {
    // Combiner toutes les catégories de compétences
    normalizedSkills = [
      ...(data.skills.technical || []),
      ...(data.skills.soft_skills || []),
      ...(data.skills.other || [])
    ];
  }

  // Normaliser les expériences
  const normalizedExperiences = (data.experiences || []).map((exp: any) => {
    if (typeof exp === 'string') return exp;
    if (!exp || typeof exp !== 'object') return '';
    
    const parts = [];
    if (exp.position) parts.push(`${exp.position}`);
    if (exp.company) parts.push(`chez ${exp.company}`);
    if (exp.start_date || exp.end_date) {
      const dates = [exp.start_date, exp.end_date || 'Présent'].filter(Boolean).join(' - ');
      if (dates) parts.push(`(${dates})`);
    }
    if (exp.description) parts.push(`\n${exp.description}`);
    if (exp.key_points && Array.isArray(exp.key_points) && exp.key_points.length) {
      parts.push(`\n• ${exp.key_points.join('\n• ')}`);
    }
    return parts.length > 0 ? parts.join(' ') : 'Expérience non spécifiée';
  });

  // Normaliser l'éducation
  const normalizedEducation = (data.education || []).map((edu: any) => {
    if (typeof edu === 'string') return edu;
    if (!edu || typeof edu !== 'object') return '';
    
    const parts = [];
    if (edu.degree) parts.push(edu.degree);
    if (edu.field) parts.push(`en ${edu.field}`);
    if (edu.institution) parts.push(`à ${edu.institution}`);
    if (edu.start_date || edu.end_date) {
      const dates = [edu.start_date, edu.end_date].filter(Boolean).join(' - ');
      if (dates) parts.push(`(${dates})`);
    }
    if (edu.honors) parts.push(`- ${edu.honors}`);
    return parts.length > 0 ? parts.join(' ') : 'Formation non spécifiée';
  });

  // Créer la structure normalisée
  const normalized = {
    ...data,
    // Champs principaux avec fallbacks
    first_name: data.first_name?.trim() || null,
    last_name: data.last_name?.trim() || null,
    email: data.email?.trim() || null,
    phone: data.phone?.trim() || null,
    
    // Arrays normalisés
    skills: normalizedSkills,
    experiences: normalizedExperiences,
    education: normalizedEducation,
    
    // Structure de données enrichie
    structured_data: {
      contact: {
        email: data.email?.trim() || null,
        phone: data.phone?.trim() || null,
        location: data.location?.trim() || null,
        linkedin: data.linkedin?.trim() || null,
        website: data.website?.trim() || null
      },
      professional_summary: data.summary?.trim() || null,
      detailed_experiences: Array.isArray(data.experiences) ? data.experiences : [],
      detailed_education: Array.isArray(data.education) ? data.education : [],
      categorized_skills: data.skills && typeof data.skills === 'object' ? data.skills : { technical: normalizedSkills },
      projects: Array.isArray(data.projects) ? data.projects : [],
      certifications: Array.isArray(data.certifications) ? data.certifications : [],
      languages: Array.isArray(data.languages) ? data.languages : [],
      achievements: Array.isArray(data.achievements) ? data.achievements : [],
      volunteer: Array.isArray(data.volunteer) ? data.volunteer : [],
      interests: Array.isArray(data.interests) ? data.interests : []
    }
  };

  console.log('✅ [CV-EXTRACT] Normalization completed:', {
    skills_count: normalized.skills.length,
    experiences_count: normalized.experiences.length,
    education_count: normalized.education.length,
    has_first_name: !!normalized.first_name,
    has_last_name: !!normalized.last_name
  });

  return normalized;
}

// Fonction pour créer des données par défaut en cas d'erreur
function createDefaultData() {
  return {
    first_name: null,
    last_name: null,
    email: null,
    phone: null,
    skills: [],
    experiences: [],
    education: [],
    structured_data: {
      contact: { email: null, phone: null, location: null, linkedin: null, website: null },
      professional_summary: null,
      detailed_experiences: [],
      detailed_education: [],
      categorized_skills: { technical: [], languages: [], soft_skills: [], certifications: [], other: [] },
      projects: [],
      certifications: [],
      languages: [],
      achievements: [],
      volunteer: [],
      interests: []
    }
  };
}

export async function POST(request: NextRequest) {
  console.log('🔍 [CV-EXTRACT] Starting CV extraction...');
  
  try {
    console.log('🔍 [CV-EXTRACT] Parsing form data...');
    const form = await request.formData();
    const file = form.get('file') as File | null;

    console.log('🔍 [CV-EXTRACT] File received:', {
      name: file?.name,
      size: file?.size,
      type: file?.type
    });

    if (!file || typeof file.arrayBuffer !== 'function') {
      console.log('❌ [CV-EXTRACT] File validation failed');
      return NextResponse.json({ error: 'Fichier manquant' }, { status: 400 });
    }

    console.log('🔍 [CV-EXTRACT] Converting file to buffer...');
    const buffer = Buffer.from(await file.arrayBuffer());
    const tempFilePath = path.join(os.tmpdir(), file.name);

    console.log('🔍 [CV-EXTRACT] Writing temp file:', tempFilePath);
    fs.writeFileSync(tempFilePath, new Uint8Array(buffer));

    console.log('🔍 [CV-EXTRACT] Creating OpenAI assistant...');
    // Utiliser l'Assistants API avec file_search pour traiter le PDF
    const assistant = await openai.beta.assistants.create({
      name: "Advanced CV Extractor",
      instructions: `You are an expert CV/Resume parser. Extract ALL available information from the CV document with maximum precision and completeness.

CRITICAL INSTRUCTIONS:
1. Read the ENTIRE document carefully - don't miss any sections
2. Extract information from ALL pages if it's a multi-page document
3. Be thorough and include ALL relevant details found
4. If information is unclear or incomplete, include what you can determine
5. Use the exact text from the CV when possible
6. Return ONLY a valid JSON object with this EXACT structure:

{
  "first_name": "string or null",
  "last_name": "string or null", 
  "email": "string or null",
  "phone": "string or null",
  "location": "string or null (city, country, address)",
  "linkedin": "string or null",
  "website": "string or null",
  "summary": "string or null (professional summary/objective)",
  "experiences": [
    {
      "position": "exact job title",
      "company": "company name", 
      "location": "work location if mentioned",
      "start_date": "start date (keep original format)",
      "end_date": "end date or 'Present'",
      "duration": "calculated duration if possible",
      "description": "full job description with responsibilities and achievements",
      "key_points": ["individual bullet points or achievements"],
      "technologies": ["specific tech/tools mentioned for this role"]
    }
  ],
  "education": [
    {
      "degree": "degree name and level",
      "field": "field of study", 
      "institution": "school/university name",
      "location": "school location if mentioned",
      "start_date": "start date",
      "end_date": "end date or expected graduation",
      "gpa": "GPA if mentioned",
      "honors": "honors, distinctions, cum laude, etc.",
      "relevant_coursework": ["specific courses if mentioned"]
    }
  ],
  "skills": {
    "technical": ["programming languages, software, tools"],
    "languages": ["spoken languages with proficiency levels"],
    "soft_skills": ["soft skills, interpersonal skills"],
    "certifications": ["certifications, licenses"],
    "other": ["any other categorized skills"]
  },
  "projects": [
    {
      "name": "project name",
      "description": "project description", 
      "technologies": ["technologies used"],
      "url": "project URL if mentioned"
    }
  ],
  "certifications": [
    {
      "name": "certification name",
      "issuer": "issuing organization",
      "date": "issue date",
      "expiry": "expiry date if applicable",
      "credential_id": "ID if mentioned"
    }
  ],
  "languages": [
    {
      "language": "language name",
      "proficiency": "proficiency level (native, fluent, intermediate, etc.)"
    }
  ],
  "achievements": ["awards, recognitions, notable achievements"],
  "volunteer": ["volunteer work, community involvement"],
  "interests": ["hobbies, interests, activities"]
}

EXTRACTION GUIDELINES:
- For experiences: Extract ALL work experience, internships, freelance work
- For skills: Categorize properly (technical vs soft skills vs languages)
- For education: Include ALL degrees, certifications, relevant courses
- For dates: Keep original format from CV (don't convert)
- For descriptions: Include full context but SEPARATE achievements from descriptions
- For key_points: Extract bullet points, responsibilities, and specific tasks
- Be exhaustive - better to include too much than miss important details

ACHIEVEMENT IDENTIFICATION (CRITICAL):
- Look for specific MEASURABLE accomplishments and separate them from general descriptions
- Search for action verbs: "achieved", "improved", "increased", "reduced", "won", "awarded", "delivered", "exceeded", "optimized", "generated", "saved"
- Extract QUANTIFIED results: "30% cost reduction", "managed 250+ users", "increased performance by 40%", "$2M revenue growth"
- Awards and recognitions: "Employee of the month", "Best performer", "Innovation award", "Top 5% performer"
- Professional certifications earned during employment
- Project successes with measurable outcomes: "completed project 2 weeks ahead of schedule"
- Leadership achievements: "promoted to team lead", "managed team of 15 people"
- DO NOT include routine job responsibilities in achievements - only standout accomplishments

Return ONLY the JSON object, no explanations or additional text.`,
      model: getOpenAIConfig('CV_EXTRACTION').model,
      tools: [{ type: "file_search" }]
    });

    console.log('🔍 [CV-EXTRACT] Uploading file to OpenAI...');
    const uploadedFile = await openai.files.create({
      file: fs.createReadStream(tempFilePath),
      purpose: "assistants",
    });
    console.log('✅ [CV-EXTRACT] File uploaded:', uploadedFile.id);

    console.log('🔍 [CV-EXTRACT] Creating thread...');
    const thread = await openai.beta.threads.create({
      messages: [
        {
          role: "user",
          content: `Please extract ALL information from this CV/Resume document with maximum precision and completeness. 

IMPORTANT REMINDERS:
- Read EVERY section of the document carefully
- Extract information from ALL pages if multi-page
- Include ALL work experiences, education, skills, projects, certifications
- Preserve exact text and formatting when extracting
- Be thorough - don't miss any details
- Return ONLY the JSON object as specified in your instructions

Analyze this CV document now:`,
          attachments: [{ file_id: uploadedFile.id, tools: [{ type: "file_search" }] }]
        }
      ]
    });

    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: assistant.id
    });

    // Attendre la completion
    let runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    while (runStatus.status === "in_progress" || runStatus.status === "queued") {
      await new Promise(resolve => setTimeout(resolve, 1000));
      runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    }

    const messages = await openai.beta.threads.messages.list(thread.id);
    const lastMessage = messages.data[0];
    const content = lastMessage.content[0];
    
    let responseText = '';
    if (content.type === 'text') {
      responseText = content.text.value;
    }

    // Nettoyage OpenAI
    await openai.files.del(uploadedFile.id);
    await openai.beta.assistants.del(assistant.id);

    // Parser la réponse JSON
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      // Fallback: extraire JSON de la réponse si elle contient du texte supplémentaire
      const jsonMatch = responseText.match(/\{.*\}/s);
      if (jsonMatch) {
        data = JSON.parse(jsonMatch[0]);
      } else {
        // Si aucun JSON valide, utiliser des valeurs par défaut avec la nouvelle structure
        data = {
          first_name: null,
          last_name: null,
          email: null,
          phone: null,
          location: null,
          linkedin: null,
          website: null,
          summary: null,
          experiences: [],
          education: [],
          skills: {
            technical: [],
            languages: [],
            soft_skills: [],
            certifications: [],
            other: []
          },
          projects: [],
          certifications: [],
          languages: [],
          achievements: [],
          volunteer: [],
          interests: []
        };
      }
    }

    // Normaliser les données pour assurer la compatibilité avec l'app existante
    console.log('🔍 [CV-EXTRACT] Raw extracted data before normalization:', data);
    const normalizedData = normalizeExtractedData(data);
    console.log('✅ [CV-EXTRACT] Normalized data structure:', {
      hasFirstName: !!normalizedData.first_name,
      hasLastName: !!normalizedData.last_name,
      skillsCount: normalizedData.skills?.length || 0,
      experiencesCount: normalizedData.experiences?.length || 0,
      educationCount: normalizedData.education?.length || 0,
      hasStructuredData: !!normalizedData.structured_data,
      allTopLevelKeys: Object.keys(normalizedData)
    });

    fs.unlinkSync(tempFilePath);

    console.log('✅ [CV-EXTRACT] Extraction completed successfully, returning data');
    return NextResponse.json(normalizedData);
  } catch (error) {
    console.error('❌ [CV-EXTRACT] Error occurred:', error);
    
    // Log plus détaillé de l'erreur
    if (error instanceof Error) {
      console.error('❌ [CV-EXTRACT] Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    }
    
    // Nettoyage en cas d'erreur si le fichier temp existe
    try {
      const tempFilePath = path.join(os.tmpdir(), 'temp_cv_file');
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
        console.log('🧹 [CV-EXTRACT] Temp file cleaned up after error');
      }
    } catch (cleanupError) {
      console.warn('⚠️ [CV-EXTRACT] Could not clean up temp file:', cleanupError);
    }
    
    return NextResponse.json({ 
      error: "Erreur lors de l'extraction",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}