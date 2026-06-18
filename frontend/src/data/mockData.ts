export type DocumentStatus = 'uploaded' | 'processing' | 'processed' | 'ready' | 'failed' | 'needs_ocr'

export interface Document {
  id: string
  title: string
  uploadedAt: string
  status: DocumentStatus
  pageCount: number
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  citations?: Citation[]
}

export interface Citation {
  id: string
  pageNumber: number
  snippet: string
  documentTitle?: string
}

export interface Conversation {
  id: string
  title: string
}

export interface DashboardStats {
  totalDocuments: number
  questionsAsked: number
  conversations: number
  storageUsedGb: number
  storageLimitGb: number
}

export const mockUser = {
  name: 'Angel',
  email: 'angel@example.com',
}

export const mockStats: DashboardStats = {
  totalDocuments: 47,
  questionsAsked: 42,
  conversations: 2,
  storageUsedGb: 2.4,
  storageLimitGb: 25,
}

export const mockDocuments: Document[] = [
  {
    id: '1',
    title: 'Artificial Intelligence Research Paper.pdf',
    uploadedAt: 'Jun 17, 2025',
    status: 'ready',
    pageCount: 24,
  },
  {
    id: '2',
    title: 'Machine Learning Notes.pdf',
    uploadedAt: 'Jun 15, 2025',
    status: 'ready',
    pageCount: 18,
  },
  {
    id: '3',
    title: 'Q3 Financial Report.pdf',
    uploadedAt: 'Jun 14, 2025',
    status: 'processing',
    pageCount: 42,
  },
  {
    id: '4',
    title: 'Product Requirements Doc.pdf',
    uploadedAt: 'Jun 12, 2025',
    status: 'ready',
    pageCount: 12,
  },
]

export const mockConversations: Conversation[] = [
  { id: '1', title: 'Summarize chapter 3' },
  { id: '2', title: 'Summarize about neural networks' },
  { id: '3', title: 'Find important concepts' },
]

export const mockChatMessages: ChatMessage[] = [
  {
    id: '1',
    role: 'user',
    content: 'Summarize chapter 3.',
  },
  {
    id: '2',
    role: 'assistant',
    content:
      'Chapter 3 covers the fundamentals of neural networks and their application in modern AI systems. Key points include:\n\n• Introduction to perceptrons and multi-layer networks\n• Backpropagation and gradient descent optimization\n• Common architectures: CNNs, RNNs, and transformers\n• Real-world applications in computer vision and NLP\n• Challenges including overfitting and interpretability',
    citations: [
      {
        id: 'c1',
        pageNumber: 12,
        snippet:
          'Neural networks form the backbone of modern deep learning systems, enabling machines to learn patterns from data.',
        documentTitle: 'Artificial Intelligence Research Paper.pdf',
      },
      {
        id: 'c2',
        pageNumber: 13,
        snippet:
          'Backpropagation allows networks to adjust weights by propagating error gradients backward through layers.',
        documentTitle: 'Artificial Intelligence Research Paper.pdf',
      },
      {
        id: 'c3',
        pageNumber: 14,
        snippet:
          'Transformer architectures have revolutionized natural language processing since their introduction.',
        documentTitle: 'Artificial Intelligence Research Paper.pdf',
      },
    ],
  },
]

export const mockCitations: Citation[] = [
  {
    id: 'c1',
    pageNumber: 12,
    snippet:
      'Neural networks form the backbone of modern deep learning systems, enabling machines to learn patterns from data.',
    documentTitle: 'Research Paper.pdf',
  },
  {
    id: 'c2',
    pageNumber: 13,
    snippet:
      'Backpropagation allows networks to adjust weights by propagating error gradients backward through layers.',
    documentTitle: 'Research Paper.pdf',
  },
  {
    id: 'c3',
    pageNumber: 3,
    snippet:
      'Supervised learning requires labeled datasets to train models that generalize to unseen examples.',
    documentTitle: 'Machine Learning Notes.pdf',
  },
]

export const processingSteps = [
  { id: 'upload', label: 'Uploading PDF' },
  { id: 'extract', label: 'Extracting Text' },
  { id: 'chunk', label: 'Chunking Document' },
  { id: 'embed', label: 'Generating Embeddings' },
  { id: 'ready', label: 'Ready to Chat' },
] as const

export const landingFeatures = [
  {
    title: 'Chat with PDFs',
    description: 'Ask questions in natural language and get instant answers grounded in your documents.',
    icon: 'message' as const,
  },
  {
    title: 'Citation-Based Answers',
    description: 'Every response links back to the exact page and passage it came from.',
    icon: 'quote' as const,
  },
  {
    title: 'Semantic Search',
    description: 'Powered by vector embeddings for meaning-based retrieval, not just keywords.',
    icon: 'search' as const,
  },
  {
    title: 'Streaming Responses',
    description: 'Watch answers appear in real time with server-sent events for a fluid experience.',
    icon: 'zap' as const,
  },
]

export const promptSuggestions = [
  'Summarize this document',
  'Explain chapter 4',
  'Find important concepts',
  'Create study notes',
]
