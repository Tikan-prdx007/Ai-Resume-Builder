'use client';

import { useState } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useTranslation } from '../hooks/useTranslation';
import LanguageSelector from '../components/LanguageSelector';
import VoiceInput from '../components/VoiceInput';

interface Experience {
  jobTitle: string;
  company: string;
  duration: string;
  description: string;
}

interface Education {
  degree: string;
  institution: string;
  year: string;
}

export default function Home() {
  const { t, currentLanguage, setCurrentLanguage } = useTranslation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState('');
  const [experience, setExperience] = useState<Experience[]>([]);
  const [education, setEducation] = useState<Education[]>([]);
  const [generatedResume, setGeneratedResume] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [alertMessage, setAlertMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedResume, setEditedResume] = useState<any>(null);

  const addSkill = () => {
    if (skillInput.trim()) {
      setSkills([...skills, skillInput.trim()]);
      setSkillInput('');
    }
  };

  const removeSkill = (index: number) => {
    setSkills(skills.filter((_, i) => i !== index));
  };

  const addExperience = () => {
    setExperience([...experience, { jobTitle: '', company: '', duration: '', description: '' }]);
  };

  const updateExperience = (index: number, field: keyof Experience, value: string) => {
    const updated = [...experience];
    updated[index][field] = value;
    setExperience(updated);
  };

  const removeExperience = (index: number) => {
    setExperience(experience.filter((_, i) => i !== index));
  };

  const addEducation = () => {
    setEducation([...education, { degree: '', institution: '', year: '' }]);
  };

  const updateEducation = (index: number, field: keyof Education, value: string) => {
    const updated = [...education];
    updated[index][field] = value;
    setEducation(updated);
  };

  const removeEducation = (index: number) => {
    setEducation(education.filter((_, i) => i !== index));
  };

  const generateResume = async () => {
    // Validation
    if (!name.trim()) {
      setAlertMessage({ type: 'error', message: 'Please enter your full name' });
      return;
    }
    if (!email.trim()) {
      setAlertMessage({ type: 'error', message: 'Please enter your email address' });
      return;
    }
    if (!phone.trim()) {
      setAlertMessage({ type: 'error', message: 'Please enter your phone number' });
      return;
    }
    if (skills.length === 0) {
      setAlertMessage({ type: 'error', message: 'Please add at least one skill' });
      return;
    }
    if (experience.length === 0) {
      setAlertMessage({ type: 'error', message: 'Please add at least one work experience entry' });
      return;
    }
    if (education.length === 0) {
      setAlertMessage({ type: 'error', message: 'Please add at least one education entry' });
      return;
    }

    // Validate experience fields
    for (let i = 0; i < experience.length; i++) {
      const exp = experience[i];
      if (!exp.jobTitle.trim() || !exp.company.trim() || !exp.duration.trim() || !exp.description.trim()) {
        setAlertMessage({ type: 'error', message: `Please fill in all fields for work experience entry ${i + 1}` });
        return;
      }
    }

    // Validate education fields
    for (let i = 0; i < education.length; i++) {
      const edu = education[i];
      if (!edu.degree.trim() || !edu.institution.trim() || !edu.year.trim()) {
        setAlertMessage({ type: 'error', message: `Please fill in all fields for education entry ${i + 1}` });
        return;
      }
    }

    setLoading(true);
    setAlertMessage(null);
    try {
      const response = await fetch('/api/generate-resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone, skills, experience, education }),
      });
      const data = await response.json();
      if (data.success) {
        setGeneratedResume(data.data);
        setEditedResume(JSON.parse(JSON.stringify(data.data))); // Deep copy for editing
        setAlertMessage({ type: 'success', message: 'Resume generated successfully!' });
      } else {
        setAlertMessage({ type: 'error', message: 'Error generating resume: ' + data.error });
      }
    } catch (error) {
      setAlertMessage({ type: 'error', message: 'Network error. Please check your connection and try again.' });
    }
    setLoading(false);
  };

  const saveResume = async () => {
    try {
      const response = await fetch('/api/resumes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone, skills, experience, education, generatedResume: JSON.stringify(generatedResume) }),
      });
      const data = await response.json();
      if (data.success) {
        setAlertMessage({ type: 'success', message: 'Resume saved successfully!' });
      } else {
        setAlertMessage({ type: 'error', message: 'Error saving resume: ' + data.error });
      }
    } catch (error) {
      setAlertMessage({ type: 'error', message: 'Network error while saving resume. Please try again.' });
    }
  };

  const downloadResume = async () => {
    const resumeToDownload = isEditing ? editedResume : generatedResume;
    if (!resumeToDownload) {
      setAlertMessage({ type: 'error', message: 'No resume to download. Please generate a resume first.' });
      return;
    }

    try {
      const pdf = new jsPDF();
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      let yPosition = margin;

      // Set font
      pdf.setFont('helvetica', 'normal');

      // Header - Name
      pdf.setFontSize(24);
      pdf.setFont('helvetica', 'bold');
      pdf.text(resumeToDownload.name || name, margin, yPosition);
      yPosition += 15;

      // Contact Info
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      if (resumeToDownload.contact) {
        const contactInfo = [];
        if (resumeToDownload.contact.email) contactInfo.push(resumeToDownload.contact.email);
        if (resumeToDownload.contact.phone) contactInfo.push(resumeToDownload.contact.phone);
        if (contactInfo.length > 0) {
          pdf.text(contactInfo.join(' | '), margin, yPosition);
          yPosition += 10;
        }
      }
      yPosition += 10;

      // About section
      if (resumeToDownload.about) {
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.text('ABOUT ME', margin, yPosition);
        yPosition += 8;
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'normal');
        const aboutLines = pdf.splitTextToSize(resumeToDownload.about, pageWidth - 2 * margin);
        pdf.text(aboutLines, margin, yPosition);
        yPosition += aboutLines.length * 5 + 10;
      }

      // Summary
      if (resumeToDownload.summary) {
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.text('PROFESSIONAL SUMMARY', margin, yPosition);
        yPosition += 8;
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'normal');
        const summaryLines = pdf.splitTextToSize(resumeToDownload.summary, pageWidth - 2 * margin);
        pdf.text(summaryLines, margin, yPosition);
        yPosition += summaryLines.length * 5 + 10;
      }

      // Skills
      if (resumeToDownload.skills && resumeToDownload.skills.length > 0) {
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.text('SKILLS', margin, yPosition);
        yPosition += 8;
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'normal');
        pdf.text(resumeToDownload.skills.join(' • '), margin, yPosition);
        yPosition += 15;
      }

      // Experience
      if (resumeToDownload.experience && resumeToDownload.experience.length > 0) {
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.text('PROFESSIONAL EXPERIENCE', margin, yPosition);
        yPosition += 10;

        resumeToDownload.experience.forEach((exp: any) => {
          // Check if we need a new page
          if (yPosition > pageHeight - 50) {
            pdf.addPage();
            yPosition = margin;
          }

          pdf.setFontSize(12);
          pdf.setFont('helvetica', 'bold');
          pdf.text(exp.jobTitle, margin, yPosition);
          pdf.setFont('helvetica', 'normal');
          pdf.text(exp.company + ' | ' + exp.duration, pageWidth - margin, yPosition, { align: 'right' });
          yPosition += 8;

          if (exp.description && Array.isArray(exp.description)) {
            pdf.setFontSize(11);
            exp.description.forEach((desc: string) => {
              pdf.text('• ' + desc, margin + 5, yPosition);
              yPosition += 6;
            });
          }
          yPosition += 8;
        });
      }

      // Projects
      if (resumeToDownload.projects && resumeToDownload.projects.length > 0) {
        // Check if we need a new page
        if (yPosition > pageHeight - 50) {
          pdf.addPage();
          yPosition = margin;
        }

        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.text('PROJECTS', margin, yPosition);
        yPosition += 10;

        resumeToDownload.projects.forEach((project: any) => {
          pdf.setFontSize(12);
          pdf.setFont('helvetica', 'bold');
          pdf.text(project.name, margin, yPosition);
          yPosition += 6;
          pdf.setFontSize(11);
          pdf.setFont('helvetica', 'normal');
          pdf.text(project.description, margin, yPosition);
          yPosition += 6;
          if (project.technologies && project.technologies.length > 0) {
            pdf.setFont('helvetica', 'italic');
            pdf.text('Technologies: ' + project.technologies.join(', '), margin, yPosition);
            yPosition += 8;
          }
        });
      }

      // Certifications
      if (resumeToDownload.certifications && resumeToDownload.certifications.length > 0) {
        // Check if we need a new page
        if (yPosition > pageHeight - 50) {
          pdf.addPage();
          yPosition = margin;
        }

        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.text('CERTIFICATIONS', margin, yPosition);
        yPosition += 8;
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'normal');
        pdf.text(resumeToDownload.certifications.join(' • '), margin, yPosition);
        yPosition += 15;
      }

      // Education
      if (resumeToDownload.education && resumeToDownload.education.length > 0) {
        // Check if we need a new page
        if (yPosition > pageHeight - 50) {
          pdf.addPage();
          yPosition = margin;
        }

        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.text('EDUCATION', margin, yPosition);
        yPosition += 10;

        resumeToDownload.education.forEach((edu: any) => {
          pdf.setFontSize(12);
          pdf.setFont('helvetica', 'bold');
          pdf.text(edu.degree, margin, yPosition);
          pdf.setFont('helvetica', 'normal');
          pdf.text(edu.institution + ' | ' + edu.year, pageWidth - margin, yPosition, { align: 'right' });
          yPosition += 8;
        });
      }

      pdf.save(`${name}_resume.pdf`);
      setAlertMessage({ type: 'success', message: 'Resume downloaded successfully!' });
    } catch (error) {
      setAlertMessage({ type: 'error', message: 'Error generating PDF. Please try again.' });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 relative">
      {/* Alert Messages */}
      {alertMessage && (
        <div className="fixed top-4 right-4 z-50 max-w-sm">
          <div className={`rounded-lg p-4 shadow-lg border ${
            alertMessage.type === 'success'
              ? 'bg-green-50 border-green-200 text-green-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            <div className="flex items-center">
              <div className="flex-shrink-0">
                {alertMessage.type === 'success' ? (
                  <svg className="h-5 w-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium">{alertMessage.message}</p>
              </div>
              <div className="ml-auto pl-3">
                <button
                  onClick={() => setAlertMessage(null)}
                  className={`inline-flex rounded-md p-1.5 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                    alertMessage.type === 'success'
                      ? 'text-green-400 hover:text-green-600 focus:ring-green-500'
                      : 'text-red-400 hover:text-red-600 focus:ring-red-500'
                  }`}
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200/50 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{t('title')}</h1>
                <p className="text-sm text-gray-600">{t('subtitle')}</p>
              </div>
            </div>
            <LanguageSelector currentLanguage={currentLanguage} onLanguageChange={(lang) => setCurrentLanguage(lang as any)} />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center px-4 py-2 bg-indigo-100 text-indigo-800 rounded-full text-sm font-medium mb-6">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            AI-Powered Resume Builder
          </div>
          <h2 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
            Create Professional
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
              Resumes Instantly
            </span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            {t('description')}
          </p>
        </div>

        {/* Personal Information Section */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl p-10 mb-12 border border-white/30 hover:shadow-3xl transition-all duration-300">
          <div className="flex items-center mb-10">
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-5 rounded-2xl mr-6 shadow-xl">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">{t('personalInfo')}</h2>
              <p className="text-gray-600 text-lg">Tell us about yourself to get started</p>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-gray-800 uppercase tracking-wide">{t('fullName')}</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder={t('enterFullName')}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border-2 border-gray-200 rounded-xl px-6 py-4 text-lg focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 transition-all duration-200 bg-gray-50 hover:bg-white"
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <VoiceInput
                    onTranscription={(text) => setName(text)}
                    language={currentLanguage === 'en' ? 'en-US' : currentLanguage === 'es' ? 'es-ES' : currentLanguage === 'hi' ? 'hi-IN' : 'en-US'}
                    placeholder={t('clickToSpeak')}
                    fieldLabel={t('fullName')}
                  />
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-gray-800 uppercase tracking-wide">{t('email')}</label>
              <input
                type="email"
                placeholder={t('enterEmail')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border-2 border-gray-200 rounded-xl px-6 py-4 text-lg focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 transition-all duration-200 bg-gray-50 hover:bg-white"
              />
            </div>
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-gray-800 uppercase tracking-wide">{t('phone')}</label>
              <input
                type="tel"
                placeholder={t('enterPhone')}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full border-2 border-gray-200 rounded-xl px-6 py-4 text-lg focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 transition-all duration-200 bg-gray-50 hover:bg-white"
              />
            </div>
          </div>
        </div>

        {/* Skills Section */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl p-10 mb-12 border border-white/30 hover:shadow-3xl transition-all duration-300">
          <div className="flex items-center mb-10">
            <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-5 rounded-2xl mr-6 shadow-xl">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">{t('skills')}</h2>
              <p className="text-gray-600 text-lg">Showcase your technical expertise</p>
            </div>
          </div>
          <div className="flex gap-4 mb-8">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder={t('enterSkill')}
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addSkill()}
                className="w-full border-2 border-gray-200 rounded-xl px-6 py-4 text-lg focus:ring-4 focus:ring-green-100 focus:border-green-400 transition-all duration-200 bg-gray-50 hover:bg-white pr-12"
                aria-label="Skill input"
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <VoiceInput
                  onTranscription={(text) => setSkillInput(text)}
                  language={currentLanguage === 'en' ? 'en-US' : currentLanguage === 'es' ? 'es-ES' : currentLanguage === 'hi' ? 'hi-IN' : 'en-US'}
                  placeholder={t('clickToSpeak')}
                  fieldLabel={t('skills')}
                />
              </div>
            </div>
            <button
              onClick={addSkill}
              className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-8 py-4 rounded-xl hover:from-green-600 hover:to-emerald-700 focus:ring-4 focus:ring-green-100 focus:ring-offset-2 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              aria-label="Add skill"
            >
              <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              {t('addSkill')}
            </button>
          </div>
          <div className="flex flex-wrap gap-4">
            {skills.map((skill, index) => (
              <span key={index} className="bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 px-6 py-3 rounded-full flex items-center gap-3 text-base font-semibold shadow-md hover:shadow-lg transition-all duration-200 border border-green-200">
                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {skill}
                <button
                  onClick={() => removeSkill(index)}
                  className="text-green-600 hover:text-red-600 hover:bg-red-100 rounded-full p-1 transition-all duration-200 hover:scale-110"
                  aria-label={`Remove ${skill} skill`}
                  type="button"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            ))}
          </div>
          {skills.length === 0 && (
            <div className="text-center py-12">
              <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-gray-500 text-lg">{t('noSkills')}</p>
            </div>
          )}
        </div>

        {/* Work Experience Section */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl p-10 mb-12 border border-white/30 hover:shadow-3xl transition-all duration-300">
          <div className="flex items-center mb-10">
            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-5 rounded-2xl mr-6 shadow-xl">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m8 0V8a2 2 0 01-2 2H8a2 2 0 01-2-2V6m8 0H8" />
              </svg>
            </div>
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">{t('workExperience')}</h2>
              <p className="text-gray-600 text-lg">Highlight your professional journey</p>
            </div>
          </div>
          {experience.map((exp, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-6 mb-6 bg-gray-50">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">{t('jobTitle')}</label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder={t('enterJobTitle')}
                      value={exp.jobTitle}
                      onChange={(e) => updateExperience(index, 'jobTitle', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 pr-12 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <VoiceInput
                        onTranscription={(text) => updateExperience(index, 'jobTitle', text)}
                        language={currentLanguage === 'en' ? 'en-US' : currentLanguage === 'es' ? 'es-ES' : currentLanguage === 'hi' ? 'hi-IN' : 'en-US'}
                        placeholder={t('clickToSpeak')}
                        fieldLabel={t('jobTitle')}
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">{t('company')}</label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder={t('enterCompany')}
                      value={exp.company}
                      onChange={(e) => updateExperience(index, 'company', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 pr-12 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <VoiceInput
                        onTranscription={(text) => updateExperience(index, 'company', text)}
                        language={currentLanguage === 'en' ? 'en-US' : currentLanguage === 'es' ? 'es-ES' : currentLanguage === 'hi' ? 'hi-IN' : 'en-US'}
                        placeholder={t('clickToSpeak')}
                        fieldLabel={t('company')}
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">{t('duration')}</label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder={t('enterDuration')}
                      value={exp.duration}
                      onChange={(e) => updateExperience(index, 'duration', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 pr-12 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <VoiceInput
                        onTranscription={(text) => updateExperience(index, 'duration', text)}
                        language={currentLanguage === 'en' ? 'en-US' : currentLanguage === 'es' ? 'es-ES' : currentLanguage === 'hi' ? 'hi-IN' : 'en-US'}
                        placeholder={t('clickToSpeak')}
                        fieldLabel={t('duration')}
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="space-y-2 mb-4">
                <label className="block text-sm font-medium text-gray-700">{t('jobDescription')}</label>
                <div className="relative">
                  <textarea
                    placeholder={t('enterJobDescription')}
                    value={exp.description}
                    onChange={(e) => updateExperience(index, 'description', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 pr-12 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    rows={4}
                  />
                  <div className="absolute right-3 top-4">
                    <VoiceInput
                      onTranscription={(text) => updateExperience(index, 'description', text)}
                      language={currentLanguage === 'en' ? 'en-US' : currentLanguage === 'es' ? 'es-ES' : currentLanguage === 'hi' ? 'hi-IN' : 'en-US'}
                      placeholder={t('clickToSpeak')}
                      fieldLabel={t('jobDescription')}
                    />
                  </div>
                </div>
              </div>
              <button
                onClick={() => removeExperience(index)}
                className="text-red-600 hover:text-red-800 font-medium flex items-center gap-2 transition-colors"
                type="button"
                aria-label="Remove work experience entry"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                {t('removeExperience')}
              </button>
            </div>
          ))}
          <button
            onClick={addExperience}
            className="w-full bg-blue-500 text-white px-6 py-4 rounded-lg hover:bg-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors font-medium flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            {t('addExperience')}
          </button>
        </div>

        {/* Education Section */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl p-10 mb-12 border border-white/30 hover:shadow-3xl transition-all duration-300">
          <div className="flex items-center mb-10">
            <div className="bg-gradient-to-br from-purple-500 to-pink-600 p-5 rounded-2xl mr-6 shadow-xl">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">{t('education')}</h2>
              <p className="text-gray-600 text-lg">Show your academic background</p>
            </div>
          </div>
          {education.map((edu, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-6 mb-6 bg-gray-50">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">{t('degree')}</label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder={t('enterDegree')}
                      value={edu.degree}
                      onChange={(e) => updateEducation(index, 'degree', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 pr-12 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <VoiceInput
                        onTranscription={(text) => updateEducation(index, 'degree', text)}
                        language={currentLanguage === 'en' ? 'en-US' : currentLanguage === 'es' ? 'es-ES' : currentLanguage === 'hi' ? 'hi-IN' : 'en-US'}
                        placeholder={t('clickToSpeak')}
                        fieldLabel={t('degree')}
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">{t('institution')}</label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder={t('enterInstitution')}
                      value={edu.institution}
                      onChange={(e) => updateEducation(index, 'institution', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 pr-12 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <VoiceInput
                        onTranscription={(text) => updateEducation(index, 'institution', text)}
                        language={currentLanguage === 'en' ? 'en-US' : currentLanguage === 'es' ? 'es-ES' : currentLanguage === 'hi' ? 'hi-IN' : 'en-US'}
                        placeholder={t('clickToSpeak')}
                        fieldLabel={t('institution')}
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">{t('year')}</label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder={t('enterYear')}
                      value={edu.year}
                      onChange={(e) => updateEducation(index, 'year', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 pr-12 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <VoiceInput
                        onTranscription={(text) => updateEducation(index, 'year', text)}
                        language={currentLanguage === 'en' ? 'en-US' : currentLanguage === 'es' ? 'es-ES' : currentLanguage === 'hi' ? 'hi-IN' : 'en-US'}
                        placeholder={t('clickToSpeak')}
                        fieldLabel={t('year')}
                      />
                    </div>
                  </div>
                </div>
              </div>
              <button
                onClick={() => removeEducation(index)}
                className="text-red-600 hover:text-red-800 font-medium flex items-center gap-2 transition-colors"
                type="button"
                aria-label="Remove education entry"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                {t('removeEducation')}
              </button>
            </div>
          ))}
          <button
            onClick={addEducation}
            className="w-full bg-purple-500 text-white px-6 py-4 rounded-lg hover:bg-purple-600 focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-colors font-medium flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            {t('addEducation')}
          </button>
        </div>

        {/* Generate Resume Section */}
        <div className="text-center mb-16">
          <div className="bg-gradient-to-r from-purple-500 via-indigo-500 to-blue-500 rounded-3xl p-12 shadow-2xl">
            <div className="max-w-2xl mx-auto">
              <div className="inline-flex items-center px-6 py-3 bg-white/20 backdrop-blur-sm rounded-full text-white text-sm font-medium mb-8">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                AI-Powered Generation
              </div>
              <h3 className="text-3xl font-bold text-white mb-6">Ready to Create Your Resume?</h3>
              <p className="text-white/90 text-lg mb-8 leading-relaxed">
                {t('aiDescription')}
              </p>
              <button
                onClick={generateResume}
                disabled={loading}
                className="bg-white text-purple-600 px-12 py-5 rounded-2xl hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed focus:ring-4 focus:ring-white/30 focus:ring-offset-2 focus:ring-offset-purple-600 transition-all duration-300 font-bold text-xl shadow-xl hover:shadow-2xl transform hover:-translate-y-1"
                aria-label={loading ? "Generating resume" : "Generate AI resume"}
              >
                {loading ? (
                  <div className="flex items-center gap-4">
                    <svg className="animate-spin h-6 w-6" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {t('generating')}
                  </div>
                ) : (
                  <div className="flex items-center gap-4">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    {t('generateResume')}
                  </div>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Generated Resume Section */}
        {generatedResume && (
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl p-10 mb-12 border border-white/30">
            <div className="flex items-center mb-10">
              <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-5 rounded-2xl mr-6 shadow-xl">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">{t('generatedResume')}</h2>
                <p className="text-gray-600 text-lg">Your professionally crafted resume is ready</p>
              </div>
            </div>
            <div id="resume-content" className="bg-gradient-to-br from-gray-50 to-gray-100 p-8 rounded-2xl border border-gray-200 shadow-inner max-h-96 overflow-y-auto">
              <div className="font-sans text-gray-900">
                <h1 className="text-3xl font-bold mb-2">{(isEditing ? editedResume : generatedResume)?.name}</h1>
                {(isEditing ? editedResume : generatedResume)?.contact && (
                  <div className="text-sm text-gray-600 mb-4">
                    {(isEditing ? editedResume : generatedResume)?.contact.email && <span>{(isEditing ? editedResume : generatedResume)?.contact.email}</span>}
                    {(isEditing ? editedResume : generatedResume)?.contact.email && (isEditing ? editedResume : generatedResume)?.contact.phone && <span> | </span>}
                    {(isEditing ? editedResume : generatedResume)?.contact.phone && <span>{(isEditing ? editedResume : generatedResume)?.contact.phone}</span>}
                  </div>
                )}

                {(isEditing ? editedResume : generatedResume)?.about && (
                  <div className="mb-6">
                    <h2 className="text-xl font-bold text-gray-800 mb-2">ABOUT ME</h2>
                    {isEditing ? (
                      <textarea
                        value={editedResume.about}
                        onChange={(e) => setEditedResume({...editedResume, about: e.target.value})}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        rows={4}
                      />
                    ) : (
                      <p className="text-gray-700 leading-relaxed">{(isEditing ? editedResume : generatedResume)?.about}</p>
                    )}
                  </div>
                )}

                {(isEditing ? editedResume : generatedResume)?.summary && (
                  <div className="mb-6">
                    <h2 className="text-xl font-bold text-gray-800 mb-2">PROFESSIONAL SUMMARY</h2>
                    {isEditing ? (
                      <textarea
                        value={editedResume.summary}
                        onChange={(e) => setEditedResume({...editedResume, summary: e.target.value})}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        rows={3}
                      />
                    ) : (
                      <p className="text-gray-700 leading-relaxed">{(isEditing ? editedResume : generatedResume)?.summary}</p>
                    )}
                  </div>
                )}

                {(isEditing ? editedResume : generatedResume)?.skills && (isEditing ? editedResume : generatedResume)?.skills.length > 0 && (
                  <div className="mb-6">
                    <h2 className="text-xl font-bold text-gray-800 mb-2">SKILLS</h2>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editedResume.skills.join(', ')}
                        onChange={(e) => setEditedResume({...editedResume, skills: e.target.value.split(',').map(s => s.trim()).filter(s => s)})}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter skills separated by commas"
                      />
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {(isEditing ? editedResume : generatedResume)?.skills.map((skill: string, index: number) => (
                          <span key={index} className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                            {skill}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {(isEditing ? editedResume : generatedResume)?.experience && (isEditing ? editedResume : generatedResume)?.experience.length > 0 && (
                  <div className="mb-6">
                    <h2 className="text-xl font-bold text-gray-800 mb-4">PROFESSIONAL EXPERIENCE</h2>
                    {(isEditing ? editedResume : generatedResume)?.experience.map((exp: any, index: number) => (
                      <div key={index} className="mb-4">
                        <div className="flex justify-between items-start mb-2">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editedResume.experience[index].jobTitle}
                              onChange={(e) => {
                                const updated = [...editedResume.experience];
                                updated[index].jobTitle = e.target.value;
                                setEditedResume({...editedResume, experience: updated});
                              }}
                              className="text-lg font-semibold text-gray-900 border border-gray-300 rounded px-2 py-1"
                            />
                          ) : (
                            <h3 className="text-lg font-semibold text-gray-900">{exp.jobTitle}</h3>
                          )}
                          {isEditing ? (
                            <input
                              type="text"
                              value={editedResume.experience[index].duration}
                              onChange={(e) => {
                                const updated = [...editedResume.experience];
                                updated[index].duration = e.target.value;
                                setEditedResume({...editedResume, experience: updated});
                              }}
                              className="text-sm text-gray-600 border border-gray-300 rounded px-2 py-1"
                            />
                          ) : (
                            <span className="text-sm text-gray-600">{exp.duration}</span>
                          )}
                        </div>
                        {isEditing ? (
                          <input
                            type="text"
                            value={editedResume.experience[index].company}
                            onChange={(e) => {
                              const updated = [...editedResume.experience];
                              updated[index].company = e.target.value;
                              setEditedResume({...editedResume, experience: updated});
                            }}
                            className="text-gray-700 mb-2 border border-gray-300 rounded px-2 py-1"
                          />
                        ) : (
                          <p className="text-gray-700 mb-2">{exp.company}</p>
                        )}
                        {exp.description && Array.isArray(exp.description) && (
                          <ul className="list-disc list-inside text-gray-700 space-y-1">
                            {exp.description.map((desc: string, descIndex: number) => (
                              <li key={descIndex}>
                                {isEditing ? (
                                  <input
                                    type="text"
                                    value={editedResume.experience[index].description[descIndex]}
                                    onChange={(e) => {
                                      const updated = [...editedResume.experience];
                                      updated[index].description[descIndex] = e.target.value;
                                      setEditedResume({...editedResume, experience: updated});
                                    }}
                                    className="border border-gray-300 rounded px-2 py-1 w-full"
                                  />
                                ) : (
                                  desc
                                )}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {(isEditing ? editedResume : generatedResume)?.projects && (isEditing ? editedResume : generatedResume)?.projects.length > 0 && (
                  <div className="mb-6">
                    <h2 className="text-xl font-bold text-gray-800 mb-4">PROJECTS</h2>
                    {(isEditing ? editedResume : generatedResume)?.projects.map((project: any, index: number) => (
                      <div key={index} className="mb-4">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editedResume.projects[index].name}
                            onChange={(e) => {
                              const updated = [...editedResume.projects];
                              updated[index].name = e.target.value;
                              setEditedResume({...editedResume, projects: updated});
                            }}
                            className="text-lg font-semibold text-gray-900 border border-gray-300 rounded px-2 py-1 mb-2 w-full"
                            placeholder="Project Name"
                          />
                        ) : (
                          <h3 className="text-lg font-semibold text-gray-900">{project.name}</h3>
                        )}
                        {isEditing ? (
                          <textarea
                            value={editedResume.projects[index].description}
                            onChange={(e) => {
                              const updated = [...editedResume.projects];
                              updated[index].description = e.target.value;
                              setEditedResume({...editedResume, projects: updated});
                            }}
                            className="text-gray-700 mb-2 border border-gray-300 rounded px-2 py-1 w-full"
                            rows={2}
                            placeholder="Project Description"
                          />
                        ) : (
                          <p className="text-gray-700 mb-2">{project.description}</p>
                        )}
                        {project.technologies && project.technologies.length > 0 && (
                          <p className="text-gray-600 italic">
                            Technologies: {isEditing ? (
                              <input
                                type="text"
                                value={editedResume.projects[index].technologies.join(', ')}
                                onChange={(e) => {
                                  const updated = [...editedResume.projects];
                                  updated[index].technologies = e.target.value.split(',').map(t => t.trim()).filter(t => t);
                                  setEditedResume({...editedResume, projects: updated});
                                }}
                                className="border border-gray-300 rounded px-2 py-1 ml-2"
                                placeholder="Tech1, Tech2, Tech3"
                              />
                            ) : (
                              project.technologies.join(', ')
                            )}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {(isEditing ? editedResume : generatedResume)?.certifications && (isEditing ? editedResume : generatedResume)?.certifications.length > 0 && (
                  <div className="mb-6">
                    <h2 className="text-xl font-bold text-gray-800 mb-2">CERTIFICATIONS</h2>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editedResume.certifications.join(', ')}
                        onChange={(e) => setEditedResume({...editedResume, certifications: e.target.value.split(',').map(c => c.trim()).filter(c => c)})}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter certifications separated by commas"
                      />
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {(isEditing ? editedResume : generatedResume)?.certifications.map((cert: string, index: number) => (
                          <span key={index} className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm">
                            {cert}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {(isEditing ? editedResume : generatedResume)?.education && (isEditing ? editedResume : generatedResume)?.education.length > 0 && (
                  <div className="mb-6">
                    <h2 className="text-xl font-bold text-gray-800 mb-4">EDUCATION</h2>
                    {(isEditing ? editedResume : generatedResume)?.education.map((edu: any, index: number) => (
                      <div key={index} className="mb-3">
                        <div className="flex justify-between items-start">
                          <div>
                            {isEditing ? (
                              <>
                                <input
                                  type="text"
                                  value={editedResume.education[index].degree}
                                  onChange={(e) => {
                                    const updated = [...editedResume.education];
                                    updated[index].degree = e.target.value;
                                    setEditedResume({...editedResume, education: updated});
                                  }}
                                  className="text-lg font-semibold text-gray-900 border border-gray-300 rounded px-2 py-1 mb-1 w-full"
                                  placeholder="Degree"
                                />
                                <input
                                  type="text"
                                  value={editedResume.education[index].institution}
                                  onChange={(e) => {
                                    const updated = [...editedResume.education];
                                    updated[index].institution = e.target.value;
                                    setEditedResume({...editedResume, education: updated});
                                  }}
                                  className="text-gray-700 border border-gray-300 rounded px-2 py-1 w-full"
                                  placeholder="Institution"
                                />
                              </>
                            ) : (
                              <>
                                <h3 className="text-lg font-semibold text-gray-900">{edu.degree}</h3>
                                <p className="text-gray-700">{edu.institution}</p>
                              </>
                            )}
                          </div>
                          {isEditing ? (
                            <input
                              type="text"
                              value={editedResume.education[index].year}
                              onChange={(e) => {
                                const updated = [...editedResume.education];
                                updated[index].year = e.target.value;
                                setEditedResume({...editedResume, education: updated});
                              }}
                              className="text-sm text-gray-600 border border-gray-300 rounded px-2 py-1"
                              placeholder="Year"
                            />
                          ) : (
                            <span className="text-sm text-gray-600">{edu.year}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="mt-10 flex flex-col sm:flex-row gap-6 justify-center">
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="bg-gradient-to-r from-purple-500 to-pink-600 text-white px-10 py-5 rounded-2xl hover:from-purple-600 hover:to-pink-700 focus:ring-4 focus:ring-purple-100 focus:ring-offset-2 transition-all duration-300 font-semibold text-lg shadow-xl hover:shadow-2xl transform hover:-translate-y-1 flex items-center justify-center gap-3"
                aria-label={isEditing ? "Save edits" : "Edit resume"}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                {isEditing ? 'Save Changes' : 'Edit Resume'}
              </button>
              <button
                onClick={saveResume}
                className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-10 py-5 rounded-2xl hover:from-blue-600 hover:to-indigo-700 focus:ring-4 focus:ring-blue-100 focus:ring-offset-2 transition-all duration-300 font-semibold text-lg shadow-xl hover:shadow-2xl transform hover:-translate-y-1 flex items-center justify-center gap-3"
                aria-label="Save resume to database"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                </svg>
                {t('saveResume')}
              </button>
              <button
                onClick={downloadResume}
                className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-10 py-5 rounded-2xl hover:from-emerald-600 hover:to-teal-700 focus:ring-4 focus:ring-emerald-100 focus:ring-offset-2 transition-all duration-300 font-semibold text-lg shadow-xl hover:shadow-2xl transform hover:-translate-y-1 flex items-center justify-center gap-3"
                aria-label="Download resume as PDF"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                {t('downloadPDF')}
              </button>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}