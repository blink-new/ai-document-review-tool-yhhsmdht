import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Progress } from './ui/progress'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { 
  Upload, 
  FileText, 
  Search, 
  Calculator, 
  CheckCircle, 
  Loader2,
  AlertCircle,
  X
} from 'lucide-react'
import { ProcessingStep } from '../constants/processingSteps'

interface ProcessingStatusProps {
  currentStep: number
  steps: ProcessingStep[]
  fileName: string
  onAbort?: () => void
  canAbort?: boolean
}

export function ProcessingStatus({ currentStep, steps, fileName, onAbort, canAbort }: ProcessingStatusProps) {
  const getStepIcon = (step: ProcessingStep, index: number) => {
    if (step.status === 'error') {
      return <AlertCircle className="h-5 w-5 text-red-500" />
    }
    
    if (step.status === 'completed') {
      return <CheckCircle className="h-5 w-5 text-green-500" />
    }
    
    if (step.status === 'processing') {
      return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
    }
    
    // Default icons based on step type
    switch (index) {
      case 0:
        return <Upload className="h-5 w-5 text-gray-400" />
      case 1:
        return <FileText className="h-5 w-5 text-gray-400" />
      case 2:
        return <Search className="h-5 w-5 text-gray-400" />
      case 3:
        return <Calculator className="h-5 w-5 text-gray-400" />
      default:
        return <CheckCircle className="h-5 w-5 text-gray-400" />
    }
  }

  const getStepStatus = (step: ProcessingStep) => {
    switch (step.status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>
      case 'processing':
        return <Badge className="bg-blue-100 text-blue-800">Processing</Badge>
      case 'error':
        return <Badge className="bg-red-100 text-red-800">Error</Badge>
      default:
        return <Badge variant="outline">Pending</Badge>
    }
  }

  const overallProgress = (steps.filter(step => step.status === 'completed').length / steps.length) * 100

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
            <span>Processing Document</span>
          </CardTitle>
          {canAbort && onAbort && (
            <Button
              variant="outline"
              size="sm"
              onClick={onAbort}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <X className="h-4 w-4 mr-1" />
              Cancel
            </Button>
          )}
        </div>
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Analyzing: <span className="font-medium">{fileName}</span>
          </p>
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span>Overall Progress</span>
              <span>{Math.round(overallProgress)}%</span>
            </div>
            <Progress value={overallProgress} className="h-2" />
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-start space-x-4">
            <div className="flex-shrink-0 mt-1">
              {getStepIcon(step, index)}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <h4 className="text-sm font-medium">{step.title}</h4>
                {getStepStatus(step)}
              </div>
              
              <p className="text-sm text-muted-foreground mb-2">
                {step.description}
              </p>
              
              {step.status === 'processing' && step.progress !== undefined && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span>Step Progress</span>
                    <span>{step.progress}%</span>
                  </div>
                  <Progress value={step.progress} className="h-1" />
                </div>
              )}
            </div>
          </div>
        ))}
        
        {/* Processing Animation */}
        <div className="flex justify-center pt-4">
          <div className="flex space-x-1">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}