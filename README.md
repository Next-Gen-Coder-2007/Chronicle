# Chronicle AI

Chronicle AI is an enterprise-grade multimodal personal knowledge and memory management platform. It transforms personal journals, files, documents, visual assets, audio recordings, and videos into an interactive, grounded knowledge base queried through an evidence-traceable conversational AI interface.

---

## 1. System Architecture

Chronicle AI decouples heavy multimodal file extraction and embedding generation from the HTTP request-response cycle using an asynchronous queue architecture powered by **BullMQ** and **Redis**, backed by **PostgreSQL with pgvector** (or embedded SQLite for lightweight environments), **Google Gemini 3.5 Flash**, and a high-performance **React 19** client.

```mermaid
flowchart TB
    subgraph Client ["Client (React 19 + Redux Toolkit)"]
        UI["Modern Light Theme UI & Lenis Inertia Scroll"]
        Chat["Conversational Grounded Studio"]
        Inspector["In-App Media & Citation Inspector"]
    end

    subgraph API ["API Gateway & Controller Layer (NestJS)"]
        AuthCtrl["Auth Controller (JWT & Bcrypt)"]
        MemCtrl["Memory Controller"]
        DocCtrl["Document Controller & Queue Stats"]
        ChatCtrl["Chat & RAG Controller"]
        StreamCtrl["Secure Media Streaming Controller (Range 206)"]
    end

    subgraph AsyncPipeline ["Asynchronous Processing Pipeline"]
        Queue["BullMQ Ingestion Queue (Redis backed)"]
        Worker["DocumentProcessor (Worker)"]
        Fallback["In-Process Fallback Engine"]
    end

    subgraph MultimodalExtractors ["Multimodal Extraction Services"]
        PDF["PDF Extractor (Page Segmentation)"]
        DOCX["DOCX Extractor (Mammoth)"]
        Vision["Vision Extractor (Gemini Scene OCR)"]
        Audio["Audio Extractor (Speech & Timestamps)"]
        Video["Video Extractor (Scene & Audio Sync)"]
        Tabular["Tabular Extractor (CSV & JSON)"]
    end

    subgraph VectorEngine ["Semantic Normalization & Vector Engine"]
        Normalizer["Content Normalizer (Pages & Timestamps)"]
        Chunker["Semantic Chunking Service (Overlap & Boundaries)"]
        Embedder["Embedding Service (Gemini 768-dim)"]
    end

    subgraph StorageLayer ["Persistence Layer"]
        DB[(PostgreSQL 16 + pgvector HNSW / SQLite)]
        Disk[(Encrypted / Local Storage Provider)]
    end

    subgraph RAGCore ["Grounded Retrieval & Reranker"]
        Hybrid["Hybrid Search (Vector + Full-Text)"]
        Reranker["Multi-Factor Reranker"]
        Synthesizer["Gemini 3.5 Flash Grounded Synthesizer"]
    end

    %% Interactions
    UI --> MemCtrl
    UI --> DocCtrl
    Chat --> ChatCtrl
    Inspector --> StreamCtrl

    MemCtrl --> Disk
    MemCtrl --> Queue
    DocCtrl --> Queue

    Queue --> Worker
    Worker -.-> Fallback
    Worker --> MultimodalExtractors

    MultimodalExtractors --> Normalizer
    Normalizer --> Chunker
    Chunker --> Embedder
    Embedder --> DB

    ChatCtrl --> Hybrid
    Hybrid --> DB
    Hybrid --> Reranker
    Reranker --> Synthesizer
    Synthesizer --> Chat
    StreamCtrl --> Disk
```

---

## 2. Multimodal Extraction & Ingestion Pipeline

