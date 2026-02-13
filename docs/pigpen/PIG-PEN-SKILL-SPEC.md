# Pig Pen Skill Specification for OpenClaw
Version: 1.0.0
Authority: Pearl & Pig - Founder & Architect
Effective Date: 02/11/2026
Status: Canonical Specification

## Executive Summary
The Pig Pen OpenClaw Skill transforms Pearl & Pig's 35-operator AI workforce into an accessible, persistent, multi-agent system accessible via messaging platforms (WhatsApp, Telegram, Discord). This specification defines the architecture, operator mapping, routing logic, and implementation pathway for deploying the Pig Pen as an OpenClaw skill ecosystem.

## I. Architecture Overview
### System Components
```
USER INTERFACE LAYER
(WhatsApp, Telegram, Discord, etc)
  |
  v
PIG PEN GATEWAY SKILL
(pigpen-dispatch / Router)
- Natural language request parsing
- Operator selection logic
- Multi-operator orchestration
- Response synthesis
  |
  +--> EXECUTIVE OPERATORS (3)
  +--> CREATIVE ENGINE (12)
  +--> SYSTEMS/OPS OPERATORS (10)
  |
  v
OPERATOR PROFILE REGISTRY
- Thinking styles and instincts
- Invocation conditions
- Response templates
- Collaboration patterns
  |
  v
CLAUDE API LAYER
(claude-sonnet-4-20250514)
```

### Design Philosophy
1. Gateway Pattern
   - Single entry point (pigpen-dispatch) for all operator access
   - Intelligent routing based on request analysis
   - Unified response formatting

2. Operator Fidelity
   - Each operator maintains their canonical thinking style
   - Responses reflect operator personality, instincts, and blind spots
   - No generic AI voice - authentic operator simulation

3. Persistent Context
   - OpenClaw's native memory preserves operator interaction history
   - Operators "remember" past consultations
   - Multi-session project continuity

4. Mesh Orchestration
   - Support for single-operator consultations
   - Multi-operator workflows (sequential or parallel)
   - Cross-domain collaboration patterns

## II. Skill Architecture Options
### Option A: Unified Gateway Skill (Recommended)
Structure:
```
openclaw/skills/pigpen/
  index.js
  router.js
  operators/
    profiles.json
    loader.js
    templates.js
  orchestrator.js
  memory.js
  package.json
```
Pros:
- Single skill installation
- Centralized operator registry
- Easier updates and governance
- Consistent experience

Cons:
- Larger skill footprint
- All-or-nothing deployment

### Option B: Modular Operator Skills
Structure:
```
openclaw/skills/
  pigpen-core/
  pigpen-exec/
  pigpen-creative/
  pigpen-systems/
  pigpen-growth/
  pigpen-writers/
```
Pros:
- Selective operator deployment
- Smaller skill sizes
- Modular updates

Cons:
- More complex installation
- Dependency management
- Version synchronization

### Option C: Hybrid Architecture (Enterprise)
Structure:
```
openclaw/skills/
  pigpen-gateway/
  pigpen-domains/
    executive/
    creative/
    systems/
    growth/
    writers/
  pigpen-enterprise/
    governance/
    audit/
    security/
```
Pros:
- Enterprise-grade governance
- Audit trail capability
- Flexible deployment models

Cons:
- Most complex setup
- Requires MOSE infrastructure
- Highest maintenance

## III. Operator Profile Schema
Canonical Operator Profile Structure:
```
{
  "id": "trey_mills",
  "name": "Trey Mills",
  "role": "Business Strategist / Deal Architect",
  "domain": "executive",
  "tags": ["REDUCE", "MONETIZE", "PROTECT"],
  "core_attributes": {
    "thinking_style": "Analytical reducer",
    "core_instinct": "Protect the house",
    "strengths": ["Monetization clarity", "Risk framing", "Deal math"],
    "blind_spots": ["Can underweight emotional resonance if unchecked"]
  },
  "invocation_conditions": {
    "triggers": [
      "money",
      "scale",
      "partnerships",
      "deals",
      "revenue",
      "pricing",
      "business model",
      "risk assessment",
      "financial viability"
    ],
    "context_requirements": [
      "Business context",
      "Financial parameters",
      "Stakeholder landscape"
    ]
  },
  "response_framework": {
    "voice_characteristics": [
      "Direct and analytical",
      "Numbers-first reasoning",
      "Risk-aware framing",
      "Bottom-line focused"
    ],
    "output_structure": [
      "Financial implications first",
      "Risk factors explicit",
      "Alternative scenarios",
      "Recommendation with confidence level"
    ]
  },
  "collaboration_patterns": {
    "common_pairs": [
      { "operator": "jon_hartman", "reason": "Vision -> Viability translation" },
      { "operator": "marty_hillsdale", "reason": "Strategy -> Execution handoff" },
      { "operator": "will_stats", "reason": "High-level -> Detailed financials" }
    ],
    "conflict_resolution": "Defers to Jon on mission vs. margin tensions"
  },
  "system_prompt_template": "You are Trey Mills, Business Strategist at Pearl & Pig. Your core instinct is to protect the house..."
}
```

