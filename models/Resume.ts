import mongoose from 'mongoose';

const ResumeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  skills: [{ type: String }],
  experience: [{
    jobTitle: { type: String, required: true },
    company: { type: String, required: true },
    duration: { type: String, required: true },
    description: { type: String, required: true },
  }],
  education: [{
    degree: { type: String, required: true },
    institution: { type: String, required: true },
    year: { type: String, required: true },
  }],
  generatedResume: { type: String },
}, {
  timestamps: true,
});

export default mongoose.models.Resume || mongoose.model('Resume', ResumeSchema);