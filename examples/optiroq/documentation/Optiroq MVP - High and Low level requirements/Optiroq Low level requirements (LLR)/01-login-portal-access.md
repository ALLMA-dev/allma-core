# Screen Requirements: Login/Portal Access

## 1. Overview
- **Screen ID:** SCR-001
- **Component File:** `src/app/components/OptiroqPortal.tsx` (Portal), `src/app/components/AppHeader.tsx` (Header with profile)
- **User Persona:** Sarah Chen (Project Buyer)
- **Epic:** Epic 1 - RFQ Initiation (Agent-Based - 3 Methods)
- **Priority:** P0 (Must Have)
- **Flexibility Level:** None - Authentication is system-level functionality

## 2. User Story

**As a** Sarah (Project Buyer)  
**I want to** access Optiroq portal without complex installation  
**So that** I can start using the system immediately

### Related User Stories
- **US-MVP-01:** Access Optiroq Portal
- **Related to:** All subsequent user stories (portal access is prerequisite)

## 3. Screen Purpose & Context

### Purpose
This screen provides authentication and initial access to the Optiroq platform. It serves as the entry point for buyers to access all RFQ management functionality.

### Context
- **When user sees this:** First interaction with Optiroq system, or when returning to the platform
- **Why it exists:** Secure access control, user identification, session management
- **Position in journey:** Entry point - precedes all other functionality

### Key Characteristics
- **No software installation required:** Web-based portal accessible via browser
- **SSO preferred:** Integration with company email authentication
- **Mobile-responsive:** Accessible from desktop, tablet, and phone
- **Fast access:** Login completes in <30 seconds

## 4. Visual Layout & Structure

### 4.1 Main Sections

**Login Screen (Initial Access):**
1. **Branding Area**
   - Optiroq logo
   - Tagline: "AI-Powered RFQ Management"

2. **Authentication Form**
   - Email input field
   - Password input field (if not using SSO)
   - "Sign in with Company SSO" button (preferred)
   - "Remember me" checkbox
   - "Forgot password?" link

3. **Welcome Message**
   - Brief description of platform benefits
   - "New user? Contact your System Admin for access"

**Portal Dashboard (Post-Login):**
1. **App Header** (persistent across all screens)
   - Optiroq logo (left)
   - Buyer profile information (right)
     - Buyer name
     - Company name
     - Profile picture/avatar
     - "Edit Profile" action

2. **Main Content Area**
   - Dynamic content based on user's workflow
   - Default: Project Initiation screen for starting new projects
   - Or: Last viewed screen for returning users

### 4.2 Key UI Elements

**Login Screen:**
- **Email Input:** Text field, email validation
- **Password Input:** Password field with show/hide toggle
- **SSO Button:** Primary action button, company branding
- **Remember Me:** Checkbox for persistent session
- **Forgot Password:** Link to password recovery flow
- **Sign In Button:** Primary action button (if not using SSO)

**App Header (Post-Login):**
- **Logo:** Clickable, returns to home/project initiation
- **Profile Section:**
  - Avatar/initials circle
  - Buyer name (e.g., "Sarah Chen")
  - Company name (e.g., "Automotive Components Division")
  - Dropdown menu icon
  - Edit Profile button
  - Sign Out button

### 4.3 Information Hierarchy

**Primary Information:**
- Authentication status (logged in/out)
- Current user identity (name, company, function)
- Current context in application workflow

**Secondary Information:**
- Profile details
- Session information

**Tertiary Information:**
- Help/support links
- Version information
- Legal/privacy links

## 5. Data Requirements

### 5.1 System Fields (Immutable)
| Field Name | Data Type | Source | Required | Format/Validation |
|------------|-----------|--------|----------|-------------------|
| user_id | UUID | Auth System | Yes | UUID format |
| session_id | UUID | Auth System | Yes | UUID format |
| login_timestamp | DateTime | System | Yes | ISO 8601 |
| last_activity | DateTime | System | Yes | ISO 8601 |
| session_expiry | DateTime | System | Yes | ISO 8601 |

### 5.2 Data Displayed (User Profile)
| Field Name | Data Type | Source | Required | Format/Validation |
|------------|-----------|--------|----------|-------------------|
| buyer_name | String | User Profile | Yes | 2-100 characters |
| buyer_email | Email | User Profile | Yes | Valid email format |
| company_name | String | User Profile | Yes | 2-200 characters |
| company_domain | String | User Profile | Yes | Valid domain format |
| profile_picture | URL | User Profile | No | Valid image URL |
| role | Enum | User Profile | Yes | "buyer", "admin", "viewer" |
| function | Enum | User Profile | Yes | "commodity_buyer", "project_buyer", "sourcing_buyer", "advanced_sourcing_buyer" |
| department | String | User Profile | No | 2-100 characters |
| phone_number | String | User Profile | No | Valid phone format |