Profile Registry Organization:
```
{
  "version": "4.1.0",
  "last_updated": "2026-02-11",
  "operator_count": 35,
  "domains": {
    "executive": ["jon_hartman", "trey_mills", "marty_hillsdale"],
    "creative": ["naomi_top", "vienna_cray", "fred_mann", "rolo_harrison", "turner_smith", "ellie_summers", "mo_landing", "dia_garcia", "jack_jones"],
    "systems": ["miles_okada", "kay_jing", "levi_foster", "will_stats", "fory_cornier", "eli_tran"],
    "growth": ["harper_lane", "sofia_reyes", "grant_fields", "riley_cross", "maya_chen"],
    "legacy": ["carmen_wade", "pat_hayzer", "luce_smith", "leah_monroe"],
    "writers": ["the_architect", "the_voice", "the_visualizer", "the_polisher", "the_oracle"],
    "governance": ["louis_rowe_nichols"]
  },
  "operators": {
    "jon_hartman": { "...": "full profile" },
    "trey_mills": { "...": "full profile" }
  }
}
```

## IV. Routing Logic Specification
Router Decision Framework (pseudo-code):
```
class PigPenRouter {
  async selectOperators(userRequest, conversationContext) {
    const domains = this.classifyDomains(userRequest);
    const triggered = this.matchTriggers(userRequest, domains);
    const viable = this.checkContextRequirements(triggered, conversationContext);
    const orchestration = this.detectOrchestrationNeeds(userRequest);

    if (orchestration.type === "sequential") {
      return this.buildSequentialPlan(viable);
    } else if (orchestration.type === "parallel") {
      return this.buildParallelPlan(viable);
    }
    return this.selectSingleOperator(viable);
  }

  classifyDomains(request) {
    const domainSignals = {
      business: ["revenue", "deal", "partnership", "pricing", "margin"],
      creative: ["design", "brand", "story", "visual", "narrative"],
      systems: ["workflow", "process", "technical", "infrastructure"],
      growth: ["marketing", "sales", "client", "retention"],
      legal: ["contract", "rights", "compliance", "liability"],
      writers: ["script", "dialogue", "scene", "character", "theme"]
    };

    return Object.entries(domainSignals)
      .filter(([, keywords]) => keywords.some(kw => request.toLowerCase().includes(kw)))
      .map(([domain]) => domain);
  }

  detectOrchestrationNeeds(request) {
    const sequentialPatterns = [/first.*then/i, /analyze.*then.*design/i, /evaluate.*followed by/i];
    const parallelPatterns = [/both.*and/i, /multiple perspectives/i, /from.*and.*viewpoints/i];

    if (sequentialPatterns.some(p => p.test(request))) {
      return { type: "sequential", reason: "Explicit sequence detected" };
    }

    if (parallelPatterns.some(p => p.test(request))) {
      return { type: "parallel", reason: "Multiple perspectives requested" };
    }

    if (this.crossesDomainBoundaries(request)) {
      return { type: "sequential", reason: "Cross-domain task requiring handoffs" };
    }

    return { type: "single", reason: "Single-domain consultation" };
  }
}
```

Routing Examples:
- Single Operator: "What's the revenue model for TourText?" -> trey_mills
- Sequential Multi-Operator: "Evaluate MOSE business model, then design the brand identity" -> trey_mills -> naomi_top
- Parallel Multi-Operator: "I need both financial and creative perspectives on this partnership" -> trey_mills + naomi_top
- Cross-Domain Auto-Orchestration: "Help me build a presentation for Series A investors" -> trey_mills -> naomi_top -> marty_hillsdale

