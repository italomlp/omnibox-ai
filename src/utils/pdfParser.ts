import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

type PdfJsModule = typeof import('pdfjs-dist')
type MammothModule = typeof import('mammoth')
type PdfTextItem = { str?: string }

let pdfJsModulePromise: Promise<PdfJsModule> | null = null
let mammothModulePromise: Promise<MammothModule> | null = null
let pdfWorkerConfigured = false

function isPdfTextItem(item: unknown): item is { str: string } {
  return typeof item === 'object' && item !== null && 'str' in item && typeof (item as { str?: unknown }).str === 'string'
}

async function loadPdfJsModule(): Promise<PdfJsModule> {
  const pdfjsLib = await (pdfJsModulePromise ??= import('pdfjs-dist'))

  if (!pdfWorkerConfigured) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl
    pdfWorkerConfigured = true
  }

  return pdfjsLib
}

async function loadMammothModule(): Promise<MammothModule> {
  return (mammothModulePromise ??= import('mammoth'))
}

/**
 * Extracts plain text from a PDF file using pdf.js.
 */
export async function extractTextFromPdf(
  file: File,
  onProgress?: (msg: string) => void,
): Promise<string> {
  if (onProgress) onProgress('Loading PDF parser library...')

  const pdfjsLib = await loadPdfJsModule()
  const fileBytes = new Uint8Array(await file.arrayBuffer())

  if (onProgress) onProgress('Parsing PDF structures...')
  const loadingTask = pdfjsLib.getDocument({ data: fileBytes })

  try {
    const pdf = await loadingTask.promise
    const pageTexts: string[] = []

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      if (onProgress) onProgress(`Extracting page ${pageNumber} of ${pdf.numPages}...`)
      const page = await pdf.getPage(pageNumber)
      const textContent = await page.getTextContent()
      const pageText = (textContent.items as PdfTextItem[]).filter(isPdfTextItem).map((item) => item.str).join(' ')
      pageTexts.push(pageText)
    }

    if (onProgress) onProgress('Parsing complete.')
    return pageTexts.join('\n\n').trim()
  } finally {
    await loadingTask.destroy().catch(() => undefined)
  }
}

/**
 * Extracts plain text from a Word .docx document using mammoth.js.
 */
export async function extractTextFromDocx(
  file: File,
  onProgress?: (msg: string) => void,
): Promise<string> {
  if (onProgress) onProgress('Loading Word document parser library...')

  if (onProgress) onProgress('Reading file contents...')
  const arrayBuffer = await file.arrayBuffer()
  const mammoth = await loadMammothModule()

  if (onProgress) onProgress('Converting Word structures to text...')
  const result = await mammoth.extractRawText({ arrayBuffer })
  
  if (onProgress) onProgress('Parsing complete.')
  return result.value.trim()
}
