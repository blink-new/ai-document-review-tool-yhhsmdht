import mammoth from 'mammoth'
import * as XLSX from 'xlsx'
import { blink } from '../blink/client'

export interface ProcessedDocument {
  text: string
  tables: Array<{
    headers: string[]
    rows: string[][]
  }>
  numericalData: Array<{
    value: number
    context: string
    location: string
  }>
}

export async function processDocument(file: File): Promise<ProcessedDocument> {
  const fileType = file.type
  let text = ''
  const tables: Array<{ headers: string[]; rows: string[][] }> = []
  
  try {
    if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      // Process Word document
      const arrayBuffer = await file.arrayBuffer()
      const result = await mammoth.extractRawText({ arrayBuffer })
      text = result.value
    } else if (fileType === 'application/pdf') {
      // Process PDF using Blink's data extraction
      try {
        text = await blink.data.extractFromBlob(file)
        if (!text || text.trim().length === 0) {
          throw new Error('No text content could be extracted from the PDF')
        }
      } catch (error) {
        console.error('PDF extraction error:', error)
        throw new Error(`Failed to extract text from PDF: ${error.message || 'Unknown error'}`)
      }
    } else if (fileType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
      // Process Excel file
      const arrayBuffer = await file.arrayBuffer()
      const workbook = XLSX.read(arrayBuffer, { type: 'array' })
      
      // Extract text and tables from all sheets
      const allSheetData: string[] = []
      
      workbook.SheetNames.forEach(sheetName => {
        const worksheet = workbook.Sheets[sheetName]
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as string[][]
        
        if (jsonData.length > 0) {
          const headers = jsonData[0] || []
          const rows = jsonData.slice(1)
          
          tables.push({ headers, rows })
          
          // Convert to text for analysis
          const sheetText = jsonData.map(row => row.join(' ')).join('\n')
          allSheetData.push(sheetText)
        }
      })
      
      text = allSheetData.join('\n\n')
    }
    
    // Extract numerical data
    const numericalData = extractNumericalData(text, tables)
    
    return { text, tables, numericalData }
  } catch (error) {
    console.error('Error processing document:', error)
    if (error.message && error.message.includes('Failed to extract text from PDF')) {
      throw error // Re-throw PDF-specific errors
    }
    throw new Error(`Failed to process document: ${error.message || 'Unknown error'}`)
  }
}

