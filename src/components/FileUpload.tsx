import React, { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, File, X, CheckCircle, AlertCircle } from 'lucide-react'
import { Card, CardContent } from './ui/card'
import { Button } from './ui/button'
import { Progress } from './ui/progress'
import { Badge } from './ui/badge'
import { FileUpload } from '../types'

interface FileUploadProps {
  onFilesSelected: (files: FileUpload[]) => void
  uploadedFiles: FileUpload[]
  onRemoveFile: (fileId: string) => void
  onAnalyzeDocuments?: () => void
  onStartProcessing?: () => void
  isProcessing?: boolean
}

const ACCEPTED_FILE_TYPES = {
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
}

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export function FileUpload({ onFilesSelected, uploadedFiles, onRemoveFile, onAnalyzeDocuments, onStartProcessing, isProcessing }: FileUploadProps) {
  const [dragActive, setDragActive] = useState(false)

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    if (rejectedFiles.length > 0) {
      // Handle rejected files
      rejectedFiles.forEach(({ file, errors }) => {
        console.error(`File ${file.name} rejected:`, errors)
      })
    }

    const newFiles: FileUpload[] = acceptedFiles.map(file => ({
      file,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      progress: 0,
      status: 'uploading'
    }))

    onFilesSelected(newFiles)
  }, [onFilesSelected])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_FILE_TYPES,
    maxSize: MAX_FILE_SIZE,
    multiple: true,
    onDragEnter: () => setDragActive(true),
    onDragLeave: () => setDragActive(false)
  })

  const getStatusIcon = (status: FileUpload['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      case 'cancelled':
        return <X className="h-4 w-4 text-orange-500" />
      default:
        return <File className="h-4 w-4 text-blue-500" />
    }
  }

  const getStatusColor = (status: FileUpload['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'error':
        return 'bg-red-100 text-red-800'
      case 'cancelled':
        return 'bg-orange-100 text-orange-800'
      case 'processing':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-blue-100 text-blue-800'
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="space-y-6">
      {/* Upload Zone */}
      <Card className="border-2 border-dashed transition-colors duration-200 hover:border-primary/50">
        <CardContent className="p-8">
          <div
            {...getRootProps()}
            className={`text-center cursor-pointer transition-all duration-200 ${
              isDragActive || dragActive
                ? 'scale-105 text-primary'
                : 'hover:text-primary/80'
            }`}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center space-y-4">
              <div className={`p-4 rounded-full transition-colors duration-200 ${
                isDragActive || dragActive
                  ? 'bg-primary/10 text-primary'
                  : 'bg-muted text-muted-foreground'
              }`}>
                <Upload className="h-8 w-8" />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">
                  {isDragActive ? 'Drop files here' : 'Upload Documents'}
                </h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  Drag and drop your files here, or click to browse. 
                  Supports Word (.docx), PDF, and Excel (.xlsx) files up to 10MB.
                  <br />
                  <strong>Upload multiple documents</strong> to check numerical consistency across files.
                </p>
              </div>
              
              <Button variant="outline" className="mt-4">
                Choose Files
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Uploaded Files List */}
      {uploadedFiles.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">Uploaded Files</h3>
            <div className="space-y-3">
              {uploadedFiles.map((fileUpload) => (
                <div
                  key={fileUpload.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center space-x-3 flex-1">
                    {getStatusIcon(fileUpload.status)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {fileUpload.file.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(fileUpload.file.size)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <Badge className={getStatusColor(fileUpload.status)}>
                      {fileUpload.status}
                    </Badge>
                    
                    {fileUpload.status === 'uploading' || fileUpload.status === 'processing' ? (
                      <div className="w-24">
                        <Progress value={fileUpload.progress} className="h-2" />
                      </div>
                    ) : null}
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onRemoveFile(fileUpload.id)}
                      className="h-8 w-8 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            
            {uploadedFiles.length > 0 && uploadedFiles.some(f => f.status !== 'completed' && f.status !== 'processing' && f.status !== 'cancelled') && onStartProcessing && (
              <div className="mt-4 pt-4 border-t">
                <Button 
                  onClick={onStartProcessing} 
                  className="w-full" 
                  disabled={isProcessing}
                >
                  {isProcessing ? 'Processing...' : 'Start Document Analysis'}
                </Button>
                <p className="text-xs text-muted-foreground text-center mt-2">
                  Begin AI-powered proofreading and numerical validation
                </p>
              </div>
            )}
            
            {uploadedFiles.length > 1 && uploadedFiles.every(f => f.status === 'completed') && onAnalyzeDocuments && (
              <div className="mt-4 pt-4 border-t">
                <Button onClick={onAnalyzeDocuments} className="w-full">
                  Analyze Cross-Document Consistency
                </Button>
                <p className="text-xs text-muted-foreground text-center mt-2">
                  Check for numerical inconsistencies across all uploaded documents
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}