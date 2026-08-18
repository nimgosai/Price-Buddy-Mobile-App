#====================================================================================================
# START - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================

# THIS SECTION CONTAINS CRITICAL TESTING INSTRUCTIONS FOR BOTH AGENTS
# BOTH MAIN_AGENT AND TESTING_AGENT MUST PRESERVE THIS ENTIRE BLOCK

# Communication Protocol:
# If the `testing_agent` is available, main agent should delegate all testing tasks to it.
#
# You have access to a file called `test_result.md`. This file contains the complete testing state
# and history, and is the primary means of communication between main and the testing agent.
#
# Main and testing agents must follow this exact format to maintain testing data. 
# The testing data must be entered in yaml format Below is the data structure:
# 
## user_problem_statement: {problem_statement}
## backend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.py"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## frontend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.js"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## metadata:
##   created_by: "main_agent"
##   version: "1.0"
##   test_sequence: 0
##   run_ui: false
##
## test_plan:
##   current_focus:
##     - "Task name 1"
##     - "Task name 2"
##   stuck_tasks:
##     - "Task name with persistent issues"
##   test_all: false
##   test_priority: "high_first"  # or "sequential" or "stuck_first"
##
## agent_communication:
##     -agent: "main"  # or "testing" or "user"
##     -message: "Communication message between agents"

# Protocol Guidelines for Main agent
#
# 1. Update Test Result File Before Testing:
#    - Main agent must always update the `test_result.md` file before calling the testing agent
#    - Add implementation details to the status_history
#    - Set `needs_retesting` to true for tasks that need testing
#    - Update the `test_plan` section to guide testing priorities
#    - Add a message to `agent_communication` explaining what you've done
#
# 2. Incorporate User Feedback:
#    - When a user provides feedback that something is or isn't working, add this information to the relevant task's status_history
#    - Update the working status based on user feedback
#    - If a user reports an issue with a task that was marked as working, increment the stuck_count
#    - Whenever user reports issue in the app, if we have testing agent and task_result.md file so find the appropriate task for that and append in status_history of that task to contain the user concern and problem as well 
#
# 3. Track Stuck Tasks:
#    - Monitor which tasks have high stuck_count values or where you are fixing same issue again and again, analyze that when you read task_result.md
#    - For persistent issues, use websearch tool to find solutions
#    - Pay special attention to tasks in the stuck_tasks list
#    - When you fix an issue with a stuck task, don't reset the stuck_count until the testing agent confirms it's working
#
# 4. Provide Context to Testing Agent:
#    - When calling the testing agent, provide clear instructions about:
#      - Which tasks need testing (reference the test_plan)
#      - Any authentication details or configuration needed
#      - Specific test scenarios to focus on
#      - Any known issues or edge cases to verify
#
# 5. Call the testing agent with specific instructions referring to test_result.md
#
# IMPORTANT: Main agent must ALWAYS update test_result.md BEFORE calling the testing agent, as it relies on this file to understand what to test next.

#====================================================================================================
# END - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================



#====================================================================================================
# Testing Data - Main Agent and testing sub agent both should log testing data below this section
#====================================================================================================
## user_problem_statement: >
  React Native (Expo) mobile FRONT-END for "Utility Contract Hub" (PriceBuddy), talking to the
  LIVE external backend https://utility-contract-hub.emergent.host (prefix /api). This iteration:
  (1) app-wide typography/UI consistency across all tabs, (2) Reports screen rebuilt to match the
  original web layout/wording, (3) Entry journey (landing/splash/signin/signup) rebuilt to match
  original copy. Match the original web app; adapt sensibly for mobile.

## frontend:
##   - task: "App-wide typography consistency (theme scale + 5 tabs + shared header/empty-state)"
##     implemented: true
##     working: "NA"
##     file: "src/theme/theme.ts, src/components/screen.tsx, app/(tabs)/*.tsx"
##     stuck_count: 0
##     priority: "high"
##     needs_retesting: true
##     status_history:
##         -working: "NA"
##         -agent: "main"
##         -comment: "Aligned type scale to original (kicker 11, sm 13, title 15, xl 18=hu-h3). Unified ScreenHeader (18px title + 13px subtitle + back button on all tabs), unified EmptyState (64px tile, 18px title). Normalized card/row titles to 15 and body to 13 across Sites/Reports/Support/Profile/Dashboard."
##   - task: "Reports screen rebuilt to match original (Your spend, navy total card, By utility/By site/Top contracts)"
##     implemented: true
##     working: "NA"
##     file: "app/(tabs)/reports.tsx"
##     stuck_count: 0
##     priority: "high"
##     needs_retesting: true
##     status_history:
##         -working: "NA"
##         -agent: "main"
##         -comment: "Title 'Your spend' + subtitle. Empty state 'No data yet'. Populated: navy total card 'ESTIMATED ANNUAL SPEND', By utility (emoji+color bars), By site (>1), Top contracts. Test account has no data -> empty state expected. GET /api/reports/spend."
##   - task: "Entry journey rebuilt: landing (marketing), splash (3 slides), signin, signup"
##     implemented: true
##     working: "NA"
##     file: "app/index.tsx, app/landing.tsx, app/splash.tsx, app/signin.tsx, app/signup.tsx"
##     stuck_count: 0
##     priority: "high"
##     needs_retesting: true
##     status_history:
##         -working: "NA"
##         -agent: "main"
##         -comment: "Flow: unauth -> /landing. Landing 'Never overpay on utilities again.' + features + trust strip; 'Create free account' -> /splash -> /signup; 'Sign in' -> /signin. Splash slides copy updated. Signin 'Welcome back'. Signup 'Create your account'/'Tell us about your business'."