function extractNumericalData(text: string, tables: Array<{ headers: string[]; rows: string[][] }>): Array<{ value: number; context: string; location: string }> {
  const numericalData: Array<{ value: number; context: string; location: string }> = []
  
  // Enhanced number extraction with better context recognition
  // Match numbers with various formats: $1,234.56, 1234.56, (1,234), etc.
  const numberRegex = /(?:\$|USD|EUR|GBP)?\s*(?:\()?[\d,]+(?:\.\d{1,2})?(?:\))?(?:\s*(?:million|billion|thousand|M|B|K))?/gi
  
  // Split text into lines for better context
  const lines = text.split('\n')
  
  lines.forEach((line, lineIndex) => {
    const matches = line.match(numberRegex) || []
    
    matches.forEach((match) => {
      // Clean the number - handle parentheses as negative, remove currency symbols and separators
      let cleanNumber = match.replace(/[$,\s]/g, '')
      let isNegative = false
      
      // Handle parentheses notation for negative numbers
      if (cleanNumber.includes('(') && cleanNumber.includes(')')) {
        isNegative = true
        cleanNumber = cleanNumber.replace(/[()]/g, '')
      }
      
      // Handle scale multipliers
      let multiplier = 1
      if (/million|M$/i.test(match)) {
        multiplier = 1000000
        cleanNumber = cleanNumber.replace(/million|M$/gi, '')
      } else if (/billion|B$/i.test(match)) {
        multiplier = 1000000000
        cleanNumber = cleanNumber.replace(/billion|B$/gi, '')
      } else if (/thousand|K$/i.test(match)) {
        multiplier = 1000
        cleanNumber = cleanNumber.replace(/thousand|K$/gi, '')
      }
      
      const value = parseFloat(cleanNumber) * multiplier * (isNegative ? -1 : 1)
      
      if (!isNaN(value) && value !== 0) {
        // Get better context - look for financial terms and years around the number
        const contextWords = line.toLowerCase()
        let contextType = 'number'
        
        // Extract year information
        const yearMatch = contextWords.match(/20(2[0-9]|1[0-9])/)
        const year = yearMatch ? yearMatch[0] : ''
        
        if (contextWords.includes('revenue') || contextWords.includes('sales') || contextWords.includes('income')) {
          contextType = year ? `${year}_revenue` : 'revenue'
        } else if (contextWords.includes('expense') || contextWords.includes('cost') || contextWords.includes('expenditure')) {
          contextType = year ? `${year}_expense` : 'expense'
        } else if (contextWords.includes('profit') || contextWords.includes('net') || contextWords.includes('earnings')) {
          contextType = year ? `${year}_profit` : 'profit'
        } else if (contextWords.includes('total') || contextWords.includes('sum')) {
          contextType = year ? `${year}_total` : 'total'
        } else if (contextWords.includes('asset')) {
          contextType = year ? `${year}_asset` : 'asset'
        } else if (contextWords.includes('liability')) {
          contextType = year ? `${year}_liability` : 'liability'
        } else if (year) {
          contextType = `${year}_figure`
        }
        
        numericalData.push({
          value,
          context: `${contextType}: ${line.trim()}`,
          location: `Line ${lineIndex + 1}`
        })
      }
    })
  })
  
  // Extract numbers from tables with better categorization
  tables.forEach((table, tableIndex) => {
    table.rows.forEach((row, rowIndex) => {
      row.forEach((cell, cellIndex) => {
        const cellValue = cell?.toString() || ''
        
        // Skip empty cells and headers
        if (!cellValue || cellValue.trim() === '') return
        
        // Use same number extraction logic as text
        const matches = cellValue.match(numberRegex) || []
        
        matches.forEach((match) => {
          let cleanNumber = match.replace(/[$,\s]/g, '')
          let isNegative = false
          
          if (cleanNumber.includes('(') && cleanNumber.includes(')')) {
            isNegative = true
            cleanNumber = cleanNumber.replace(/[()]/g, '')
          }
          
          let multiplier = 1
          if (/million|M$/i.test(match)) {
            multiplier = 1000000
            cleanNumber = cleanNumber.replace(/million|M$/gi, '')
          } else if (/billion|B$/i.test(match)) {
            multiplier = 1000000000
            cleanNumber = cleanNumber.replace(/billion|B$/gi, '')
          } else if (/thousand|K$/i.test(match)) {
            multiplier = 1000
            cleanNumber = cleanNumber.replace(/thousand|K$/gi, '')
          }
          
          const value = parseFloat(cleanNumber) * multiplier * (isNegative ? -1 : 1)
          
          if (!isNaN(value) && value !== 0) {
            const header = table.headers[cellIndex] || `Column ${cellIndex + 1}`
            const rowLabel = table.rows[rowIndex][0] || `Row ${rowIndex + 1}`
            
            // Determine context type from header and row label with year information
            let contextType = 'table_value'
            const combinedContext = `${header} ${rowLabel}`.toLowerCase()
            
            // Extract year information from header or row label
            const yearMatch = combinedContext.match(/20(2[0-9]|1[0-9])/)
            const year = yearMatch ? yearMatch[0] : ''
            
            if (combinedContext.includes('revenue') || combinedContext.includes('sales') || combinedContext.includes('income')) {
              contextType = year ? `${year}_revenue` : 'revenue'
            } else if (combinedContext.includes('expense') || combinedContext.includes('cost')) {
              contextType = year ? `${year}_expense` : 'expense'
            } else if (combinedContext.includes('profit') || combinedContext.includes('net') || combinedContext.includes('earnings')) {
              contextType = year ? `${year}_profit` : 'profit'
            } else if (combinedContext.includes('total') || combinedContext.includes('sum')) {
              contextType = year ? `${year}_total` : 'total'
            } else if (combinedContext.includes('asset')) {
              contextType = year ? `${year}_asset` : 'asset'
            } else if (combinedContext.includes('liability')) {
              contextType = year ? `${year}_liability` : 'liability'
            } else if (year) {
              contextType = `${year}_figure`
            }
            
            numericalData.push({
              value,
              context: `${contextType}: ${rowLabel} - ${header} (${cellValue})`,
              location: `Table ${tableIndex + 1}, ${rowLabel}, ${header}`
            })
          }
        })
      })
    })
  })
  
  return numericalData
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      const base64 = result.split(',')[1]
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export async function performProofreadingAnalysis(text: string): Promise<any[]> {
  try {
    const { object } = await blink.ai.generateObject({
      prompt: `Analyze the following business document text for typos and critical errors. Focus ONLY on clear mistakes, not stylistic preferences:

${text}

Focus ONLY on:
1. Spelling errors (misspelled words)
2. Obvious typos (missing letters, extra letters, wrong letters)
3. Critical grammar errors that affect meaning
4. Missing punctuation that causes confusion

DO NOT flag:
- Style preferences
- Passive voice
- Sentence length
- Word choice preferences
- Formatting preferences

Only return issues that are clearly incorrect and need fixing.`,
      schema: {
        type: 'object',
        properties: {
          issues: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                type: { type: 'string', enum: ['spelling', 'grammar', 'typo'] },
                severity: { type: 'string', enum: ['low', 'medium', 'high'] },
                description: { type: 'string' },
                originalText: { type: 'string' },
                suggestion: { type: 'string' },
                location: { type: 'string' }
              },
              required: ['type', 'severity', 'description', 'suggestion']
            }
          }
        },
        required: ['issues']
      }
    })
    
    return object.issues || []
  } catch (error) {
    console.error('Error in proofreading analysis:', error)
    return []
  }
}