## V. Response Synthesis Patterns
### Single Operator Response
```
**Operator:** Trey Mills - Business Strategist
[Response in operator's voice and thinking style]
**Key Considerations:**
- [Strength-aligned insight 1]
- [Strength-aligned insight 2]
**Risk Factors:**
- [Blind spot acknowledgment if relevant]
**Recommendation:** [Direct, bottom-line focused]
```

### Sequential Multi-Operator Response
```
**Consultation Chain:** Trey Mills -> Naomi Top -> Marty Hillsdale
---
**Phase 1: Business Analysis** (Trey Mills)
[Trey's analysis]
**Phase 2: Creative Direction** (Naomi Top)
[Building on Trey's framework, Naomi's creative vision]
**Phase 3: Execution Plan** (Marty Hillsdale)
[Translating vision into actionable workflow]
---
**Synthesis:** [Gateway combines perspectives into coherent recommendation]
```

### Parallel Multi-Operator Response
```
**Perspectives Requested:** Business + Creative
---
**Business Perspective** (Trey Mills)
[Trey's independent analysis]
**Creative Perspective** (Naomi Top)
[Naomi's independent vision]
---
**Integration:**
- **Alignment:** [Where perspectives converge]
- **Tensions:** [Where they diverge - creative ambition vs. financial constraint]
- **Recommended Path:** [Synthesis that honors both]
```

## VI. Memory and Context Management
OpenClaw's native memory system enables:
1. Project Continuity
2. Operator Learning
3. Collaboration History

Context Injection (system prompt):
```
You are ${operator.name}, ${operator.role} at Pearl & Pig.
CURRENT PROJECT CONTEXT:
${projectMemory}
PREVIOUS CONSULTATIONS:
${relevantHistory}
YOUR PAST RECOMMENDATIONS:
${operatorMemory}
USER PREFERENCES:
${userPreferences}
Now respond to: ${userRequest}
```

## VII. Governance and Safety
- Operator scope enforcement
- Blind spot flagging
- Conflict detection -> escalate to louis_rowe_nichols
- Audit trail for every operator invocation

## VIII. Integration with Flightpath COS
Gateway as Flightpath Interface:
OpenClaw (Interface Layer) -> Pig Pen Gateway (Routing/Orchestration) -> Flightpath COS API -> Operator Mesh

## IX. MOSE Integration
MOSE provides enterprise governance over Pig Pen operations:
- Authorship tracking (Telauthorium)
- Rights management (Pen and Sword)
- Compliance monitoring (GARVIS)

## X. Security Considerations
- Prompt injection defense in system prompts
- Access control by user permission
- Data isolation by project
- Audit and monitoring

## XI. Performance and Scalability
Targets:
- Single operator: <3s average
- Sequential (2 operators): <6s average
- Parallel (2 operators): <4s average
- Uptime: 99%+

## XII. Testing and Validation
- Operator fidelity tests
- Routing accuracy tests
- Integration tests

## XIII. Deployment Checklist
Prerequisites:
- OpenClaw installed and configured
- Claude API key with Sonnet 4 access
- Messaging platform connected

Installation Steps:
1. Clone Pig Pen skill repository
2. Install dependencies
3. Configure operator registry
4. Load operator profiles
5. Test installation
6. Register skill with OpenClaw
7. Verify in messaging platform

## XIV. Maintenance and Evolution
- Versioned operator profiles
- Skill versioning (v1.0.0, v1.1.0, v2.0.0)
- Community contributions guidelines

## XV. Success Metrics
Key performance indicators:
- User satisfaction
- System performance
- Operator utilization
- Business impact

## Conclusion
The Pig Pen OpenClaw Skill transforms Pearl & Pig's 35-operator AI workforce into an accessible, persistent, multi-agent system accessible via everyday messaging platforms. This specification provides the complete architecture for deploying this capability, from operator profile schemas to routing logic to enterprise governance integration.

Next Steps:
1. Implement gateway skill
2. Load operator profiles into registry
3. Deploy on OpenClaw instance
4. Connect to messaging platform
5. Test with sample consultations
6. Iterate based on user feedback

Document Control
Version: 1.0.0
Last Updated: 2026-02-11
Next Review: 2026-03-11
Owner: Jon Hartman, Pearl & Pig
Status: Canonical
Change Log: 2026-02-11 Initial specification
