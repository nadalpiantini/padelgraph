# Sprint 4: Travel Mode - Data Flow Diagrams

**Version:** 1.0.0
**Last Updated:** October 17, 2025
**Sprint:** Sprint 4 - Travel & Discovery Mode

---

## 📖 Table of Contents

1. [User Journey Flows](#user-journey-flows)
2. [Recommendations Flow](#recommendations-flow)
3. [Graph Connection Flow](#graph-connection-flow)
4. [Auto-Match Flow](#auto-match-flow)
5. [Discovery Feed Flow](#discovery-feed-flow)
6. [Travel Mode Activation Flow](#travel-mode-activation-flow)

---

## User Journey Flows

### Complete Travel Mode User Journey

```mermaid
journey
    title Travel Mode: Complete User Journey
    section Planning
      Enable Travel Mode: 5: User
      Set Destination: 5: User
      Configure Preferences: 4: User
    section Discovery
      View Discovery Map: 5: User, System
      Browse Recommendations: 5: User, System
      Check Connection Graph: 4: User, System
    section Connection
      Request Introduction: 4: User
      Receive Auto-Match: 5: System
      Start Conversation: 5: User
    section Booking
      Find Available Court: 5: User, System
      Book Court: 5: User
      Invite Players: 4: User
    section Playing
      Check-in at Court: 5: User
      Play Match: 5: User
      Rate Experience: 4: User
```

---

## Recommendations Flow

### Player Recommendations Generation

```mermaid
flowchart TD
    Start([User Opens<br/>Discover Page]) --> CheckAuth{User<br/>Authenticated?}

    CheckAuth -->|No| Login[Redirect to Login]
    CheckAuth -->|Yes| CheckCache{Check Redis<br/>Cache}

    CheckCache -->|Hit| ReturnCached[Return Cached<br/>Recommendations]
    CheckCache -->|Miss| ExtractFeatures[Extract User<br/>Features]

    ExtractFeatures --> GetProfile[Get User Profile<br/>level, city, location]
    GetProfile --> GetMatches[Get Match History<br/>recent matches]
    GetMatches --> GetConnections[Get Social<br/>Connections]
    GetConnections --> GetClubs[Get Club<br/>Memberships]

    GetClubs --> FeatureVector[Build Feature<br/>Vector]

    FeatureVector --> FindSimilar[Find Similar Users<br/>Collaborative Filtering]

    FindSimilar --> QueryActive[Query Active Users<br/>last 30 days]
    QueryActive --> CalcSimilarity[Calculate Similarity<br/>5 factors]
    CalcSimilarity --> RankSimilar[Rank by Similarity<br/>Top 10]

    RankSimilar --> GetCandidates[Get Candidate Players<br/>from similar users]

    GetCandidates --> ExtractInteractions[Extract Interactions<br/>played_with, friends]
    ExtractInteractions --> FilterSelf[Filter Out Self<br/>& existing connections]

    FilterSelf --> ScoreCandidates[Score Each Candidate<br/>weighted sum]

    ScoreCandidates --> ApplyFilters{Apply User<br/>Filters?}

    ApplyFilters -->|Distance| FilterDistance[Filter by Distance<br/>max_distance_km]
    ApplyFilters -->|Score| FilterScore[Filter by Min Score<br/>min_score]
    ApplyFilters -->|Exclude| FilterExclude[Exclude IDs<br/>exclude_ids]

    FilterDistance --> RankFinal[Rank by Final Score<br/>descending]
    FilterScore --> RankFinal
    FilterExclude --> RankFinal

    RankFinal --> LimitResults[Limit to N Results<br/>default: 10]

    LimitResults --> EnrichMetadata[Enrich with Metadata<br/>shared_connections, distance]

    EnrichMetadata --> SaveDB[(Save to DB<br/>recommendation table)]
    SaveDB --> SaveCache[(Save to Redis<br/>24h TTL)]

    SaveCache --> MarkShown[Mark as Shown<br/>shown: false → true]

    MarkShown --> ReturnResults[Return<br/>Recommendations]

    ReturnCached --> End([Display to User])
    ReturnResults --> End

    style Start fill:#3b82f6
    style End fill:#10b981
    style CheckCache fill:#f59e0b
    style SaveDB fill:#ef4444
    style SaveCache fill:#f59e0b
```

### Recommendation Acceptance Flow

```mermaid
sequenceDiagram
    participant User
    participant UI as Recommendations UI
    participant API as /api/recommendations
    participant DB as Database

    User->>UI: Click on recommendation
    UI->>API: PATCH /api/recommendations/:id
    Note over API: Mark clicked: true

    API->>DB: UPDATE recommendation<br/>SET clicked = true
    DB-->>API: Updated

    UI->>User: Show player profile

    User->>UI: Send connection request
    UI->>API: POST /api/connections
    Note over API: Create connection

    API->>DB: INSERT INTO social_connection
    DB-->>API: Created

    API->>API: Mark recommendation accepted
    API->>DB: UPDATE recommendation<br/>SET accepted = true
    DB-->>API: Updated

    API->>API: Invalidate cache
    Note over API: Clear rec:{user_id}:*<br/>Clear graph:{user_id}:*

    API-->>UI: Connection created
    UI-->>User: Success notification
```

---

## Graph Connection Flow

### BFS Traversal for Connection Path

```mermaid
flowchart TD
    Start([User Searches<br/>Connection]) --> Input[Input Target<br/>User ID]

    Input --> ValidateAuth{User<br/>Authenticated?}
    ValidateAuth -->|No| AuthError[401 Unauthorized]
    ValidateAuth -->|Yes| ValidateTarget{Target User<br/>Exists?}

    ValidateTarget -->|No| NotFoundError[404 Not Found]
    ValidateTarget -->|Yes| CheckCache{Check Redis<br/>Cache}

    CheckCache -->|Hit| ReturnCached[Return Cached Path]
    CheckCache -->|Miss| InitBFS[Initialize BFS<br/>Queue]

    InitBFS --> Level0[Level 0:<br/>Add Start User]

    Level0 --> LoopCheck{More Levels<br/>& Not Found?}

    LoopCheck -->|No| NoPath[Return:<br/>Not Connected]
    LoopCheck -->|Yes| GetLevel[Get Users at<br/>Current Level]

    GetLevel --> QueryConnections[Query Connections<br/>FROM social_connection]

    QueryConnections --> ApplyPrivacy{Apply Privacy<br/>Filters}

    ApplyPrivacy --> FilterAccepted[Only status:<br/>accepted]
    FilterAccepted --> FilterPublic[Only public OR<br/>mutual friends]

    FilterPublic --> CheckVisited{Already<br/>Visited?}

    CheckVisited -->|Yes| LoopCheck
    CheckVisited -->|No| AddToQueue[Add to Queue<br/>for Next Level]

    AddToQueue --> CheckTarget{Is Target<br/>User?}

    CheckTarget -->|No| LoopCheck
    CheckTarget -->|Yes| ReconstructPath[Reconstruct Path<br/>from target to start]

    ReconstructPath --> GetUserInfo[Fetch User Details<br/>for path nodes]

    GetUserInfo --> BuildPath[Build Enriched Path<br/>with user info]

    BuildPath --> SaveCache[(Save to Redis<br/>1h TTL)]

    SaveCache --> ReturnPath[Return Connection<br/>Path]

    ReturnCached --> End([Display Connection<br/>Visualization])
    ReturnPath --> End
    NoPath --> End

    style Start fill:#3b82f6
    style End fill:#10b981
    style CheckCache fill:#f59e0b
    style SaveCache fill:#f59e0b
    style QueryConnections fill:#ef4444
```

### Connection Graph Visualization

```mermaid
graph LR
    subgraph "1st Degree (Direct)"
        You([You])
        Friend1[Friend 1]
        Friend2[Friend 2]
        Friend3[Friend 3]
    end

    subgraph "2nd Degree (Friends of Friends)"
        F1Friend1[Juan]
        F1Friend2[Pedro]
        F2Friend1[Maria]
        F2Friend2[Carlos]
    end

    subgraph "3rd Degree (Extended Network)"
        Target[Target User]
        Other1[Other]
        Other2[Other]
    end

    You -->|played_with| Friend1
    You -->|friend| Friend2
    You -->|clubmate| Friend3

    Friend1 -->|friend| F1Friend1
    Friend1 -->|tournament| F1Friend2

    Friend2 -->|played_with| F2Friend1
    Friend2 -->|friend| F2Friend2

    F1Friend1 -->|friend| Target
    F1Friend2 -->|tournament| Other1
    F2Friend1 -->|clubmate| Other2
    F2Friend2 -->|played_with| Target

    style You fill:#3b82f6
    style Target fill:#ef4444
    style Friend1 fill:#10b981
    style Friend2 fill:#10b981
    style F1Friend1 fill:#f59e0b
```

---

## Auto-Match Flow

### Auto-Match Trigger & Notification

```mermaid
flowchart TD
    Start([Cron Job Triggers<br/>Daily at 9 AM]) --> GetEligible[Get Eligible Users<br/>auto_match_enabled: true]

    GetEligible --> FilterRateLimit[Filter Rate Limited<br/>max 3/week]

    FilterRateLimit --> LoopUsers{For Each<br/>Eligible User}

    LoopUsers -->|Done| End([Job Complete])
    LoopUsers -->|Next| GetLocation[Get User Location<br/>& Travel Plan]

    GetLocation --> HasLocation{Has Location<br/>Data?}

    HasLocation -->|No| LoopUsers
    HasLocation -->|Yes| FindCandidates[Find Candidate<br/>Matches]

    FindCandidates --> QueryNearby[Query Nearby Users<br/>PostGIS: 5km radius]

    QueryNearby --> FilterEligible[Filter Eligible<br/>auto_match_enabled]

    FilterEligible --> FilterSkill[Filter Skill Level<br/>±1 level]

    FilterSkill --> CalcCompat[Calculate Compatibility<br/>Score]

    CalcCompat --> ScoreFactors[Score 5 Factors:<br/>skill, location, availability,<br/>mutual friends, style]

    ScoreFactors --> RankMatches[Rank by Compatibility<br/>Top 3]

    RankMatches --> HasMatches{Found<br/>Matches?}

    HasMatches -->|No| LoopUsers
    HasMatches -->|Yes| CreateRec[Create Recommendation<br/>in DB]

    CreateRec --> GenerateMsg[Generate Intro<br/>Message]

    GenerateMsg --> CreateChat[Create Chat<br/>Conversation]

    CreateChat --> SendNotif[Send Notification<br/>Email + Push]

    SendNotif --> UpdateRateLimit[Update Rate Limit<br/>Counter]

    UpdateRateLimit --> LogMatch[Log Auto-Match<br/>Event]

    LogMatch --> LoopUsers

    style Start fill:#3b82f6
    style End fill:#10b981
    style QueryNearby fill:#ef4444
    style SendNotif fill:#f59e0b
```

### Auto-Match Compatibility Scoring

```mermaid
graph TB
    subgraph "Input Features"
        User1[User A Features]
        User2[User B Features]
    end

    subgraph "Scoring Factors (Weighted)"
        F1[Skill Level Match<br/>Weight: 0.30]
        F2[Location Proximity<br/>Weight: 0.25]
        F3[Availability Overlap<br/>Weight: 0.20]
        F4[Mutual Connections<br/>Weight: 0.15]
        F5[Playing Style<br/>Weight: 0.10]
    end

    subgraph "Score Calculation"
        Sum[Weighted Sum<br/>0.0 - 1.0]
    end

    subgraph "Threshold"
        Check{Score ≥<br/>0.70?}
    end

    subgraph "Decision"
        Match[✅ Create Match]
        NoMatch[❌ Skip]
    end

    User1 --> F1
    User2 --> F1
    User1 --> F2
    User2 --> F2
    User1 --> F3
    User2 --> F3
    User1 --> F4
    User2 --> F4
    User1 --> F5
    User2 --> F5

    F1 --> Sum
    F2 --> Sum
    F3 --> Sum
    F4 --> Sum
    F5 --> Sum

    Sum --> Check

    Check -->|Yes| Match
    Check -->|No| NoMatch

    style Match fill:#10b981
    style NoMatch fill:#ef4444
```

---

## Discovery Feed Flow

### Nearby Players & Clubs Discovery

```mermaid
flowchart TD
    Start([User Opens<br/>Discovery Map]) --> CheckLocation{Location<br/>Enabled?}

    CheckLocation -->|No| RequestPermission[Request Location<br/>Permission]
    RequestPermission --> Granted{Permission<br/>Granted?}
    Granted -->|No| ShowCityOnly[Show City-Level<br/>Results Only]
    Granted -->|Yes| GetGPS[Get GPS<br/>Coordinates]

    CheckLocation -->|Yes| GetGPS

    GetGPS --> CheckTravel{Travel Mode<br/>Active?}

    CheckTravel -->|Yes| UseDestination[Use Destination<br/>Location]
    CheckTravel -->|No| UseCurrentLoc[Use Current<br/>Location]

    UseDestination --> QueryPostGIS[Query PostGIS<br/>ST_DWithin]
    UseCurrentLoc --> QueryPostGIS

    QueryPostGIS --> FindPlayers[Find Nearby Players<br/>10km radius]
    QueryPostGIS --> FindClubs[Find Nearby Clubs<br/>20km radius]

    FindPlayers --> ApplyPrivacyP{Apply Privacy<br/>Filters}

    ApplyPrivacyP -->|Public| IncludeP[Include Player]
    ApplyPrivacyP -->|Connections Only| CheckMutualP{Mutual<br/>Friend?}
    ApplyPrivacyP -->|Private| ExcludeP[Exclude Player]

    CheckMutualP -->|Yes| IncludeP
    CheckMutualP -->|No| ExcludeP

    FindClubs --> FilterClubs[Filter by:<br/>- Active<br/>- Has courts<br/>- Rating ≥ 3.5]

    IncludeP --> CalcDistanceP[Calculate Distance<br/>ST_Distance]
    FilterClubs --> CalcDistanceC[Calculate Distance<br/>ST_Distance]

    CalcDistanceP --> SortPlayers[Sort by Distance<br/>Ascending]
    CalcDistanceC --> SortClubs[Sort by Distance<br/>Ascending]

    SortPlayers --> LimitPlayers[Limit to 20<br/>Players]
    SortClubs --> LimitClubs[Limit to 10<br/>Clubs]

    LimitPlayers --> CacheResults[(Cache in Redis<br/>30min TTL)]
    LimitClubs --> CacheResults

    CacheResults --> RenderMap[Render Map<br/>with Markers]

    ShowCityOnly --> RenderMap

    RenderMap --> End([Display<br/>Discovery Feed])

    style Start fill:#3b82f6
    style End fill:#10b981
    style QueryPostGIS fill:#ef4444
    style CacheResults fill:#f59e0b
```

### PostGIS Spatial Query

```mermaid
graph TB
    subgraph "Input"
        UserLoc[User Location<br/>POINT(-3.7038, 40.4168)]
        Radius[Search Radius<br/>10km]
    end

    subgraph "PostGIS Query"
        STBuffer[ST_Buffer<br/>Create 10km circle]
        STDWithin[ST_DWithin<br/>Find within distance]
        STDistance[ST_Distance<br/>Calculate exact distance]
    end

    subgraph "Spatial Index"
        GIST[GIST Index<br/>on location column]
    end

    subgraph "Results"
        Players[(Nearby Players<br/>with distances)]
        Clubs[(Nearby Clubs<br/>with distances)]
    end

    UserLoc --> STBuffer
    Radius --> STBuffer
    STBuffer --> STDWithin

    STDWithin --> GIST
    GIST --> STDistance

    STDistance --> Players
    STDistance --> Clubs

    style GIST fill:#f59e0b
    style Players fill:#10b981
    style Clubs fill:#10b981
```

---

## Travel Mode Activation Flow

### Travel Plan Creation & Activation

```mermaid
sequenceDiagram
    participant User
    participant UI as Travel Settings
    participant API as /api/travel-mode
    participant Cache as Redis Cache
    participant DB as Database
    participant RecJob as Background Job

    User->>UI: Enable Travel Mode
    UI->>UI: Show destination input

    User->>UI: Enter destination city
    User->>UI: Select travel dates
    User->>UI: Configure preferences

    UI->>API: POST /api/travel-mode/plan
    Note over API: Validate input

    API->>DB: INSERT INTO travel_plans
    Note over DB: Create travel plan record

    DB-->>API: Plan created (ID: xxx)

    API->>Cache: Invalidate discover:*
    Note over Cache: Clear discovery cache

    API->>RecJob: Queue recommendation job
    Note over RecJob: Generate recommendations<br/>for destination

    RecJob->>DB: Query destination players
    RecJob->>DB: Query destination clubs
    RecJob->>DB: Calculate recommendations

    RecJob->>DB: INSERT INTO recommendation
    Note over DB: Save generated recommendations

    RecJob->>Cache: Warm cache
    Note over Cache: rec:{user_id}:player<br/>rec:{user_id}:club

    RecJob-->>API: Job complete

    API-->>UI: Travel plan created

    UI->>UI: Enable Travel Mode UI
    UI->>UI: Show destination badge

    UI-->>User: Success notification<br/>"Travel Mode active for Barcelona"

    Note over User,RecJob: User can now browse recommendations<br/>and discovery feed for destination
```

### Travel Mode Deactivation

```mermaid
flowchart TD
    Start([User Deactivates<br/>Travel Mode]) --> CheckActive{Travel Plan<br/>Active?}

    CheckActive -->|No| ErrorInactive[Error: No active<br/>travel plan]
    CheckActive -->|Yes| UpdateStatus[Update Status<br/>to 'completed']

    UpdateStatus --> ArchiveRecs[Archive<br/>Recommendations]

    ArchiveRecs --> ClearCache[Clear Redis Cache<br/>rec:*, discover:*]

    ClearCache --> LogEvent[Log Deactivation<br/>Event]

    LogEvent --> NotifyUser[Send Deactivation<br/>Notification]

    NotifyUser --> End([Travel Mode<br/>Deactivated])

    ErrorInactive --> End

    style Start fill:#3b82f6
    style End fill:#10b981
    style ClearCache fill:#f59e0b
    style ArchiveRecs fill:#ef4444
```

---

## Cache Invalidation Flow

### Cache Invalidation Triggers

```mermaid
flowchart LR
    subgraph "System Events"
        E1[Profile Update]
        E2[New Connection]
        E3[Travel Plan Change]
        E4[Match Completed]
        E5[Privacy Settings]
    end

    subgraph "Database Triggers"
        T1[user_profile<br/>AFTER UPDATE]
        T2[social_connection<br/>AFTER INSERT]
        T3[travel_plans<br/>AFTER UPDATE]
        T4[match<br/>AFTER UPDATE]
        T5[user_privacy<br/>AFTER UPDATE]
    end

    subgraph "Cache Invalidation"
        I1[Invalidate<br/>rec:{user_id}:*]
        I2[Invalidate<br/>graph:{user_id}:*]
        I3[Invalidate<br/>discover:{city}:*]
    end

    subgraph "Background Jobs"
        J1[Queue Rec<br/>Refresh]
        J2[Queue Graph<br/>Rebuild]
    end

    E1 --> T1
    E2 --> T2
    E3 --> T3
    E4 --> T4
    E5 --> T5

    T1 --> I1
    T1 --> I2

    T2 --> I2
    T2 --> J1

    T3 --> I1
    T3 --> I3

    T4 --> J1

    T5 --> I1
    T5 --> I2
    T5 --> I3

    J1 --> I1
    J2 --> I2

    style I1 fill:#f59e0b
    style I2 fill:#f59e0b
    style I3 fill:#f59e0b
    style J1 fill:#10b981
    style J2 fill:#10b981
```

---

*Last updated: October 17, 2025*
*Sprint 4 Version: 1.0.0*
*Next review: November 2025 (Sprint 5)*
