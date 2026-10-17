# USER OPERATIONAL DIRECTIVES & STANDING INSTRUCTIONS
> **Permanent Operational Reference Document**
> This document records all explicit operational briefs, directives, rules, and guidelines issued by the user to ensure continuity across AI agents and sessions without requiring the user to repeat instructions.

---

## 0. Strict Codebase Edit Prohibition (User Direct Coding)
- **Standing Directive**: The user is directly developing and implementing code in the codebase for Studio, Hubahu mode, and related features.
- **Rule**: AI must **NEVER** proactively touch, edit, or modify any codebase files.
- **Role**: AI is strictly limited to support mode: providing answers, file lookups, and running test validations ONLY upon explicit user instruction.

---

## 1. 100% Autonomous Continuous Execution (No Pausing / No Resting)
- **Directive**: Work must NEVER be stopped, halted, or stalled waiting for user confirmation while the user is away or resting.
- **Troubleshooting Obligation**: If any program, assistant, or tool does not return an update or fails to respond, investigate the exact cause immediately, resolve it, and proceed with the next step autonomously.
- **Continuous Backlog Execution**: Systematically work through all pending items in `docs/FAITHFUL_ISSUES.md`, `docs/PROJECT_MAP.md`, and project plans without waiting for further prompts.

---

## 2. Browser Tab Monitoring & Anti-Hang Protocol
- **Observation**: Gemini tabs running in the browser can hang, throttle, or become unresponsive if left unattended.
- **Human-Paced Rule**: Never burst-refresh all tabs simultaneously.
- **Single Tab Limit**: Reload at most ONE tab per monitoring cycle, only if that tab is visibly frozen on "Working...".
- **Human Delays**: Maintain 7-10 seconds natural pause between tab inspections.
- **CAPTCHA & Abuse Guard**: If any tab URL shows `google_abuse` or `captcha`, SKIP that tab immediately. Never hammer or reload it.
- **Single Dispatch Protocol (Zero Duplicate Messages)**: Send every message strictly **ONCE**. Never run retry loops that cause duplicate prompts in chat. If a message fails, do not spam; refresh tab first if needed and send once.

---

## 3. Senior Lead (Assistant 4 / Tab 3) Operational Protocol
- **Chat Box Length & Token Conservation**: Senior Lead's chat history is very long. Prompts dispatched to Senior Lead must explicitly instruct him to **reply concisely and briefly** to minimize token consumption.
- **Task Delegation Scope**:
  - **Forbidden**: Do NOT give heavy, large-scale, or bulk coding tasks to Senior Lead.
  - **Permitted**: Use Senior Lead strictly for high-level architectural direction, code reviews, design decisions, and advisory support.
  - **Execution**: Delegate modular, concrete coding implementations to specialist assistants (A-1 Layout, A-2 Classifier, A-3 Legacy .doc) or execute surgical diffs directly in Antigravity.

---

## 4. Assistant Quota Limit & Cooldown Tracking
- **Quota Exhaustion**: Other assistants (A-1, A-2, A-3, A-4) may reach their Gemini prompt/token limits.
- **Protocol**:
  1. If an assistant indicates a limit or cooldown message, inspect the tab to identify the exact cooldown reset time.
  2. Record the cooldown expiration time in `docs/MULTI_AGENT_MANAGEMENT.md` and session memory.
  3. Pause assigning work to that specific assistant during their cooldown period.
  4. Once their cooldown window elapses, immediately resume and dispatch their remaining tasks.
  5. In the meantime, continue advancing pending backlog items directly without idle delays.

---

## 5. Frozen Core Engines (Strict Inviolable Constraint)
- Under NO circumstances may the following core engine files be edited or modified without explicit written permission:
  1. `js/docx-to-doc-engine.js`
  2. `js/bangla-converter-engine.js`
  3. `js/equation-converter.js`
  4. `js/doc-binary-engine.js`
- **Enforcement**: All layout, margin, column, and formatting logic MUST be implemented strictly within `js/layout-engine/`.

---

## 6. Development Speed & Code Quality Guidelines
- **Diff Only**: Use targeted, minimal slice edits. Never rewrite full files.
- **Zero Fluff**: Responses must be direct, actionable, and concise with clickable links.
- **No Background Dev Servers**: Never run `npm run dev` or long-running background servers in the terminal.
- **Test Gate Integrity**: Maintain 100% green status on all test suites (`node tests/run-all.mjs`, 1872+ tests).
- **Self-Maintenance**:
  - Keep `docs/PROJECT_MAP.md` updated whenever files are added or modified.
  - Maintain `docs/HANDOFF.md` to a strict maximum of 15 lines before finishing any turn.
  - Append historical progress to `docs/AI_MEMORY.md`.