export async function performNumericalValidation(numericalData: Array<{ value: number; context: string; location: string }>): Promise<any[]> {
  try {
    // Group data by type for better analysis
    const revenueData = numericalData.filter(item => item.context.includes('revenue'))
    const expenseData = numericalData.filter(item => item.context.includes('expense'))
    const profitData = numericalData.filter(item => item.context.includes('profit'))
    const totalData = numericalData.filter(item => item.context.includes('total'))
    
    const dataString = numericalData.map(item => 
      `Value: ${item.value.toLocaleString()}, Context: ${item.context}, Location: ${item.location}`
    ).join('\n')
    
    const { object } = await blink.ai.generateObject({
      prompt: `You are analyzing numerical data from a business document to find calculation errors and inconsistencies. Focus on MATHEMATICAL ACCURACY, not formatting.

${dataString}

CRITICAL INSTRUCTIONS:
1. Look for totals that don't match the sum of their components (use exact arithmetic)
2. Find percentages that don't add up to 100% when they should
3. Identify missing or incorrect calculations
4. Check if profit = revenue - expenses (basic accounting equation)
5. Verify that subtotals add up to grand totals

For EACH error found, you MUST provide:
- expectedValue: The mathematically correct number
- actualValue: The incorrect number found in the document
- Clear explanation of the calculation error

Examples:
- If components are 10,000 + 5,000 + 3,000 = 18,000 but total shows 17,500:
  expectedValue: 18000, actualValue: 17500, errorMessage: "Sum of components (18,000) doesn't match stated total (17,500)"

- If Revenue is 100,000 and Expenses are 60,000, but Profit shows 35,000:
  expectedValue: 40000, actualValue: 35000, errorMessage: "Profit calculation error: Revenue (100,000) - Expenses (60,000) should equal 40,000, not 35,000"

ONLY report actual mathematical errors with specific numbers. Ignore formatting differences.`,
      schema: {
        type: 'object',
        properties: {
          validations: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                type: { type: 'string', enum: ['sum', 'total', 'calculation', 'reference'] },
                isValid: { type: 'boolean' },
                expectedValue: { type: 'number' },
                actualValue: { type: 'number' },
                errorMessage: { type: 'string' },
                location: { type: 'string' }
              },
              required: ['type', 'isValid', 'location']
            }
          }
        },
        required: ['validations']
      }
    })
    
    return object.validations || []
  } catch (error) {
    console.error('Error in numerical validation:', error)
    return []
  }
}

