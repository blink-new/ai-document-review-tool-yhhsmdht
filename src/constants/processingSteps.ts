export interface ProcessingStep {
  id: string
  title: string
  description: string
  status: 'pending' | 'processing' | 'completed' | 'error'
  progress?: number
}

export const defaultProcessingSteps: ProcessingStep[] = [
  {
    id: 'upload',
    title: 'File Upload',
    description: 'Uploading and validating document format',
    status: 'pending'
  },
  {
    id: 'extract',
    title: 'Content Extraction',
    description: 'Extracting text and numerical data from document',
    status: 'pending'
  },
  {
    id: 'proofread',
    title: 'AI Proofreading',
    description: 'Analyzing spelling, grammar, and style issues',
    status: 'pending'
  },
  {
    id: 'validate',
    title: 'Numerical Validation',
    description: 'Checking calculations and data consistency',
    status: 'pending'
  },
  {
    id: 'complete',
    title: 'Analysis Complete',
    description: 'Generating final report and recommendations',
    status: 'pending'
  }
]