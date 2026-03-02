import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: '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',
  baseURL: 'https://openrouter.ai/api/v1',
});

export async function POST(request: NextRequest) {
  try {
    const { name, email, phone, skills, experience, education } = await request.json();

    const prompt = `
Generate a comprehensive, professional resume for a person named ${name} with the following details:

PERSONAL INFORMATION:
- Name: ${name}
- Email: ${email || ''}
- Phone: ${phone || ''}

TECHNICAL SKILLS & EXPERTISE:
${skills.length > 0 ? skills.map((skill: string, index: number) => `${index + 1}. ${skill}`).join('\n') : 'No specific skills listed'}

PROFESSIONAL EXPERIENCE:
${experience.length > 0 ? experience.map((exp: any, index: number) => `
${index + 1}. ${exp.jobTitle}
    Company: ${exp.company}
    Duration: ${exp.duration}
    Responsibilities & Achievements: ${exp.description}
`).join('\n') : 'No work experience listed'}

EDUCATIONAL BACKGROUND:
${education.length > 0 ? education.map((edu: any, index: number) => `
${index + 1}. ${edu.degree}
    Institution: ${edu.institution}
    Year: ${edu.year}
`).join('\n') : 'No formal education listed'}

INSTRUCTIONS:
Create a well-structured, ATS-friendly resume that highlights practical skills, hands-on experience, and industry-specific competencies. Use clear formatting with sections, bullet points, and action verbs. Focus on quantifiable achievements where possible. Keep it concise but comprehensive, ideally 1 page worth of content.

Return the resume as a JSON object with the following structure:
{
  "name": "Full Name",
  "contact": {
    "email": "email@example.com",
    "phone": "phone number"
  },
  "about": "A detailed about me section highlighting personality, career goals, and unique value proposition (3-4 sentences)",
  "summary": "A brief professional summary (2-3 sentences)",
  "skills": ["skill1", "skill2", "skill3"],
  "experience": [
    {
      "jobTitle": "Job Title",
      "company": "Company Name",
      "duration": "Duration",
      "description": ["Bullet point 1", "Bullet point 2", "Bullet point 3"]
    }
  ],
  "education": [
    {
      "degree": "Degree Name",
      "institution": "Institution Name",
      "year": "Year"
    }
  ],
  "certifications": ["Certification 1", "Certification 2"],
  "projects": [
    {
      "name": "Project Name",
      "description": "Brief project description",
      "technologies": ["Tech1", "Tech2"]
    }
  ]
}

Enhance the resume content by:
1. Creating compelling descriptions that showcase achievements and impact
2. Adding relevant certifications based on skills and experience
3. Including notable projects that demonstrate practical application of skills
4. Writing an engaging "about" section that tells the candidate's story
5. Using action verbs and quantifiable results where possible
6. Tailoring content to make the candidate stand out for their target roles

Ensure all fields are filled appropriately based on the provided information. If information is missing, use reasonable defaults or omit sections.
`;

    const completion = await openai.chat.completions.create({
      model: 'meta-llama/llama-3.2-3b-instruct:free',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1500,
      temperature: 0.7,
    });

    const generatedResume = completion.choices[0].message.content;

    // Parse the JSON response
    let resumeData;
    try {
      // Extract JSON from the response if it's wrapped in markdown or other text
      const jsonMatch = generatedResume?.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? jsonMatch[0] : (generatedResume || '{}');
      resumeData = JSON.parse(jsonString);
    } catch (parseError) {
      console.error('Parse error:', parseError);
      console.error('Raw response:', generatedResume);
      return NextResponse.json({
        success: false,
        error: 'Failed to parse resume data. The AI response was not in the expected format.'
      }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: resumeData });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}