### 5.3 Data Collected from User (Login)
| Field Name | Input Type | Required | Validation Rules | Default Value |
|------------|------------|----------|------------------|---------------|
| email | Email input | Yes | Valid email format, company domain | None |
| password | Password input | Yes (if not SSO) | Min 8 chars, complexity rules | None |
| remember_me | Checkbox | No | Boolean | False |

### 5.4 Calculated/Derived Data
| Field Name | Calculation Logic | Dependencies |
|------------|-------------------|--------------|
| session_duration | Current time - login_timestamp | login_timestamp, current_time |
| initials | First letter of first name + first letter of last name | buyer_name |
| avatar_color | Hash of user_id to color palette | user_id |

## 6. User Interactions

### 6.1 Primary Actions

**Action: Sign In with SSO**
- **Trigger:** User clicks "Sign in with Company SSO" button
- **Behavior:** 
  1. Redirect to company SSO provider (e.g., Microsoft Azure AD, Okta)
  2. User authenticates with company credentials
  3. SSO provider returns authentication token
  4. System validates token and creates session
  5. User redirected to portal dashboard
- **Validation:** 
  - Valid SSO token
  - User exists in Optiroq system
  - User has active account status
- **Success:** User logged in, redirected to Project Initiation or last viewed screen
- **Error:** Display error message, return to login screen
  - "Authentication failed. Please try again."
  - "Your account is not active. Contact your System Admin."
- **Navigation:** Login Screen → Project Initiation (default landing page)

**Action: Sign In with Email/Password**
- **Trigger:** User enters email/password and clicks "Sign In"
- **Behavior:**
  1. Validate email format
  2. Send credentials to authentication service
  3. Verify credentials
  4. Create session if valid
  5. Load user profile
  6. Redirect to portal dashboard
- **Validation:**
  - Email format valid
  - Password not empty
  - Credentials match database
  - Account is active
- **Success:** User logged in, redirected to Project Initiation
- **Error:** Display error message
  - "Invalid email or password"
  - "Account locked. Contact System Admin."
  - "Too many failed attempts. Try again in 15 minutes."
- **Navigation:** Login Screen → Project Initiation (default landing page)

**Action: Edit Profile**
- **Trigger:** User clicks "Edit Profile" in header dropdown
- **Behavior:**
  1. Open profile modal/screen
  2. Display current profile information
  3. Allow editing of editable fields
  4. Save changes to database
  5. Update session data
  6. Refresh header display
- **Validation:**
  - Required fields not empty
  - Email format valid
  - Phone format valid (if provided)
- **Success:** Profile updated, confirmation message displayed
- **Error:** Display validation errors inline
- **Navigation:** Stays on current screen, modal overlay

**Action: Sign Out**
- **Trigger:** User clicks "Sign Out" in header dropdown
- **Behavior:**
  1. Confirm sign out action (optional)
  2. Invalidate session token
  3. Clear local session data
  4. Redirect to login screen
- **Validation:** None
- **Success:** User signed out, returned to login screen
- **Error:** N/A (always succeeds)
- **Navigation:** Any Screen → Login Screen

### 6.2 Secondary Actions

**Action: Remember Me**
- **Trigger:** User checks "Remember me" checkbox before signing in
- **Behavior:** Extend session duration to 30 days instead of 8 hours
- **Validation:** None
- **Success:** Extended session created
- **Error:** N/A

**Action: Forgot Password**
- **Trigger:** User clicks "Forgot password?" link
- **Behavior:**
  1. Navigate to password reset screen
  2. User enters email
  3. System sends password reset link to email
  4. User clicks link in email
  5. User sets new password
- **Validation:** Email exists in system
- **Success:** Password reset email sent
- **Error:** "Email not found in system"
- **Navigation:** Login Screen → Password Reset Screen

**Action: View Profile Details**
- **Trigger:** User clicks on profile section in header
- **Behavior:** Display dropdown with profile details and actions
- **Validation:** None
- **Success:** Dropdown displayed
- **Error:** N/A

### 6.3 Navigation

**From:** 
- External (direct URL access)
- Any screen (if session expired)

**To:**
- Project Initiation (default post-login destination)
- Last viewed screen (if returning user with active session)
- Password Reset Screen (via "Forgot password?")

**Exit Points:**
- Sign Out → Login Screen
- Session Timeout → Login Screen
- Close browser (session persists if "Remember me" checked)

## 7. Business Rules

### 7.1 Validation Rules

**Email Validation:**
- Must be valid email format (contains @, valid domain)
- Must match company domain (if domain restriction enabled)
- Error: "Please enter a valid company email address"