export async function performCrossDocumentValidation(
  documents: Array<{
    id: string
    name: string
    numericalData: Array<{ value: number; context: string; location: string }>
  }>
): Promise<any[]> {
  try {
    if (documents.length < 2) {
      return []
    }

    // Create a more sophisticated matching system for cross-document validation
    const inconsistencies: any[] = []
    
    // Extract key financial metrics and years from each document
    const documentMetrics = documents.map(doc => {
      const metrics = new Map<string, Array<{ value: number; location: string }>>()
      
      doc.numericalData.forEach(item => {
        const context = item.context.toLowerCase()
        
        // Extract year information
        const yearMatch = context.match(/20(2[0-9]|1[0-9])/)
        const year = yearMatch ? yearMatch[0] : null
        
        // Extract metric type
        let metricType = 'unknown'
        if (context.includes('revenue') || context.includes('sales') || context.includes('income')) {
          metricType = 'revenue'
        } else if (context.includes('profit') || context.includes('net') || context.includes('earnings')) {
          metricType = 'profit'
        } else if (context.includes('expense') || context.includes('cost')) {
          metricType = 'expense'
        } else if (context.includes('total')) {
          metricType = 'total'
        } else if (context.includes('asset')) {
          metricType = 'asset'
        } else if (context.includes('liability')) {
          metricType = 'liability'
        }
        
        // Create keys for comparison
        const keys = []
        if (year && metricType !== 'unknown') {
          keys.push(`${year}_${metricType}`)
        }
        if (year) {
          keys.push(`${year}_any`)
        }
        if (metricType !== 'unknown') {
          keys.push(`any_${metricType}`)
        }
        
        // Also look for exact context matches
        keys.push(context.replace(/[^a-z0-9\s]/g, '').trim())
        
        keys.forEach(key => {
          if (!metrics.has(key)) {
            metrics.set(key, [])
          }
          metrics.get(key)!.push({ value: item.value, location: item.location })
        })
      })
      
      return {
        documentName: doc.name,
        documentId: doc.id,
        metrics
      }
    })
    
    // Find inconsistencies by comparing metrics across documents
    const allKeys = new Set<string>()
    documentMetrics.forEach(doc => {
      doc.metrics.forEach((_, key) => allKeys.add(key))
    })
    
    allKeys.forEach(key => {
      const documentsWithKey = documentMetrics.filter(doc => doc.metrics.has(key))
      
      if (documentsWithKey.length >= 2) {
        // Compare values for this key across documents
        const allValues: Array<{ documentName: string; value: number; location: string }> = []
        
        documentsWithKey.forEach(doc => {
          const values = doc.metrics.get(key)!
          values.forEach(v => {
            allValues.push({
              documentName: doc.documentName,
              value: v.value,
              location: v.location
            })
          })
        })
        
        // Check if all values are the same
        const uniqueValues = [...new Set(allValues.map(v => v.value))]
        
        if (uniqueValues.length > 1) {
          // Found inconsistency
          const fieldName = key.includes('_') ? 
            key.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) : 
            key.charAt(0).toUpperCase() + key.slice(1)
          
          inconsistencies.push({
            id: `cross-${key}-${Date.now()}`,
            fieldName: fieldName,
            validationType: 'cross_reference',
            isConsistent: false,
            errorMessage: `Different values found for "${fieldName}" across documents. Expected all documents to have the same value.`,
            values: allValues
          })
        }
      }
    })
    
    // Also use AI for more sophisticated analysis
    const documentsString = documents.map(doc => 
      `Document: ${doc.name}\n` +
      doc.numericalData.map(item => 
        `  ${item.value.toLocaleString()} | ${item.context} | ${item.location}`
      ).join('\n')
    ).join('\n\n')
    
    const { object } = await blink.ai.generateObject({
      prompt: `You are analyzing numerical data from multiple business documents to find EXACT VALUE INCONSISTENCIES. Focus ONLY on finding the same financial metrics with different numerical values.

${documentsString}

CRITICAL TASK:
Find financial metrics that should be identical across documents but have different values.

SPECIFIC FOCUS AREAS:
1. Yearly figures (2025, 2024, 2023, etc.) - same year should have same values
2. Revenue/Sales figures for same periods
3. Profit/Net Income for same periods  
4. Total amounts that should match
5. Any financial metric that appears in multiple documents with different values

EXAMPLE INCONSISTENCIES TO FIND:
- Excel: "2025 Revenue: 150,000" vs PDF: "2025 Revenue: 145,000" 
- Excel: "Net Profit 2024: 50,000" vs PDF: "Net Profit 2024: 52,000"
- Excel: "Total Assets: 100,000" vs PDF: "Total Assets: 98,000"

FOR EACH INCONSISTENCY:
- fieldName: Clear description (e.g., "2025 Revenue", "2024 Net Profit")
- errorMessage: Explain what differs
- values: List each document's value with exact numbers

IGNORE:
- Formatting differences (commas, currency symbols)
- Different metrics (revenue vs expenses is not inconsistent)
- Single document values (need at least 2 documents with same metric)

ONLY report when the SAME metric has DIFFERENT numerical values across documents.`,
      schema: {
        type: 'object',
        properties: {
          crossValidations: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                fieldName: { type: 'string' },
                validationType: { type: 'string', enum: ['cross_reference', 'consistency_check'] },
                isConsistent: { type: 'boolean' },
                errorMessage: { type: 'string' },
                values: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      documentName: { type: 'string' },
                      value: { type: 'number' },
                      location: { type: 'string' }
                    },
                    required: ['documentName', 'value', 'location']
                  }
                }
              },
              required: ['fieldName', 'validationType', 'isConsistent', 'values']
            }
          }
        },
        required: ['crossValidations']
      }
    })
    
    // Combine rule-based and AI-based results, removing duplicates
    const aiResults = object.crossValidations || []
    const allResults = [...inconsistencies, ...aiResults]
    
    // Remove duplicates based on fieldName and similar values
    const uniqueResults = allResults.filter((result, index, array) => {
      return index === array.findIndex(r => 
        r.fieldName === result.fieldName && 
        JSON.stringify(r.values.map(v => v.value).sort()) === JSON.stringify(result.values.map(v => v.value).sort())
      )
    })
    
    return uniqueResults
  } catch (error) {
    console.error('Error in cross-document validation:', error)
    return []
  }
}