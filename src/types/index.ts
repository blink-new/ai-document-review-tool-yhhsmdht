export interface Document {
  id: string
  userId: string
  filename: string
  fileType: string
  fileSize: number
  uploadDate: string
  status: 'processing' | 'completed' | 'error'
  analysisResults?: string
  createdAt: string
  updatedAt: string
}

export interface DocumentIssue {
  id: string
  documentId: string
  userId: string
  issueType: 'spelling' | 'grammar' | 'style' | 'numerical' | 'calculation'
  severity: 'low' | 'medium' | 'high'
  description: string
  location?: string
  suggestion?: string
  isResolved: boolean
  createdAt: string
}

export interface NumericalValidation {
  id: string
  documentId: string
  userId: string
  validationType: 'sum' | 'total' | 'calculation' | 'reference'
  expectedValue?: number
  actualValue?: number
  isValid: boolean
  errorMessage?: string
  location?: string
  createdAt: string
}

export interface AnalysisResult {
  documentId: string
  proofreadingIssues: DocumentIssue[]
  numericalValidations: NumericalValidation[]
  crossDocumentValidations?: CrossDocumentValidation[]
  summary: {
    totalIssues: number
    criticalIssues: number
    numericalErrors: number
    proofreadingErrors: number
    crossDocumentErrors: number
  }
}

export interface CrossDocumentValidation {
  id: string
  documentIds: string[]
  validationType: 'cross_reference' | 'consistency_check'
  fieldName: string
  values: Array<{
    documentName: string
    value: number
    location: string
  }>
  isConsistent: boolean
  errorMessage?: string
  createdAt: string
}

export interface FileUpload {
  file: File
  id: string
  progress: number
  status: 'uploading' | 'processing' | 'completed' | 'error' | 'cancelled'
  error?: string
}