When media or documents are uploaded, Chronicle AI immediately persists the raw file and delegates processing asynchronously through BullMQ. The system extracts structured semantic representations regardless of input modality.

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Client as Web Client
    participant Controller as Document/Memory Controller
    participant Storage as File Storage Provider
    participant BullMQ as BullMQ Queue (Redis)
    participant Worker as DocumentProcessor
    participant Extractor as Multimodal Extractor
    participant Chunker as Chunking Service
    participant Gemini as Google Gemini Embedder
    participant DB as pgvector Database

    User->>Client: Uploads File / Media Attachment
    Client->>Controller: POST /api/memories/:id/media (Multipart)
    Controller->>Storage: Persist file to local disk / blob storage
    Controller->>DB: Create File & Document records (status: PENDING)
    Controller->>BullMQ: Enqueue Ingestion Job {documentId, fileId}
    Controller-->>Client: 201 Created (Instant Response)

    BullMQ->>Worker: Dispatch Ingestion Job
    Worker->>DB: Update Document status to PROCESSING
    Worker->>Storage: Read file buffer
    Worker->>Extractor: Extract content by MIME type

    alt Document (PDF / DOCX / TXT)
        Extractor-->>Worker: Extracted text segments with page numbers
    else Vision (JPEG / PNG / WebP)
        Extractor->>Gemini: Visual scene analysis & OCR extraction
        Gemini-->>Worker: Deep visual description & textual content
    else Audio / Video (MP3 / WAV / MP4 / WebM)
        Extractor->>Gemini: Speech recognition with speaker diarization & timestamps
        Gemini-->>Worker: Synchronized chronological transcript
    end

    Worker->>DB: Save normalized Content records with metadata
    Worker->>Chunker: Split into semantic chunks (token boundary + overlap)
    Chunker-->>Worker: Array of chunk tokens with page/timestamp tags
    Worker->>Gemini: Generate 768-dimensional dense vector embeddings
    Gemini-->>Worker: Embedding vectors
    Worker->>DB: Save DocumentChunk records with HNSW vectors
    Worker->>DB: Update Document status to COMPLETED
    Worker-->>BullMQ: Mark Job as Done
```

### Supported Modalities

| Modality | Formats | Processing Method | Metadata Extracted |
|---|---|---|---|
| **Text Documents** | `.txt`, `.md`, `.json`, `.csv`, `.html` | Native string parsing & tabular parsing | Row keys, headers, hierarchical headings |
| **PDF Documents** | `.pdf` | `pdf-parse` with page segmentation | Page numbers, physical layout preservation |
| **Word Documents** | `.docx` | `mammoth` document translation | Paragraph styling, document hierarchy |
| **Images** | `.jpg`, `.jpeg`, `.png`, `.webp`, `.gif` | Gemini 3.5 Flash Vision OCR & Scene Description | Object recognition, scene semantics, visible text |
| **Audio** | `.mp3`, `.wav`, `.ogg`, `.m4a` | Gemini Multimodal Audio Transcription | Speaker identification, start/end timestamps |
| **Video** | `.mp4`, `.webm`, `.mov`, `.mkv` | Gemini Multimodal Video Chronological Decomposition | Scene progression, action logs, audio transcript |

---

## 3. BullMQ Queue Architecture & Worker Resilience

Background multimodal extraction is isolated from web server threads:

```mermaid
stateDiagram-v2
    [*] --> Enqueued: File Uploaded
    Enqueued --> Active: Worker Picks Job
    Active --> Completed: Extraction, Chunking & Embedding Succeeded
    Active --> Failed: Ingestion Threw Error
    Failed --> Active: BullMQ Auto-Retry (Exponential Backoff)
    Failed --> InProcessFallback: Redis Unavailable / Max Retries Exceeded
    InProcessFallback --> Completed: Synchronous Fallback Ingestion
    InProcessFallback --> PermanentFailure: Unrecoverable Error
    Completed --> [*]
    PermanentFailure --> [*]
