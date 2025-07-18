import React, { useState, useEffect } from 'react'
import { FileUpload } from './components/FileUpload'
import { ProcessingStatus } from './components/ProcessingStatus'
import { AnalysisResults } from './components/AnalysisResults'
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card'
import { Button } from './components/ui/button'
import { Badge } from './components/ui/badge'
import { Separator } from './components/ui/separator'
import { 
  FileText, 
  Shield, 
  Zap, 
  CheckCircle, 
  ArrowLeft,
  Sparkles
} from 'lucide-react'
import { blink } from './blink/client'
import { FileUpload as FileUploadType, AnalysisResult, DocumentIssue, NumericalValidation, CrossDocumentValidation } from './types'
import { processDocument, performProofreadingAnalysis, performNumericalValidation, performCrossDocumentValidation } from './utils/documentProcessor'
import { defaultProcessingSteps } from './constants/processingSteps'
import toast from 'react-hot-toast'

type AppState = 'upload' | 'processing' | 'results'

function App() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [appState, setAppState] = useState<AppState>('upload')
  const [uploadedFiles, setUploadedFiles] = useState<FileUploadType[]>([])
  const [processingSteps, setProcessingSteps] = useState(defaultProcessingSteps)
  const [currentStep, setCurrentStep] = useState(0)
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)
  const [currentFileName, setCurrentFileName] = useState('')
  const [processedDocuments, setProcessedDocuments] = useState<Array<{
    id: string
    name: string
    processedDoc: any
    numericalData: Array<{ value: number; context: string; location: string }>
  }>>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [abortController, setAbortController] = useState<AbortController | null>(null)

  // Auth state management
  useEffect(() => {
    const unsubscribe = blink.auth.onAuthStateChanged((state) => {
      setUser(state.user)
      setLoading(state.isLoading)
    })
    return unsubscribe
  }, [])

  const handleFilesSelected = (newFiles: FileUploadType[]) => {
    setUploadedFiles(prev => [...prev, ...newFiles])
  }

  const processFile = async (fileUpload: FileUploadType) => {
    setCurrentFileName(fileUpload.file.name)
    setAppState('processing')
    setCurrentStep(0)
    setIsProcessing(true)
    
    // Create abort controller for this processing session
    const controller = new AbortController()
    setAbortController(controller)
    
    // Reset processing steps
    const steps = [...defaultProcessingSteps]
    setProcessingSteps(steps)

    try {
      // Check if processing was aborted
      if (controller.signal.aborted) {
        throw new Error('Processing aborted by user')
      }
      // Step 1: Upload
      updateStepStatus(0, 'processing', 0)
      await simulateProgress(0, 100, 1000)
      updateStepStatus(0, 'completed')
      setCurrentStep(1)

      // Step 2: Content Extraction
      updateStepStatus(1, 'processing', 0)
      if (controller.signal.aborted) throw new Error('Processing aborted by user')
      const processedDoc = await processDocument(fileUpload.file)
      await simulateProgress(1, 100, 2000)
      updateStepStatus(1, 'completed')
      setCurrentStep(2)

      // Step 3: AI Proofreading
      updateStepStatus(2, 'processing', 0)
      if (controller.signal.aborted) throw new Error('Processing aborted by user')
      const proofreadingIssues = await performProofreadingAnalysis(processedDoc.text)
      await simulateProgress(2, 100, 3000)
      updateStepStatus(2, 'completed')
      setCurrentStep(3)

      // Step 4: Numerical Validation
      updateStepStatus(3, 'processing', 0)
      if (controller.signal.aborted) throw new Error('Processing aborted by user')
      const numericalValidations = await performNumericalValidation(processedDoc.numericalData)
      await simulateProgress(3, 100, 2000)
      updateStepStatus(3, 'completed')
      setCurrentStep(4)

      // Store processed document for cross-document validation
      setProcessedDocuments(prev => [...prev, {
        id: fileUpload.id,
        name: fileUpload.file.name,
        processedDoc,
        numericalData: processedDoc.numericalData
      }])

      // Step 5: Complete
      updateStepStatus(4, 'processing', 0)
      if (controller.signal.aborted) throw new Error('Processing aborted by user')
      await simulateProgress(4, 100, 1000)
      updateStepStatus(4, 'completed')

      // Create analysis result
      const result: AnalysisResult = {
        documentId: fileUpload.id,
        proofreadingIssues: proofreadingIssues.map((issue, index) => ({
          id: `issue-${index}`,
          documentId: fileUpload.id,
          userId: user?.id || '',
          issueType: issue.type as any,
          severity: issue.severity as any,
          description: issue.description,
          location: issue.location,
          suggestion: issue.suggestion,
          isResolved: false,
          createdAt: new Date().toISOString()
        })),
        numericalValidations: numericalValidations.map((validation, index) => ({
          id: `validation-${index}`,
          documentId: fileUpload.id,
          userId: user?.id || '',
          validationType: validation.type as any,
          expectedValue: validation.expectedValue,
          actualValue: validation.actualValue,
          isValid: validation.isValid,
          errorMessage: validation.errorMessage,
          location: validation.location,
          createdAt: new Date().toISOString()
        })),
        crossDocumentValidations: [],
        summary: {
          totalIssues: proofreadingIssues.length + numericalValidations.filter(v => !v.isValid).length,
          criticalIssues: proofreadingIssues.filter(i => i.severity === 'high').length,
          numericalErrors: numericalValidations.filter(v => !v.isValid).length,
          proofreadingErrors: proofreadingIssues.length,
          crossDocumentErrors: 0
        }
      }

      setAnalysisResult(result)
      setAppState('results')
      
      // Update file status
      setUploadedFiles(prev => 
        prev.map(f => 
          f.id === fileUpload.id 
            ? { ...f, status: 'completed', progress: 100 }
            : f
        )
      )

      toast.success('Document analysis completed!')

    } catch (error) {
      console.error('Error processing file:', error)
      
      if (error.message === 'Processing aborted by user') {
        updateStepStatus(currentStep, 'error')
        setUploadedFiles(prev => 
          prev.map(f => 
            f.id === fileUpload.id 
              ? { ...f, status: 'cancelled', error: 'Processing cancelled' }
              : f
          )
        )
        toast.info('Processing cancelled')
        setAppState('upload')
      } else {
        updateStepStatus(currentStep, 'error')
        setUploadedFiles(prev => 
          prev.map(f => 
            f.id === fileUpload.id 
              ? { ...f, status: 'error', error: 'Processing failed' }
              : f
          )
        )
        toast.error('Failed to process document')
      }
    } finally {
      setIsProcessing(false)
      setAbortController(null)
    }
  }

  const updateStepStatus = (stepIndex: number, status: any, progress?: number) => {
    setProcessingSteps(prev => 
      prev.map((step, index) => 
        index === stepIndex 
          ? { ...step, status, progress }
          : step
      )
    )
  }

  const simulateProgress = (stepIndex: number, targetProgress: number, duration: number) => {
    return new Promise<void>((resolve) => {
      let currentProgress = 0
      const increment = targetProgress / (duration / 50)
      
      const interval = setInterval(() => {
        currentProgress += increment
        if (currentProgress >= targetProgress) {
          currentProgress = targetProgress
          clearInterval(interval)
          resolve()
        }
        updateStepStatus(stepIndex, 'processing', Math.round(currentProgress))
      }, 50)
    })
  }

  const handleRemoveFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId))
  }

  const handleDownloadReport = () => {
    if (!analysisResult) return
    
    const reportData = {
      summary: analysisResult.summary,
      issues: analysisResult.proofreadingIssues,
      validations: analysisResult.numericalValidations,
      generatedAt: new Date().toISOString()
    }
    
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `analysis-report-${currentFileName}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    
    toast.success('Report downloaded!')
  }

  const handleDownloadCorrected = () => {
    toast.info('Corrected document generation coming soon!')
  }

  const performCrossDocumentAnalysis = async () => {
    if (processedDocuments.length < 2) return

    try {
      setAppState('processing')
      setCurrentFileName('Cross-Document Analysis')
      
      // Add cross-document validation step
      const crossDocSteps = [
        ...defaultProcessingSteps,
        {
          id: 'cross-validation',
          title: 'Cross-Document Validation',
          description: 'Checking numerical consistency across documents',
          status: 'pending' as const,
          progress: 0
        }
      ]
      setProcessingSteps(crossDocSteps)
      setCurrentStep(5)
      
      updateStepStatus(5, 'processing', 0)
      
      const crossValidations = await performCrossDocumentValidation(processedDocuments)
      
      await simulateProgress(5, 100, 3000)
      updateStepStatus(5, 'completed')
      
      // Update analysis result with cross-document validations
      if (analysisResult) {
        const crossDocumentValidations: CrossDocumentValidation[] = crossValidations.map((validation, index) => ({
          id: `cross-${index}`,
          documentIds: processedDocuments.map(doc => doc.id),
          validationType: validation.validationType as any,
          fieldName: validation.fieldName,
          values: validation.values,
          isConsistent: validation.isConsistent,
          errorMessage: validation.errorMessage,
          createdAt: new Date().toISOString()
        }))
        
        const crossDocumentErrors = crossDocumentValidations.filter(v => !v.isConsistent).length
        
        const updatedResult: AnalysisResult = {
          ...analysisResult,
          crossDocumentValidations,
          summary: {
            ...analysisResult.summary,
            totalIssues: analysisResult.summary.totalIssues + crossDocumentErrors,
            crossDocumentErrors
          }
        }
        
        setAnalysisResult(updatedResult)
      }
      
      setAppState('results')
      toast.success('Cross-document analysis completed!')
      
    } catch (error) {
      console.error('Error in cross-document analysis:', error)
      toast.error('Cross-document analysis failed')
    }
  }

  const handleAbortProcessing = () => {
    if (abortController) {
      abortController.abort()
    }
  }

  const handleStartOver = () => {
    // Abort any ongoing processing
    if (abortController) {
      abortController.abort()
    }
    
    setAppState('upload')
    setUploadedFiles([])
    setAnalysisResult(null)
    setProcessingSteps(defaultProcessingSteps)
    setCurrentStep(0)
    setCurrentFileName('')
    setProcessedDocuments([])
    setIsProcessing(false)
    setAbortController(null)
  }

  const handleStartProcessing = async () => {
    const filesToProcess = uploadedFiles.filter(f => f.status !== 'completed' && f.status !== 'processing')
    
    if (filesToProcess.length === 0) {
      toast.info('No files to process')
      return
    }

    // Process all files sequentially
    for (const file of filesToProcess) {
      await processFile(file)
      // If processing was aborted, stop processing remaining files
      if (!isProcessing) break
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center space-y-4">
            <div className="p-4 bg-primary/10 rounded-full w-16 h-16 mx-auto flex items-center justify-center">
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold">Authentication Required</h2>
            <p className="text-muted-foreground">
              Please sign in to access the AI Document Review Tool.
            </p>
            <Button onClick={() => blink.auth.login()} className="w-full">
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold">AI Document Review Tool</h1>
                <p className="text-sm text-muted-foreground">
                  Automated proofreading & validation
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {appState === 'results' && (
                <Button variant="outline" onClick={handleStartOver}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  New Analysis
                </Button>
              )}
              <div className="flex items-center space-x-2">
                <span className="text-sm text-muted-foreground">Welcome,</span>
                <Badge variant="outline">{user.email}</Badge>
              </div>
              <Button variant="ghost" onClick={() => blink.auth.logout()}>
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {appState === 'upload' && (
          <div className="max-w-4xl mx-auto space-y-8">
            {/* Hero Section */}
            <div className="text-center space-y-4">
              <h2 className="text-3xl font-bold tracking-tight">
                Professional Document Analysis
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Upload multiple business documents for AI-powered typo detection, numerical validation, 
                and cross-document consistency checking.
              </p>
            </div>

            {/* Features */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <Card>
                <CardContent className="p-6 text-center">
                  <div className="p-3 bg-blue-100 rounded-full w-12 h-12 mx-auto mb-4 flex items-center justify-center">
                    <FileText className="h-6 w-6 text-blue-600" />
                  </div>
                  <h3 className="font-semibold mb-2">Typo Detection</h3>
                  <p className="text-sm text-muted-foreground">
                    Advanced spelling and critical error detection with intelligent suggestions.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6 text-center">
                  <div className="p-3 bg-green-100 rounded-full w-12 h-12 mx-auto mb-4 flex items-center justify-center">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                  <h3 className="font-semibold mb-2">Cross-Document Validation</h3>
                  <p className="text-sm text-muted-foreground">
                    Automatic verification of numerical consistency across multiple documents.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6 text-center">
                  <div className="p-3 bg-purple-100 rounded-full w-12 h-12 mx-auto mb-4 flex items-center justify-center">
                    <Zap className="h-6 w-6 text-purple-600" />
                  </div>
                  <h3 className="font-semibold mb-2">Instant Reports</h3>
                  <p className="text-sm text-muted-foreground">
                    Interactive summary reports with actionable recommendations.
                  </p>
                </CardContent>
              </Card>
            </div>

            <Separator />

            {/* File Upload */}
            <FileUpload
              onFilesSelected={handleFilesSelected}
              uploadedFiles={uploadedFiles}
              onRemoveFile={handleRemoveFile}
              onAnalyzeDocuments={performCrossDocumentAnalysis}
              onStartProcessing={handleStartProcessing}
              isProcessing={isProcessing}
            />
          </div>
        )}

        {appState === 'processing' && (
          <div className="max-w-4xl mx-auto">
            <ProcessingStatus
              currentStep={currentStep}
              steps={processingSteps}
              fileName={currentFileName}
              onAbort={handleAbortProcessing}
              canAbort={isProcessing}
            />
          </div>
        )}

        {appState === 'results' && analysisResult && (
          <div className="max-w-6xl mx-auto">
            <div className="mb-6">
              <h2 className="text-2xl font-bold mb-2">Analysis Results</h2>
              <p className="text-muted-foreground">
                Document: <span className="font-medium">{currentFileName}</span>
              </p>
            </div>
            
            <AnalysisResults
              result={analysisResult}
              onDownloadReport={handleDownloadReport}
              onDownloadCorrected={handleDownloadCorrected}
            />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t mt-16">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              &copy; 2024 AI Document Review Tool. Powered by Blink AI.
            </p>
            <div className="flex items-center space-x-4">
              <Badge variant="outline" className="bg-green-50 text-green-700">
                Secure & Private
              </Badge>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default App