**Password Validation (if not using SSO):**
- Minimum 8 characters
- Must contain: uppercase, lowercase, number, special character
- Cannot be same as last 3 passwords
- Error: "Password must be at least 8 characters and include uppercase, lowercase, number, and special character"

**Account Status:**
- Account must be active (not suspended/disabled)
- User must have buyer role or admin role
- Error: "Your account is not active. Contact your System Admin."

**Session Management:**
- Default session duration: 8 hours
- Extended session (Remember me): 30 days
- Automatic logout after session expiry
- Warning 5 minutes before expiry

### 7.2 Calculation Logic

**Session Expiry:**
```
session_expiry = login_timestamp + session_duration
where session_duration = remember_me ? 30 days : 8 hours
```

**User Initials:**
```
initials = first_letter(first_name) + first_letter(last_name)
Example: "Sarah Chen" → "SC"
```

**Avatar Color:**
```
avatar_color = color_palette[hash(user_id) % palette_size]
Ensures consistent color per user
```

### 7.3 Conditional Display Logic

**SSO Button Display:**
- Show if company has SSO configured
- Hide if company uses email/password only
- Condition: `company.sso_enabled === true`

**Remember Me Checkbox:**
- Show only for email/password login
- Hide for SSO (SSO provider handles session)
- Condition: `auth_method === 'email_password'`

**Profile Picture:**
- Display if user has uploaded picture
- Display initials circle if no picture
- Condition: `user.profile_picture ? show_image : show_initials`

**Edit Profile Button:**
- Show for all authenticated users
- Condition: `user.is_authenticated === true`

### 7.4 Error Handling

**Authentication Failure:**
- **Detection:** Invalid credentials returned from auth service
- **Handling:** 
  - Display error message below form
  - Increment failed attempt counter
  - Lock account after 5 failed attempts (15-minute lockout)
  - Log security event

**Session Expiry:**
- **Detection:** Current time > session_expiry
- **Handling:**
  - Display modal: "Your session has expired. Please sign in again."
  - Clear local session data
  - Redirect to login screen
  - Preserve current URL for post-login redirect

**Network Error:**
- **Detection:** Auth service unreachable
- **Handling:**
  - Display error: "Unable to connect. Please check your internet connection."
  - Retry button
  - Log error for monitoring

**SSO Provider Error:**
- **Detection:** SSO redirect fails or returns error
- **Handling:**
  - Display error: "SSO authentication failed. Please try again or contact IT support."
  - Fallback to email/password if available
  - Log error with SSO provider details

## 8. Acceptance Criteria

### 8.1 Functional Criteria

1. WHEN user navigates to Optiroq URL THEN login screen SHALL display within 2 seconds
2. WHEN user enters valid company email and password THEN system SHALL authenticate and redirect to Project Initiation within 5 seconds
3. WHEN user clicks "Sign in with Company SSO" THEN system SHALL redirect to SSO provider
4. WHEN SSO authentication succeeds THEN system SHALL create session and redirect to Project Initiation
5. WHEN user checks "Remember me" THEN session SHALL persist for 30 days
6. WHEN user does not check "Remember me" THEN session SHALL expire after 8 hours
7. WHEN user enters invalid credentials THEN system SHALL display error message "Invalid email or password"
8. WHEN user fails login 5 times THEN account SHALL be locked for 15 minutes
9. WHEN user clicks "Forgot password?" THEN system SHALL navigate to password reset screen
10. WHEN user clicks "Edit Profile" THEN profile modal SHALL open with current information
11. WHEN user updates profile THEN changes SHALL be saved and header SHALL refresh
12. WHEN user clicks "Sign Out" THEN session SHALL be invalidated and user redirected to login screen
13. WHEN session expires THEN user SHALL be redirected to login screen with expiry message
14. WHEN user is authenticated THEN App Header SHALL display buyer name, company, and profile picture/initials

### 8.2 UX Criteria

1. Login screen loads within 2 seconds on standard broadband connection
2. All form fields have clear labels and placeholder text
3. Password field has show/hide toggle for visibility
4. Error messages are displayed inline below relevant fields
5. Error messages are clear, actionable, and non-technical
6. Success feedback is provided for all actions (e.g., "Profile updated successfully")
7. Loading indicators are shown during authentication process
8. App Header is persistent across all screens after login
9. Profile dropdown is accessible via keyboard navigation
10. All interactive elements have hover states and focus indicators
11. Mobile-responsive design works on screens 320px and wider
12. Touch targets are minimum 44x44px for mobile usability

### 8.3 Edge Cases