```

- **Redis-Backed Job Queue**: BullMQ manages concurrency, job prioritization, and retries with exponential backoff.
- **In-Process Fallback Engine**: If Redis is not connected or in local development environments, the worker falls back gracefully to in-process execution without dropping ingestion tasks.
- **Live Queue Monitoring**: Health and throughput statistics are accessible at `GET /api/documents/queue/stats` (active, waiting, completed, and failed counts).

---

## 4. Grounded RAG Retrieval & Multi-Factor Reranking

Chronicle AI enforces strict grounding to ensure hallucination-free answers backed by verifiable source citations.

```mermaid
flowchart LR
    subgraph QueryInput ["User Query"]
        Q["User Prompt + Scope Filter"]
    end

    subgraph DenseRetrieval ["Dense Vector Search"]
        QEmb["Gemini 768-dim Query Embedding"]
        HNSW["pgvector HNSW Cosine Index"]
        DenseResults["Top 25 Dense Candidates"]
    end

    subgraph SparseRetrieval ["Sparse Lexical Search"]
        FTS["Full-Text Keyword Search"]
        SparseResults["Top 25 Lexical Candidates"]
    end

    subgraph HybridEngine ["Hybrid Merge & Reranker"]
        Merge["Reciprocal Rank Fusion (RRF)"]
        Rerank["Multi-Factor Reranker:
        - Cosine distance weight (0.60)
        - Lexical term density (0.25)
        - Temporal recency (0.10)
        - Modality priority (0.05)"]
        TopChunks["Top 6 Reranked Context Chunks"]
    end

    subgraph Synthesis ["Grounded Answer Generation"]
        Prompt["Strict Anti-Hallucination System Prompt"]
        GeminiFlash["Gemini 3.5 Flash"]
        Response["Answer with Citations
        (Page numbers & Media Timestamps)"]
    end

    Q --> QEmb
    Q --> FTS
    QEmb --> HNSW --> DenseResults
    FTS --> SparseResults
    DenseResults --> Merge
    SparseResults --> Merge
    Merge --> Rerank --> TopChunks
    TopChunks --> Prompt
    Q --> Prompt
    Prompt --> GeminiFlash --> Response
```

### Citation & Source Traceability
Every assertion synthesized by the assistant links back to the exact chunk where the knowledge originated:
- **Documents & PDFs**: `[annual-report.pdf - Page 12]`
- **Audio Files**: `[team-standup.mp3 at 04:32]`
- **Video Files**: `[lecture-clip.mp4 at 14:05]`
- **Images & Photos**: `[whiteboard-architecture.png]`

---

## 5. Security & Safe Media Streaming

Chronicle AI protects uploaded assets through an authenticated streaming pipeline:

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Client as React Client (Inspector Modal)
    participant StreamAPI as /api/memories/:id/files/:fileId
    participant Storage as File Storage Provider

    User->>Client: Clicks Citation Badge
    Client->>Client: Opens MediaInspectorModal (Viewport Overlay)
    Client->>StreamAPI: GET /api/memories/:id/files/:fileId (with Bearer Token & Range header)
    StreamAPI->>StreamAPI: Validate JWT and Memory Ownership
    StreamAPI->>Storage: Read file metadata and verify path security
    StreamAPI-->>Client: HTTP 206 Partial Content (Content-Range, Content-Type)
    Client->>User: Renders video/audio/image/PDF preview directly in modal
```

- **Zero Direct Server Links**: File paths and raw server URLs are never exposed. Media is served exclusively through authenticated NestJS streaming endpoints.
- **HTTP 206 Partial Content**: Video and audio streaming supports seekable byte ranges for instant scrubbing without downloading full files.
- **In-App Media Inspector Modal**: Modal renders via `createPortal` with global Lenis scroll locking, ESC key dismissal, and responsive media viewers.

---

## 6. Database Entity Relationship Model

```mermaid
erDiagram
    USERS ||--o{ MEMORIES : owns
    MEMORIES ||--o{ FILES : contains
    FILES ||--|| DOCUMENTS : ingested_as
    DOCUMENTS ||--o{ CONTENTS : parsed_into
    DOCUMENTS ||--o{ DOCUMENT_CHUNKS : segmented_into
    CONTENTS ||--o{ DOCUMENT_CHUNKS : maps_to

    USERS {
        uuid id PK
        string email
        string password
        string fullName
        timestamp created_at
    }

    MEMORIES {
        uuid id PK
        uuid userId FK
        string title
        text description
        string status
        string[] tags
        string coverUrl
        timestamp created_at
    }

    FILES {
        uuid id PK
        uuid memoryId FK
        string filename
        string originalName
        string mimeType
        integer size
        string path
        timestamp created_at
    }

    DOCUMENTS {
        uuid id PK
        uuid fileId FK
        string status
        text errorMessage
        timestamp created_at
    }

    CONTENTS {
        uuid id PK
        uuid documentId FK
        string type
        text text
        integer page_number
        float start_timestamp
        float end_timestamp
        jsonb metadata
        timestamp created_at
    }

    DOCUMENT_CHUNKS {
        uuid id PK
        uuid documentId FK
        uuid contentId FK
        integer chunk_index
        text content
        vector embedding_768
        integer page_number
        float start_timestamp
        float end_timestamp
        jsonb metadata
        timestamp created_at
    }
```

---

## 7. Frontend Architecture & User Experience

- **React 19 & TailwindCSS**: Modern light-theme design system featuring rounded surfaces, subtle slate borders, and vibrant Indigo/Violet accents.
- **Lenis Momentum Scrolling**: Single global Lenis instance initialized at application root (`App.tsx`), providing continuous inertia scrolling across the dashboard, memory detail, and full-page chat.
- **Sticky Glassmorphic Composer**: Floating chat input bar with backdrop blur and gradient fade, keeping prompts accessible while scrolling through lengthy conversations.
- **Redux Toolkit**: Centralized state management for authentication, memory collections, and asynchronous background ingestion jobs.

---

## 8. API Reference

### Authentication
- `POST /api/auth/register` — Create new account
- `POST /api/auth/login` — Authenticate and receive JWT cookie/token
- `GET  /api/auth/me` — Retrieve current authenticated user profile

### Memories
- `POST   /api/memories` — Create a new memory
- `GET    /api/memories` — List user memories (supports `?recent=true&limit=N`)
- `GET    /api/memories/:id` — Retrieve memory details with media attachments
- `PATCH  /api/memories/:id` — Update memory title, description, or tags
- `DELETE /api/memories/:id` — Delete memory and cascade associated files
- `GET    /api/memories/:id/summary` — Generate AI summary of memory events and decisions
- `GET    /api/memories/:id/search` — Execute hybrid search scoped to specific memory

### Files & Streaming
- `POST   /api/memories/:id/media` — Upload file attachment or create text note
- `PATCH  /api/memories/:id/media/:mediaId` — Update attachment metadata or note content
- `DELETE /api/memories/:id/media/:mediaId` — Delete attachment
- `GET    /api/memories/:id/files/:fileId` — Authenticated stream of media (supports HTTP 206 Partial Content)

### Ingestion & Background Queue
- `GET    /api/documents/:id` — Retrieve document processing status, contents, and chunks
- `GET    /api/documents/:id/status` — Poll document extraction state
- `POST   /api/documents/:id/reprocess` — Re-enqueue document for multimodal processing
- `GET    /api/documents/queue/stats` — BullMQ queue throughput and waiting/active metrics

### Grounded Search & Conversational Studio
- `POST   /api/search` — Global hybrid search across all memories
- `POST   /api/chat` — Conversational grounded RAG query with citations
- `POST   /api/chat/memory/:id` — Conversational grounded RAG scoped to a single memory

---

## 9. Local Development Setup

### Prerequisites
- **Node.js**: 20+ or 22+
- **Redis**: 7+ (optional; in-process fallback activates automatically if unavailable)
- **PostgreSQL 16 with pgvector** (or embedded SQLite for rapid development)
- **Google Gemini API Key**

### 1. Clone & Install Dependencies

```bash
# Clone the repository
git clone https://github.com/Next-Gen-Coder-2007/Chronicle.git
cd Chronicle

# Install backend dependencies
cd server
npm install

# Install frontend dependencies
cd ../client
npm install
```

### 2. Configure Backend Environment

Create `server/.env`:

```env
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# Database configuration (SQLite or PostgreSQL with pgvector)
DATABASE_URL=sqlite://chronicle.sqlite
DATABASE_SSL=false

# Redis Configuration (for BullMQ queue)
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT Authentication
JWT_SECRET=chronicle_dev_secret_key_change_in_production
JWT_EXPIRES_IN=7d

# Google Gemini API
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-3.5-flash
EMBEDDING_MODEL=gemini-embedding-001

UPLOADS_DIR=uploads
```

### 3. Run Development Servers

```bash
# Terminal 1 - Backend API (NestJS with watch mode)
cd server
npm run start:dev

# Terminal 2 - Frontend SPA (Vite dev server)
cd client
npm run dev
```

Open `http://localhost:5173` in your browser.
