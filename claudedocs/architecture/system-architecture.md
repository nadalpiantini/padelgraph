# Sprint 4: Travel Mode - System Architecture

**Version:** 1.0.0
**Last Updated:** October 17, 2025
**Sprint:** Sprint 4 - Travel & Discovery Mode

---

## 📖 Table of Contents

1. [System Overview](#system-overview)
2. [High-Level Architecture](#high-level-architecture)
3. [Component Architecture](#component-architecture)
4. [Data Architecture](#data-architecture)
5. [API Architecture](#api-architecture)
6. [Caching Strategy](#caching-strategy)
7. [Security Architecture](#security-architecture)

---

## System Overview

Travel Mode is a comprehensive social discovery and recommendation system built on Next.js, Supabase, and Redis caching.

### Key Components

- **Frontend:** Next.js 15 + React Server Components
- **Backend:** Next.js API Routes + Supabase Edge Functions
- **Database:** PostgreSQL (Supabase) with PostGIS
- **Cache:** Redis (Upstash)
- **Auth:** Supabase Auth (JWT)
- **Deployment:** Vercel Edge Network

---

## High-Level Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        Web[Web Browser]
        Mobile[Mobile App]
    end

    subgraph "Edge Layer (Vercel)"
        NextApp[Next.js App<br/>Server Components]
        API[API Routes<br/>/api/*]
        Middleware[Auth Middleware]
    end

    subgraph "Business Logic Layer"
        RecEngine[Recommendations<br/>Engine]
        GraphEngine[Graph Traversal<br/>BFS Algorithm]
        AutoMatch[Auto-Match<br/>Service]
        Discovery[Discovery<br/>Service]
    end

    subgraph "Data Layer"
        Cache[(Redis Cache<br/>Upstash)]
        DB[(PostgreSQL<br/>PostGIS)]
        Storage[(Supabase<br/>Storage)]
    end

    subgraph "External Services"
        Auth[Supabase Auth]
        OpenAI[OpenAI API<br/>Embeddings]
        Email[Resend<br/>Email]
        SMS[Twilio<br/>WhatsApp]
    end

    Web --> NextApp
    Mobile --> NextApp
    NextApp --> Middleware
    Middleware --> API

    API --> RecEngine
    API --> GraphEngine
    API --> AutoMatch
    API --> Discovery

    RecEngine --> Cache
    GraphEngine --> Cache
    RecEngine --> DB
    GraphEngine --> DB
    AutoMatch --> DB
    Discovery --> DB

    API --> Auth
    RecEngine --> OpenAI
    AutoMatch --> Email
    AutoMatch --> SMS

    DB --> Storage

    style NextApp fill:#3b82f6
    style API fill:#10b981
    style Cache fill:#f59e0b
    style DB fill:#ef4444
    style Auth fill:#8b5cf6
```

---

## Component Architecture

### Travel Mode Components

```mermaid
graph LR
    subgraph "Frontend Components"
        TravelDash[Travel Dashboard]
        DiscMap[Discovery Map]
        RecFeed[Recommendations<br/>Feed]
        ConnGraph[Connection<br/>Graph Viz]
        AutoMatchUI[Auto-Match<br/>Settings]
    end

    subgraph "API Endpoints"
        RecAPI[/api/recommendations]
        GraphAPI[/api/graph/connection]
        DiscAPI[/api/discover/*]
        MatchAPI[/api/auto-match/*]
        TravelAPI[/api/travel-mode/*]
    end

    subgraph "Core Services"
        RecSvc[Recommendations<br/>Service]
        GraphSvc[Graph<br/>Service]
        DiscSvc[Discovery<br/>Service]
        MatchSvc[Auto-Match<br/>Service]
    end

    subgraph "Data Models"
        UserProfile[user_profile]
        TravelPlan[travel_plans]
        Recommendation[recommendation]
        Connection[social_connection]
        Organization[organization]
        Tournament[tournament]
    end

    TravelDash --> RecAPI
    TravelDash --> TravelAPI
    DiscMap --> DiscAPI
    RecFeed --> RecAPI
    ConnGraph --> GraphAPI
    AutoMatchUI --> MatchAPI

    RecAPI --> RecSvc
    GraphAPI --> GraphSvc
    DiscAPI --> DiscSvc
    MatchAPI --> MatchSvc
    TravelAPI --> RecSvc

    RecSvc --> UserProfile
    RecSvc --> TravelPlan
    RecSvc --> Recommendation
    GraphSvc --> Connection
    DiscSvc --> Organization
    MatchSvc --> Recommendation

    style TravelDash fill:#3b82f6
    style RecAPI fill:#10b981
    style RecSvc fill:#f59e0b
    style UserProfile fill:#ef4444
```

---

## Data Architecture

### Database Schema (Travel Mode)

```mermaid
erDiagram
    user_profile ||--o{ travel_plans : creates
    user_profile ||--o{ recommendation : receives
    user_profile ||--o{ social_connection : has
    user_profile ||--o{ org_member : joins
    user_profile ||--o{ tournament_participant : participates

    travel_plans {
        uuid id PK
        uuid user_id FK
        string destination
        date start_date
        date end_date
        enum status
        jsonb preferences
        timestamp created_at
    }

    recommendation {
        uuid id PK
        uuid user_id FK
        uuid recommended_id FK
        enum recommended_type
        float score
        string reason
        jsonb metadata
        boolean shown
        boolean clicked
        boolean accepted
        timestamp created_at
    }

    social_connection {
        uuid id PK
        uuid user_a FK
        uuid user_b FK
        enum connection_type
        enum status
        timestamp created_at
    }

    user_profile {
        uuid id PK
        string name
        enum level
        int skill_rating
        string city
        geography location
        jsonb privacy_settings
        timestamp last_active
    }

    organization {
        uuid id PK
        string name
        string city
        geography location
        int courts_count
        float rating
    }

    tournament {
        uuid id PK
        string name
        enum format
        enum level_requirement
        date starts_at
        enum status
    }

    org_member {
        uuid org_id FK
        uuid user_id FK
        enum role
        timestamp joined_at
    }

    tournament_participant {
        uuid tournament_id FK
        uuid user_id FK
        timestamp registered_at
    }
```

### PostGIS Spatial Queries

```mermaid
graph TB
    subgraph "Spatial Data"
        UserLoc[User Location<br/>POINT(lng, lat)]
        OrgLoc[Club Location<br/>POINT(lng, lat)]
    end

    subgraph "Spatial Functions"
        Nearby[ST_DWithin<br/>Radius Search]
        Distance[ST_Distance<br/>Calculate Distance]
        Buffer[ST_Buffer<br/>Create Radius]
    end

    subgraph "Spatial Indexes"
        GiST[GIST Index<br/>location column]
    end

    subgraph "Query Results"
        NearbyUsers[Nearby Users<br/>Within 10km]
        NearbyClubs[Nearby Clubs<br/>Within 20km]
    end

    UserLoc --> Nearby
    OrgLoc --> Nearby
    Nearby --> GiST
    GiST --> NearbyUsers
    GiST --> NearbyClubs

    UserLoc --> Distance
    OrgLoc --> Distance
    Distance --> NearbyUsers
    Distance --> NearbyClubs

    UserLoc --> Buffer
    Buffer --> Nearby

    style GiST fill:#f59e0b
    style Nearby fill:#10b981
    style NearbyUsers fill:#3b82f6
    style NearbyClubs fill:#3b82f6
```

---

## API Architecture

### Recommendations API Flow

```mermaid
sequenceDiagram
    participant Client
    participant API as /api/recommendations
    participant Cache as Redis Cache
    participant Engine as Rec Engine
    participant CF as Collaborative<br/>Filtering
    participant DB as Supabase DB

    Client->>API: GET /api/recommendations?type=player
    API->>API: Validate JWT
    API->>API: Validate params

    API->>Cache: Check cache(user_id)
    alt Cache Hit
        Cache-->>API: Return cached recs
        API-->>Client: 200 OK (cached)
    else Cache Miss
        API->>Engine: generateRecommendations()
        Engine->>DB: Extract user features
        DB-->>Engine: User profile data

        Engine->>CF: Find similar users
        CF->>DB: Query all active users
        DB-->>CF: User features list
        CF-->>Engine: Similar users (top 10)

        Engine->>DB: Get candidate players
        DB-->>Engine: Players from interactions

        Engine->>Engine: Score candidates
        Engine->>Engine: Apply filters

        Engine->>DB: Save recommendations
        DB-->>Engine: Saved

        Engine->>Cache: Store in cache (24h)
        Cache-->>Engine: Cached

        Engine-->>API: Recommendations
        API-->>Client: 200 OK (fresh)
    end
```

### Graph Connection API Flow

```mermaid
sequenceDiagram
    participant Client
    participant API as /api/graph/connection
    participant Cache as Redis Cache
    participant DB as PostgreSQL
    participant BFS as BFS Function

    Client->>API: GET /api/graph/connection?target=xyz
    API->>API: Validate JWT
    API->>API: Validate params

    API->>Cache: Check cache(user_a:user_b)
    alt Cache Hit
        Cache-->>API: Return cached path
        API-->>Client: 200 OK (cached)
    else Cache Miss
        API->>DB: Check target user exists
        DB-->>API: User found

        API->>BFS: find_connection_path(start, end, depth)

        BFS->>BFS: Initialize BFS queue
        BFS->>BFS: Level 0: Add start user

        loop For each level
            BFS->>DB: Get connections at level
            DB-->>BFS: Connections (privacy filtered)
            BFS->>BFS: Check if target found

            alt Target Found
                BFS->>BFS: Reconstruct path
                BFS-->>API: Path found
            else Max Depth Reached
                BFS-->>API: No path
            end
        end

        API->>DB: Get user details for path
        DB-->>API: User info

        API->>Cache: Store in cache (1h)
        Cache-->>API: Cached

        API-->>Client: 200 OK (path)
    end
```

---

## Caching Strategy

### Cache Layers

```mermaid
graph TB
    subgraph "Application Layer"
        Request[Client Request]
    end

    subgraph "Cache Layer 1: Redis (Hot)"
        RecCache[Recommendations<br/>TTL: 24h]
        GraphCache[Graph Paths<br/>TTL: 1h]
        DiscCache[Discovery Feed<br/>TTL: 30min]
    end

    subgraph "Cache Layer 2: Database"
        RecTable[recommendation<br/>table]
        GraphMat[Connection<br/>Materialized View]
    end

    subgraph "Source of Truth"
        DB[(PostgreSQL)]
    end

    Request --> RecCache
    Request --> GraphCache
    Request --> DiscCache

    RecCache -->|Miss| RecTable
    GraphCache -->|Miss| GraphMat
    DiscCache -->|Miss| DB

    RecTable -->|Miss| DB
    GraphMat -->|Miss| DB

    DB -->|Write-through| RecTable
    DB -->|Refresh| GraphMat

    RecTable -->|Populate| RecCache
    GraphMat -->|Populate| GraphCache
    DB -->|Populate| DiscCache

    style RecCache fill:#10b981
    style GraphCache fill:#10b981
    style DiscCache fill:#10b981
    style DB fill:#ef4444
```

### Cache Invalidation Flow

```mermaid
sequenceDiagram
    participant Event as System Event
    participant Trigger as DB Trigger
    participant Cache as Redis Cache
    participant BG as Background Job

    alt Profile Update
        Event->>Trigger: user_profile updated
        Trigger->>Cache: Invalidate rec:{user_id}:*
        Trigger->>Cache: Invalidate graph:{user_id}:*
    end

    alt New Connection
        Event->>Trigger: social_connection created
        Trigger->>Cache: Invalidate graph:{user_a}:*
        Trigger->>Cache: Invalidate graph:{user_b}:*
        Trigger->>BG: Queue recommendation refresh
        BG->>Cache: Invalidate rec:{user_a}:*
        BG->>Cache: Invalidate rec:{user_b}:*
    end

    alt Travel Plan Change
        Event->>Trigger: travel_plans updated
        Trigger->>Cache: Invalidate rec:{user_id}:*
        Trigger->>Cache: Invalidate discover:{city}:*
    end

    alt Match Completed
        Event->>Trigger: match status = completed
        Trigger->>BG: Queue participant rec refresh
        BG->>Cache: Invalidate rec:{player_id}:*
    end
```

---

## Security Architecture

### Authentication & Authorization Flow

```mermaid
sequenceDiagram
    participant Client
    participant Next as Next.js Middleware
    participant Auth as Supabase Auth
    participant API as API Route
    participant RLS as RLS Policies
    participant DB as PostgreSQL

    Client->>Next: Request with JWT
    Next->>Next: Extract JWT from cookie
    Next->>Auth: Verify JWT signature

    alt JWT Invalid
        Auth-->>Next: Invalid
        Next-->>Client: 401 Unauthorized
    else JWT Valid
        Auth-->>Next: User ID + metadata
        Next->>Next: Attach user to request
        Next->>API: Forward request

        API->>API: Validate permissions

        alt Not Authorized
            API-->>Client: 403 Forbidden
        else Authorized
            API->>RLS: Query with user context
            RLS->>RLS: Apply RLS policies
            RLS->>DB: Filtered query
            DB-->>RLS: Results
            RLS-->>API: Filtered results
            API-->>Client: 200 OK
        end
    end
```

### Row Level Security (RLS) Policies

```mermaid
graph TB
    subgraph "RLS Policy Engine"
        Policy1[Travel Plans:<br/>Own records only]
        Policy2[Recommendations:<br/>Own records only]
        Policy3[Connections:<br/>Mutual or public]
        Policy4[User Profiles:<br/>Public or connected]
    end

    subgraph "Policy Logic"
        Check1{user_id =<br/>auth.uid?}
        Check2{Privacy =<br/>public?}
        Check3{Mutual<br/>friend?}
        Check4{Admin<br/>role?}
    end

    subgraph "Access Decision"
        Allow[✅ Allow Access]
        Deny[❌ Deny Access]
    end

    Policy1 --> Check1
    Policy2 --> Check1
    Policy3 --> Check2
    Policy4 --> Check2

    Check1 -->|Yes| Allow
    Check1 -->|No| Check4

    Check2 -->|Yes| Allow
    Check2 -->|No| Check3

    Check3 -->|Yes| Allow
    Check3 -->|No| Deny

    Check4 -->|Yes| Allow
    Check4 -->|No| Deny

    style Allow fill:#10b981
    style Deny fill:#ef4444
```

### Privacy Controls

```mermaid
graph LR
    subgraph "User Privacy Settings"
        LocVis[Location Visibility<br/>public/connections/private]
        DiscEn[Discovery Enabled<br/>true/false]
        AutoMatch[Auto-Match Enabled<br/>true/false]
        Travel[Travel Mode Visible<br/>true/false]
    end

    subgraph "Visibility Rules"
        Public[Everyone can see]
        Connections[Only connections]
        Private[Hidden from all]
    end

    subgraph "System Behavior"
        MapShow[Show on Map]
        RecShow[Appear in Recs]
        GraphShow[Appear in Graph]
        MatchEnable[Enable Auto-Match]
    end

    LocVis -->|public| Public
    LocVis -->|connections| Connections
    LocVis -->|private| Private

    Public --> MapShow
    Connections --> MapShow
    Private -.->|No| MapShow

    DiscEn -->|true| RecShow
    DiscEn -->|false| RecShow

    Public --> GraphShow
    Connections --> GraphShow

    AutoMatch -->|true| MatchEnable
    AutoMatch -->|false| MatchEnable

    Travel -->|true| RecShow
    Travel -->|false| RecShow

    style MapShow fill:#10b981
    style RecShow fill:#10b981
    style GraphShow fill:#10b981
    style MatchEnable fill:#10b981
```

---

## Deployment Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        Browser[Web Browser]
        Mobile[Mobile App]
    end

    subgraph "CDN Layer (Vercel Edge)"
        Edge1[Edge Node<br/>US-East]
        Edge2[Edge Node<br/>EU-West]
        Edge3[Edge Node<br/>APAC]
    end

    subgraph "Application Layer (Vercel)"
        SSR[Next.js SSR<br/>Server Components]
        API[API Routes<br/>Edge Functions]
        Static[Static Assets<br/>CDN]
    end

    subgraph "Data Layer"
        Redis[(Redis<br/>Upstash)]
        Supabase[(Supabase<br/>PostgreSQL)]
    end

    subgraph "External Services"
        OpenAI[OpenAI]
        Resend[Resend]
        Twilio[Twilio]
    end

    Browser --> Edge1
    Mobile --> Edge2
    Browser --> Edge3

    Edge1 --> SSR
    Edge2 --> SSR
    Edge3 --> SSR

    Edge1 --> Static
    Edge2 --> Static
    Edge3 --> Static

    SSR --> API
    API --> Redis
    API --> Supabase
    API --> OpenAI
    API --> Resend
    API --> Twilio

    style Edge1 fill:#3b82f6
    style Edge2 fill:#3b82f6
    style Edge3 fill:#3b82f6
    style Redis fill:#f59e0b
    style Supabase fill:#ef4444
```

---

## Performance Optimization

### Query Optimization Flow

```mermaid
graph LR
    subgraph "Query Entry"
        Request[API Request]
    end

    subgraph "Optimization Layers"
        L1[L1: Redis Cache<br/>Sub-50ms]
        L2[L2: DB Cache<br/>Sub-100ms]
        L3[L3: Indexed Query<br/>Sub-200ms]
        L4[L4: Full Scan<br/>>500ms]
    end

    subgraph "Results"
        Fast[✅ Fast Response<br/><200ms]
        Slow[⚠️ Slow Response<br/>>200ms]
    end

    Request --> L1
    L1 -->|Hit| Fast
    L1 -->|Miss| L2
    L2 -->|Hit| Fast
    L2 -->|Miss| L3
    L3 -->|Hit| Fast
    L3 -->|Miss| L4
    L4 --> Slow

    style Fast fill:#10b981
    style Slow fill:#f59e0b
```

---

*Last updated: October 17, 2025*
*Sprint 4 Version: 1.0.0*
*Next review: November 2025 (Sprint 5)*
