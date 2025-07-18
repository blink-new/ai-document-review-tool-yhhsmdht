import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion'
import { Alert, AlertDescription } from './ui/alert'
import { 
  AlertTriangle, 
  CheckCircle, 
  FileText, 
  Calculator, 
  Download,
  Eye,
  ThumbsUp,
  AlertCircle
} from 'lucide-react'
import { AnalysisResult, DocumentIssue, NumericalValidation, CrossDocumentValidation } from '../types'

interface AnalysisResultsProps {
  result: AnalysisResult
  onDownloadReport: () => void
  onDownloadCorrected: () => void
}

export function AnalysisResults({ result, onDownloadReport, onDownloadCorrected }: AnalysisResultsProps) {
  const [selectedIssue, setSelectedIssue] = useState<string | null>(null)

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getIssueTypeIcon = (type: string) => {
    switch (type) {
      case 'spelling':
      case 'grammar':
      case 'style':
        return <FileText className="h-4 w-4" />
      case 'numerical':
      case 'calculation':
        return <Calculator className="h-4 w-4" />
      default:
        return <AlertCircle className="h-4 w-4" />
    }
  }

  const criticalIssues = result.proofreadingIssues.filter(issue => issue.severity === 'high')
  const numericalErrors = result.numericalValidations.filter(validation => !validation.isValid)
  const crossDocumentErrors = result.crossDocumentValidations?.filter(validation => !validation.isConsistent) || []

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{result.summary.totalIssues}</p>
                <p className="text-sm text-muted-foreground">Total Issues</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{result.summary.criticalIssues}</p>
                <p className="text-sm text-muted-foreground">Critical Issues</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Calculator className="h-4 w-4 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{result.summary.numericalErrors}</p>
                <p className="text-sm text-muted-foreground">Numerical Errors</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{result.summary.proofreadingErrors}</p>
                <p className="text-sm text-muted-foreground">Writing Issues</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-purple-100 rounded-lg">
                <FileText className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{result.summary.crossDocumentErrors}</p>
                <p className="text-sm text-muted-foreground">Cross-Doc Errors</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Critical Issues Alert */}
      {criticalIssues.length > 0 && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <strong>{criticalIssues.length} critical issue{criticalIssues.length > 1 ? 's' : ''}</strong> found that require immediate attention.
          </AlertDescription>
        </Alert>
      )}

      {/* Main Analysis Tabs */}
      <Tabs defaultValue="proofreading" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="proofreading" className="flex items-center space-x-2">
            <FileText className="h-4 w-4" />
            <span>Typos ({result.proofreadingIssues.length})</span>
          </TabsTrigger>
          <TabsTrigger value="numerical" className="flex items-center space-x-2">
            <Calculator className="h-4 w-4" />
            <span>Numerical ({numericalErrors.length})</span>
          </TabsTrigger>
          <TabsTrigger value="cross-document" className="flex items-center space-x-2">
            <FileText className="h-4 w-4" />
            <span>Cross-Doc ({crossDocumentErrors.length})</span>
          </TabsTrigger>
          <TabsTrigger value="summary" className="flex items-center space-x-2">
            <Eye className="h-4 w-4" />
            <span>Summary</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="proofreading" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Typos & Critical Errors</span>
                <Badge variant="outline">{result.proofreadingIssues.length} issues</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {result.proofreadingIssues.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <p className="text-lg font-medium">No proofreading issues found!</p>
                  <p className="text-muted-foreground">Your document looks great.</p>
                </div>
              ) : (
                <Accordion type="single" collapsible className="w-full">
                  {result.proofreadingIssues.map((issue, index) => (
                    <AccordionItem key={issue.id} value={`issue-${index}`}>
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center justify-between w-full mr-4">
                          <div className="flex items-center space-x-3">
                            {getIssueTypeIcon(issue.issueType)}
                            <span className="text-left">{issue.description}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge className={getSeverityColor(issue.severity)}>
                              {issue.severity}
                            </Badge>
                            <Badge variant="outline" className="capitalize">
                              {issue.issueType}
                            </Badge>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-3 pt-2">
                          {issue.location && (
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Location:</p>
                              <p className="text-sm">{issue.location}</p>
                            </div>
                          )}
                          {issue.suggestion && (
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Suggestion:</p>
                              <p className="text-sm bg-green-50 p-2 rounded border">{issue.suggestion}</p>
                            </div>
                          )}
                          <div className="flex space-x-2">
                            <Button size="sm" variant="outline">
                              <ThumbsUp className="h-3 w-3 mr-1" />
                              Accept
                            </Button>
                            <Button size="sm" variant="ghost">
                              Ignore
                            </Button>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="numerical" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Numerical Validation</span>
                <Badge variant="outline">{numericalErrors.length} errors</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {numericalErrors.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <p className="text-lg font-medium">All calculations are correct!</p>
                  <p className="text-muted-foreground">No numerical inconsistencies found.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {numericalErrors.map((validation, index) => (
                    <div key={validation.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <Calculator className="h-4 w-4 text-red-500" />
                          <span className="font-medium capitalize">{validation.validationType} Error</span>
                        </div>
                        <Badge className="bg-red-100 text-red-800">Error</Badge>
                      </div>
                      
                      {validation.location && (
                        <p className="text-sm text-muted-foreground mb-2">
                          Location: {validation.location}
                        </p>
                      )}
                      
                      {validation.errorMessage && (
                        <p className="text-sm mb-3">{validation.errorMessage}</p>
                      )}
                      
                      {validation.expectedValue !== undefined && validation.actualValue !== undefined && (
                        <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                          <h4 className="font-medium text-red-800 mb-3 flex items-center">
                            <AlertTriangle className="h-4 w-4 mr-2" />
                            Number Discrepancy Found
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-white p-3 rounded border">
                              <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Expected Value</div>
                              <div className="text-lg font-mono font-bold text-green-700">
                                {typeof validation.expectedValue === 'number' 
                                  ? validation.expectedValue.toLocaleString() 
                                  : validation.expectedValue}
                              </div>
                            </div>
                            <div className="bg-white p-3 rounded border">
                              <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Found Value</div>
                              <div className="text-lg font-mono font-bold text-red-700">
                                {typeof validation.actualValue === 'number' 
                                  ? validation.actualValue.toLocaleString() 
                                  : validation.actualValue}
                              </div>
                            </div>
                          </div>
                          {validation.expectedValue !== undefined && validation.actualValue !== undefined && (
                            <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded">
                              <div className="text-sm">
                                <span className="font-medium text-yellow-800">Difference: </span>
                                <span className="font-mono font-bold text-yellow-900">
                                  {Math.abs(validation.expectedValue - validation.actualValue).toLocaleString()}
                                  {validation.expectedValue !== 0 && (
                                    <span className="ml-2 text-xs">
                                      ({(Math.abs(validation.expectedValue - validation.actualValue) / Math.abs(validation.expectedValue) * 100).toFixed(1)}% difference)
                                    </span>
                                  )}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cross-document" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Cross-Document Validation</span>
                <Badge variant="outline">{crossDocumentErrors.length} errors</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {crossDocumentErrors.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <p className="text-lg font-medium">All documents are consistent!</p>
                  <p className="text-muted-foreground">No numerical inconsistencies found across documents.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {crossDocumentErrors.map((validation, index) => (
                    <div key={validation.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                          <span className="font-medium">{validation.fieldName}</span>
                        </div>
                        <Badge className="bg-red-100 text-red-800">Inconsistent</Badge>
                      </div>
                      
                      {validation.errorMessage && (
                        <p className="text-sm mb-3 text-red-600">{validation.errorMessage}</p>
                      )}
                      
                      <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                        <h4 className="font-medium text-red-800 mb-3 flex items-center">
                          <AlertTriangle className="h-4 w-4 mr-2" />
                          Conflicting Values Found
                        </h4>
                        <div className="space-y-3">
                          {validation.values.map((value, valueIndex) => {
                            // Find if this is the outlier value
                            const allValues = validation.values.map(v => v.value)
                            const mostCommonValue = allValues.sort((a,b) =>
                              allValues.filter(v => v === a).length - allValues.filter(v => v === b).length
                            ).pop()
                            const isOutlier = value.value !== mostCommonValue && allValues.filter(v => v === mostCommonValue).length > 1
                            
                            return (
                              <div key={valueIndex} className={`p-3 rounded border ${
                                isOutlier ? 'bg-red-100 border-red-300' : 'bg-white border-gray-200'
                              }`}>
                                <div className="flex justify-between items-start">
                                  <div className="flex-1">
                                    <div className="font-medium text-gray-900">{value.documentName}</div>
                                    <div className="text-xs text-gray-500 mt-1">{value.location}</div>
                                  </div>
                                  <div className="text-right ml-4">
                                    <div className={`text-lg font-mono font-bold ${
                                      isOutlier ? 'text-red-700' : 'text-gray-700'
                                    }`}>
                                      {typeof value.value === 'number' ? value.value.toLocaleString() : value.value}
                                    </div>
                                    {isOutlier && (
                                      <div className="text-xs text-red-600 font-medium mt-1">
                                        ⚠ Potential Error
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                        
                        {/* Show the range of values */}
                        {validation.values.length > 1 && (
                          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                            <div className="text-sm">
                              <span className="font-medium text-yellow-800">Value Range: </span>
                              <span className="font-mono font-bold text-yellow-900">
                                {Math.min(...validation.values.map(v => v.value)).toLocaleString()} - {Math.max(...validation.values.map(v => v.value)).toLocaleString()}
                              </span>
                              <span className="ml-2 text-xs text-yellow-700">
                                (Difference: {(Math.max(...validation.values.map(v => v.value)) - Math.min(...validation.values.map(v => v.value))).toLocaleString()})
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="summary" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Analysis Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-3">Document Quality Score</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Overall Quality</span>
                      <span className="font-medium">
                        {result.summary.totalIssues === 0 ? 'Excellent' : 
                         result.summary.criticalIssues === 0 ? 'Good' : 'Needs Improvement'}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          result.summary.totalIssues === 0 ? 'bg-green-500' :
                          result.summary.criticalIssues === 0 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ 
                          width: `${Math.max(20, 100 - (result.summary.totalIssues * 10))}%` 
                        }}
                      />
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-3">Recommendations</h4>
                  <ul className="text-sm space-y-1">
                    {result.summary.criticalIssues > 0 && (
                      <li className="flex items-center space-x-2">
                        <AlertTriangle className="h-3 w-3 text-red-500" />
                        <span>Address critical issues first</span>
                      </li>
                    )}
                    {result.summary.numericalErrors > 0 && (
                      <li className="flex items-center space-x-2">
                        <Calculator className="h-3 w-3 text-yellow-500" />
                        <span>Verify numerical calculations</span>
                      </li>
                    )}
                    {result.summary.proofreadingErrors > 0 && (
                      <li className="flex items-center space-x-2">
                        <FileText className="h-3 w-3 text-blue-500" />
                        <span>Fix typos and critical errors</span>
                      </li>
                    )}
                    {result.summary.crossDocumentErrors > 0 && (
                      <li className="flex items-center space-x-2">
                        <AlertTriangle className="h-3 w-3 text-purple-500" />
                        <span>Resolve cross-document inconsistencies</span>
                      </li>
                    )}
                    {result.summary.totalIssues === 0 && (
                      <li className="flex items-center space-x-2">
                        <CheckCircle className="h-3 w-3 text-green-500" />
                        <span>All documents are ready for use</span>
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Download Actions */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <Button onClick={onDownloadReport} className="flex-1">
              <Download className="h-4 w-4 mr-2" />
              Download Analysis Report
            </Button>
            <Button onClick={onDownloadCorrected} variant="outline" className="flex-1">
              <Download className="h-4 w-4 mr-2" />
              Download Corrected Document
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}