1. WHEN user has no profile picture THEN system SHALL display initials circle with consistent color
2. WHEN user name is single word THEN system SHALL use first two letters for initials
3. WHEN user email domain does not match company domain THEN system SHALL reject login (if domain restriction enabled)
4. WHEN SSO provider is unavailable THEN system SHALL display error and suggest trying again later
5. WHEN user session expires during active use THEN system SHALL save current state and restore after re-login
6. WHEN user opens multiple tabs THEN session SHALL be shared across tabs
7. WHEN user signs out in one tab THEN all tabs SHALL be signed out
8. WHEN user's account is disabled by admin THEN next login attempt SHALL fail with appropriate message
9. WHEN user changes password in another session THEN current session SHALL remain valid until expiry
10. WHEN browser cookies are disabled THEN system SHALL display error: "Cookies must be enabled to use Optiroq"

## 9. Dependencies

### 9.1 Prerequisites
- User account created by System Admin
- User assigned to company/organization
- User granted buyer or admin role
- Company SSO configured (if using SSO)
- Email domain verified (if using domain restriction)

### 9.2 Backend/API Requirements

**Authentication Endpoints:**
- `POST /api/auth/login` - Email/password authentication
- `POST /api/auth/sso/initiate` - Initiate SSO flow
- `POST /api/auth/sso/callback` - Handle SSO callback
- `POST /api/auth/logout` - Invalidate session
- `POST /api/auth/refresh` - Refresh session token
- `GET /api/auth/session` - Validate current session

**User Profile Endpoints:**
- `GET /api/users/profile` - Get current user profile
- `PUT /api/users/profile` - Update user profile
- `GET /api/users/profile/picture` - Get profile picture
- `POST /api/users/profile/picture` - Upload profile picture

**Password Management Endpoints:**
- `POST /api/auth/password/reset-request` - Request password reset
- `POST /api/auth/password/reset` - Reset password with token
- `POST /api/auth/password/change` - Change password (authenticated)

**Data Structures:**

```typescript
interface User {
  user_id: string;
  email: string;
  buyer_name: string;
  company_name: string;
  company_domain: string;
  role: 'buyer' | 'admin' | 'viewer';
  function: 'commodity_buyer' | 'project_buyer' | 'sourcing_buyer' | 'advanced_sourcing_buyer';
  department?: string;
  phone_number?: string;
  profile_picture?: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

interface Session {
  session_id: string;
  user_id: string;
  login_timestamp: Date;
  last_activity: Date;
  session_expiry: Date;
  remember_me: boolean;
  ip_address: string;
  user_agent: string;
}

interface AuthResponse {
  success: boolean;
  session_token: string;
  user: User;
  session_expiry: Date;
  error?: string;
}
```

### 9.3 Integration Points

**SSO Providers:**
- Microsoft Azure AD / Entra ID
- Okta
- Google Workspace
- SAML 2.0 compatible providers

**Session Management:**
- JWT tokens for session management
- Redis for session storage (fast access)
- Secure HTTP-only cookies

**Security:**
- HTTPS required for all authentication
- CSRF protection on all forms
- Rate limiting on login attempts
- Security headers (HSTS, CSP, X-Frame-Options)

**Monitoring:**
- Log all authentication attempts (success/failure)
- Track session duration and activity
- Alert on suspicious activity (multiple failed logins, unusual locations)

## 10. Success Metrics

### 10.1 Performance Metrics
- **Login Success Rate:** >99% of valid login attempts succeed
- **Login Time:** <5 seconds from credential submission to Projects List display
- **Session Stability:** <0.1% unexpected session terminations
- **SSO Success Rate:** >98% of SSO attempts succeed

### 10.2 User Experience Metrics
- **Time to First Login:** <2 minutes for new users (including profile setup)
- **Login Frequency:** Average 2-3 logins per user per day
- **Session Duration:** Average 4-6 hours per session
- **Profile Completion:** >90% of users complete profile information

### 10.3 Security Metrics
- **Failed Login Rate:** <2% of total login attempts
- **Account Lockouts:** <0.5% of users per month
- **Password Reset Requests:** <5% of users per month
- **Session Hijacking Attempts:** 0 successful attempts

## 11. Open Questions

1. **SSO Configuration:** Which SSO providers should be supported in MVP? (Azure AD confirmed, others?)
2. **Domain Restriction:** Should email domain restriction be enforced for all companies or configurable?
3. **Multi-Factor Authentication:** Is MFA required for MVP or post-MVP?
4. **Session Sharing:** Should sessions be shared across devices or device-specific?
5. **Profile Picture Storage:** Where should profile pictures be stored? (S3, CDN?)
6. **Audit Logging:** What level of detail is required for authentication audit logs?
7. **Password Policy:** Should password complexity rules be configurable per company?
8. **Account Recovery:** What is the process for account recovery if user loses access to email?
9. **Role-Based Access:** Are there different permission levels within "buyer" role?
10. **First-Time User Experience:** Should there be an onboarding tutorial after first login?

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Jan 2, 2026 | Kiro | Initial screen requirements document |