## metadata:
##   created_by: "main_agent"
##   version: "2.0"
##   test_sequence: 11
##   run_ui: true

## test_plan:
##   current_focus:
##     - "App-wide typography consistency (theme scale + 5 tabs + shared header/empty-state)"
##     - "Reports screen rebuilt to match original"
##     - "Entry journey rebuilt: landing/splash/signin/signup"
##   stuck_tasks: []
##   test_all: false
##   test_priority: "high_first"

## agent_communication:
##     -agent: "main"
##     -comment: >
##       Frontend-only testing. Live backend. Login with e2e_test_1786703401@example.com / Password123!.
##       Verify: (1) all 5 tabs render with consistent header/title sizes and back button; Sites & Reports
##       empty states look identical in size; (2) Reports shows 'Your spend' + 'No data yet' empty state
##       for this account; (3) Entry flow: /landing renders hero + CTAs, 'Create free account' -> /splash
##       (3 slides, Next/Get started) -> /signup; 'I already have an account' -> /signin ('Welcome back');
##       signup step1 'Create your account' -> step2 'Tell us about your business'. Do NOT create real
##       accounts on the live backend (registration writes). Sign-in + navigation only.

## frontend:
##   - task: "Guided spotlight tour on dashboard (first-timer + replay), persists via PUT /me/preferences {has_completed_tour:true}"
##     implemented: true
##     working: "NA"
##     file: "src/components/spotlight-tour.tsx, app/(tabs)/dashboard.tsx, app/(tabs)/profile.tsx"
##     stuck_count: 0
##     priority: "high"
##     needs_retesting: true
##     status_history:
##         -working: "NA"
##         -agent: "main"
##         -comment: "Auto-opens on dashboard when user.has_completed_tour===false. 3 coach-mark steps highlighting Sites tab, Scan Bill tile, Lower-bills CTA with exact original copy. Skip/Back/Next/Got it + dots. On finish/skip -> PUT /me/preferences {has_completed_tour:true} + refreshUser. Profile 'Replay product tour' sets storage uch_tour_replay and dashboard re-opens on focus. Verified via screenshots. Backend flag reset to false for this test run."
##   - task: "Multi-business switcher chip on Sites & Reports (client-side active business, ?business_id= filter)"
##     implemented: true
##     working: "NA"
##     file: "src/business/business-context.tsx, src/components/business-switcher-chip.tsx, app/_layout.tsx, app/(tabs)/sites.tsx, app/(tabs)/reports.tsx"
##     stuck_count: 0
##     priority: "medium"
##     needs_retesting: true
##     status_history:
##         -working: "NA"
##         -agent: "main"
##         -comment: "BusinessProvider fetches GET /businesses. Chip only renders when businesses.length>1 (test account has 1 business so chip is intentionally HIDDEN). Sites uses GET /properties{?business_id}, Reports uses GET /reports/spend{?business_id}. Switching reloads. Verify no crash / Sites & Reports still load with chip hidden for single-business account."
##   - task: "Scan/Quote/Site-detail typography polish (global scale applied)"
##     implemented: true
##     working: "NA"
##     file: "app/scan/review/[id].tsx, app/(tabs)/... (theme scale), app/sites/[id].tsx"
##     stuck_count: 0
##     priority: "low"
##     needs_retesting: true
##     status_history:
##         -working: "NA"
##         -agent: "main"
##         -comment: "Fixed one outlier (intent body 11.5->13). Scan, Quote wizard and Site Detail inherit the consistent global type scale. Verify these screens still render and headers are consistent."

## metadata:
##   created_by: "main_agent"
##   version: "2.1"
##   test_sequence: 12
##   run_ui: true

## test_plan:
##   current_focus:
##     - "Guided spotlight tour on dashboard (first-timer + replay)"
##     - "Multi-business switcher chip on Sites & Reports"
##   stuck_tasks: []
##   test_all: false
##   test_priority: "high_first"

## agent_communication:
##     -agent: "main"
##     -comment: >
##       Frontend-only. Live backend. Login e2e_test_1786703401@example.com / Password123!.
##       (1) TOUR: after login the dashboard should auto-open the spotlight tour (has_completed_tour was
##       reset to false). Verify 3 steps: 'All your sites & contracts' (highlights Sites tab),
##       'Snap any bill' (highlights Scan Bill tile), 'Hands-free renewal' (highlights Lower your utility
##       bills CTA). Test Skip on step 1 closes it; re-login should NOT reopen (persisted). Then Profile ->
##       'Replay product tour' should reopen the tour on the dashboard. testIDs: spotlight-tour,
##       spotlight-card, tour-skip, tour-back, tour-next.
##       (2) BUSINESS CHIP: test account has ONE business so the chip is HIDDEN by design — just confirm
##       Sites and Reports still load without errors (no red screen).
##       (3) Confirm Scan (/scan) and Quote (/quote/new) screens still render with consistent headers.
##       NOTE: If has_completed_tour is already true when you start (a prior run completed it), use
##       Profile -> Replay product tour to trigger the tour. Do NOT create real businesses/accounts.
