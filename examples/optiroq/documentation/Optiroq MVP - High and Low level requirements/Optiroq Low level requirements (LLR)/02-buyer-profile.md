# Screen Requirements: Buyer Profile

## 1. Overview
- **Screen ID:** SCR-002
- **Component File:** `src/app/components/BuyerProfile.tsx`
- **User Persona:** Sarah Chen (Project Buyer) - All buyer types
- **Epic:** Epic 1 - RFQ Initiation (Agent-Based - 3 Methods)
- **Priority:** P0 (Must Have)
- **Flexibility Level:** None - Profile management is system-level functionality

## 2. User Story

**As a** Sarah (Project Buyer)  
**I want to** create and manage my buyer profile  
**So that** the system can personalize my experience and track my activities

### Related User Stories
- **US-MVP-01:** Access Optiroq Portal (profile required for portal access)
- **Implicit requirement:** User profile management for all authenticated users

## 3. Screen Purpose & Context

### Purpose
This screen allows buyers to create and edit their profile information, which is used throughout the system for personalization, audit trails, and communication tracking.

### Context
- **When user sees this:** 
  - First-time users: Immediately after successful authentication (mandatory profile creation)
  - Returning users: When clicking "Edit Profile" from App Header
- **Why it exists:** 
  - Capture essential buyer information
  - Enable personalized user experience
  - Support audit trails and communication tracking
  - Prepare for future SRM integration
- **Position in journey:** 
  - First-time users: Between Login and Project Initiation
  - Returning users: Accessible anytime via App Header

### Key Characteristics
- **Modal/Dialog interface:** Overlays current screen, doesn't navigate away
- **First-time mandatory:** New users must complete profile before accessing system
- **Validation-focused:** Real-time validation with clear error messages
- **Picture upload:** Optional profile picture with preview
- **SRM-ready:** Designed for future SRM integration

## 4. Visual Layout & Structure

### 4.1 Main Sections

**Profile Modal/Dialog:**
1. **Header Section**
   - Title: "Welcome! Create Your Profile" (first-time) or "Edit Profile" (returning)
   - Description: Context-appropriate message
   - Close button (X) - disabled for first-time users

2. **Profile Picture Section** (centered)
   - Large avatar display (96x96px)
   - Shows uploaded picture or initials
   - Upload button
   - Remove button (if picture exists)
   - Error message area

3. **Form Fields Section**
   - Name input (required)
   - Email input (required)
   - Phone number input (optional)
   - Function dropdown (required)
   - SRM integration note (first-time only)

4. **Footer Section**
   - Cancel button (returning users only)
   - Save/Create button

### 4.2 Key UI Elements

**Profile Picture:**
- **Avatar Display:** 96x96px circle
  - Shows uploaded image if available
  - Shows initials (2 letters) if no image
  - Shows user icon if no name entered yet
- **Upload Button:** "Upload Picture" with upload icon
- **Remove Button:** "Remove" with X icon (conditional)
- **File Input:** Hidden, triggered by upload button
- **Error Display:** Red text below buttons

**Name Field:**
- **Label:** "Name" with red asterisk (*)
- **Icon:** User icon (left side)
- **Input:** Text field with placeholder "Enter your full name"
- **Validation:** Real-time, displays error below field
- **Error States:** Red border when invalid

**Email Field:**
- **Label:** "Email" with red asterisk (*)
- **Icon:** Mail icon (left side)
- **Input:** Email field with placeholder "your.email@company.com"
- **Validation:** Real-time email format validation
- **Error States:** Red border when invalid

**Phone Number Field:**
- **Label:** "Phone Number" (no asterisk - optional)
- **Icon:** Phone icon (left side)
- **Input:** Tel field with placeholder "+1 (555) 123-4567"
- **Validation:** Format validation if provided
- **Error States:** Red border when invalid format

**Function Dropdown:**
- **Label:** "Function" with red asterisk (*)
- **Icon:** Briefcase icon (left side)
- **Select:** Dropdown with 4 options
  - Commodity Buyer
  - Project Buyer
  - Sourcing Buyer
  - Advance Sourcing Buyer
- **Placeholder:** "Select your function"
- **Error States:** Red border when not selected

**SRM Integration Note** (first-time only):
- **Container:** Blue background box
- **Icon:** Info icon
- **Text:** "Note: SRM integration will be available soon. For now, you can create your profile manually."

**Action Buttons:**
- **Cancel Button:** Outline style, left side (returning users only)
- **Save Button:** Primary style, right side
  - Text: "Create Profile" (first-time) or "Save Changes" (returning)

### 4.3 Information Hierarchy

**Primary Information:**
- Profile picture/avatar
- Name (most important identifier)
- Function (defines user role/permissions)

**Secondary Information:**
- Email (contact and authentication)
- Phone number (optional contact)

**Tertiary Information:**
- SRM integration status
- Timestamps (created/updated)

## 5. Data Requirements

### 5.1 System Fields (Immutable)
| Field Name | Data Type | Source | Required | Format/Validation |
|------------|-----------|--------|----------|-------------------|
| id | String | System | Yes | Auto-generated: "buyer-{timestamp}" |
| createdAt | DateTime | System | Yes | ISO 8601, set on creation |
| updatedAt | DateTime | System | Yes | ISO 8601, updated on save |

### 5.2 Data Displayed (Profile Information)
| Field Name | Data Type | Source | Required | Format/Validation |
|------------|-----------|--------|----------|-------------------|
| name | String | User Input | Yes | 2-100 characters |
| email | Email | User Input | Yes | Valid email format |
| phoneNumber | String | User Input | No | Valid phone format if provided |
| function | Enum | User Input | Yes | One of 4 buyer types |
| picture | String | User Upload | No | Base64 or URL, <2MB |

### 5.3 Data Collected from User
| Field Name | Input Type | Required | Validation Rules | Default Value |
|------------|------------|----------|------------------|---------------|
| name | Text input | Yes | 2-100 chars, trim whitespace | Empty string |
| email | Email input | Yes | Valid email regex | Empty string |
| phoneNumber | Tel input | No | Phone regex if provided | Empty string |
| function | Select dropdown | Yes | Must select one option | "Commodity Buyer" |
| picture | File upload | No | Image file, <2MB, jpg/png/gif | undefined |

### 5.4 Calculated/Derived Data
| Field Name | Calculation Logic | Dependencies |
|------------|-------------------|--------------|
| initials | First letter of each word in name, max 2 letters | name |
| avatar_color | Consistent color based on name hash | name |
| picture_preview | Base64 data URL from uploaded file | picture file |

### 5.5 SRM Integration Data (Future)
| Field Name | Data Type | Source | Required | Format/Validation |
|------------|-----------|--------|----------|-------------------|
| srmId | String | SRM System | No | External system ID |
| lastSync | DateTime | SRM System | No | ISO 8601 |

## 6. User Interactions

### 6.1 Primary Actions

**Action: Create Profile (First-Time Users)**
- **Trigger:** User clicks "Create Profile" button after filling required fields
- **Behavior:**
  1. Validate all form fields
  2. If validation fails, display errors inline
  3. If validation passes:
     - Generate unique profile ID
     - Set createdAt and updatedAt timestamps
     - Save profile to localStorage and backend
     - Close modal
     - Redirect to Project Initiation
- **Validation:**
  - Name: 2-100 characters, not empty
  - Email: Valid email format
  - Phone: Valid format if provided
  - Function: Must be selected
  - Picture: <2MB, image format if provided
- **Success:** Profile created, modal closes, user proceeds to Project Initiation
- **Error:** Display validation errors inline below each field
- **Navigation:** Profile Modal → Project Initiation

**Action: Save Changes (Returning Users)**
- **Trigger:** User clicks "Save Changes" button after editing profile
- **Behavior:**
  1. Validate all form fields
  2. If validation fails, display errors inline
  3. If validation passes:
     - Update updatedAt timestamp
     - Save changes to localStorage and backend
     - Refresh App Header display
     - Close modal
     - Show success message
- **Validation:** Same as Create Profile
- **Success:** Profile updated, modal closes, success toast displayed
- **Error:** Display validation errors inline
- **Navigation:** Stays on current screen, modal closes

**Action: Upload Profile Picture**
- **Trigger:** User clicks "Upload Picture" button and selects file
- **Behavior:**
  1. Open file picker dialog
  2. User selects image file
  3. Validate file size (<2MB)
  4. Validate file type (image/*)
  5. Convert to base64 data URL
  6. Display preview in avatar
  7. Enable "Remove" button
- **Validation:**
  - File size: <2MB
  - File type: image/* (jpg, png, gif, etc.)
- **Success:** Picture preview displayed, ready to save
- **Error:** Display error message below buttons
  - "Image must be less than 2MB"
  - "Please upload an image file"
- **Navigation:** None (stays in modal)

**Action: Remove Profile Picture**
- **Trigger:** User clicks "Remove" button
- **Behavior:**
  1. Clear picture data
  2. Clear picture preview
  3. Display initials in avatar
  4. Hide "Remove" button
- **Validation:** None
- **Success:** Picture removed, initials displayed
- **Error:** N/A
- **Navigation:** None (stays in modal)

### 6.2 Secondary Actions

**Action: Cancel Edit (Returning Users Only)**
- **Trigger:** User clicks "Cancel" button
- **Behavior:**
  1. Discard all changes
  2. Close modal
  3. Restore original profile data
- **Validation:** None
- **Success:** Modal closes, no changes saved
- **Error:** N/A
- **Navigation:** Stays on current screen, modal closes

**Action: Close Modal (Returning Users Only)**
- **Trigger:** User clicks X button or presses Escape key
- **Behavior:** Same as Cancel action
- **Validation:** None
- **Success:** Modal closes, no changes saved
- **Error:** N/A
- **Navigation:** Stays on current screen, modal closes

**Action: Real-Time Validation**
- **Trigger:** User types in any field or changes selection
- **Behavior:**
  1. Validate field on blur (when user leaves field)
  2. Display error message if invalid
  3. Remove error message when valid
  4. Update field border color (red for error, default for valid)
- **Validation:** Field-specific rules
- **Success:** Field validated, error cleared if valid
- **Error:** Error message displayed below field
- **Navigation:** None

### 6.3 Navigation

**From:**
- Login Screen (first-time users - mandatory)
- Any screen via App Header "Edit Profile" (returning users)

**To:**
- Project Initiation (first-time users after profile creation)
- Same screen (returning users after save/cancel)

**Exit Points:**
- Save/Create button → Closes modal
- Cancel button → Closes modal (returning users only)
- X button → Closes modal (returning users only)
- Escape key → Closes modal (returning users only)

**Blocking Behavior:**
- First-time users: Cannot close modal without completing profile
- Returning users: Can close modal anytime (changes discarded)

## 7. Business Rules

### 7.1 Validation Rules

**Name Validation:**
- Minimum length: 2 characters
- Maximum length: 100 characters
- Trim leading/trailing whitespace
- Cannot be empty or only whitespace
- Error: "Name must be at least 2 characters"
- Error: "Name must be less than 100 characters"

**Email Validation:**
- Must match email regex: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`
- Cannot be empty
- Error: "Please enter a valid email address"

**Phone Number Validation (Optional):**
- If provided, must match phone regex: `/^[\d\s\-\+\(\)]+$/`
- Allows: digits, spaces, hyphens, plus, parentheses
- Error: "Please enter a valid phone number"

**Function Validation:**
- Must select one of 4 options
- Cannot be empty
- Error: "Please select a buyer function"

**Picture Validation:**
- File size: Maximum 2MB
- File type: Must be image/* (jpg, png, gif, webp, etc.)
- Error: "Image must be less than 2MB"
- Error: "Please upload an image file"

### 7.2 Calculation Logic

**Initials Generation:**
```
initials = name.split(' ')
  .map(word => word[0])
  .join('')
  .toUpperCase()
  .slice(0, 2)

Examples:
- "Sarah Chen" → "SC"
- "John" → "JO" (first 2 letters if single word)
- "Mary Jane Watson" → "MJ" (first 2 words)
```

**Avatar Color Generation:**
```
// Generate consistent color based on name
hash = hashCode(name)
colorIndex = hash % colorPalette.length
avatarColor = colorPalette[colorIndex]

// Ensures same name always gets same color
```

**Picture Preview:**
```
// Convert uploaded file to base64 data URL
reader = new FileReader()
reader.readAsDataURL(file)
picturePreview = reader.result // data:image/png;base64,...
```

### 7.3 Conditional Display Logic

**Remove Picture Button:**
- Show if: `picture !== undefined && picture !== null`
- Hide if: No picture uploaded
- Condition: `picturePreview ? show : hide`

**Cancel Button:**
- Show if: `isFirstTime === false` (returning users)
- Hide if: `isFirstTime === true` (first-time users)
- Condition: `!isFirstTime ? show : hide`

**Close Button (X):**
- Enabled if: `isFirstTime === false` (returning users)
- Disabled if: `isFirstTime === true` (first-time users)
- Condition: `!isFirstTime ? enabled : disabled`

**SRM Integration Note:**
- Show if: `isFirstTime === true`
- Hide if: `isFirstTime === false`
- Condition: `isFirstTime ? show : hide`

**Button Text:**
- "Create Profile" if: `isFirstTime === true`
- "Save Changes" if: `isFirstTime === false`
- Condition: `isFirstTime ? "Create Profile" : "Save Changes"`

**Modal Title:**
- "Welcome! Create Your Profile" if: `isFirstTime === true`
- "Edit Profile" if: `isFirstTime === false`

**Modal Description:**
- "Please complete your profile to get started with Optiroq." if: `isFirstTime === true`
- "Update your profile information below." if: `isFirstTime === false`

### 7.4 Error Handling

**Validation Errors:**
- **Detection:** Field validation fails on blur or submit
- **Handling:**
  - Display error message below field in red text
  - Add red border to field
  - Prevent form submission
  - Focus first invalid field

**File Upload Errors:**
- **Detection:** File size >2MB or invalid file type
- **Handling:**
  - Display error message below upload buttons
  - Clear file input
  - Do not update picture preview
  - Allow user to try again

**Save Errors (Backend):**
- **Detection:** API call fails or network error
- **Handling:**
  - Display error toast: "Failed to save profile. Please try again."
  - Keep modal open with user's data
  - Allow user to retry
  - Log error for monitoring

**Picture Conversion Errors:**
- **Detection:** FileReader fails to convert image
- **Handling:**
  - Display error: "Failed to process image. Please try another file."
  - Clear file input
  - Allow user to try again

## 8. Acceptance Criteria

### 8.1 Functional Criteria

1. WHEN first-time user logs in THEN profile modal SHALL open automatically
2. WHEN first-time user tries to close modal THEN close action SHALL be blocked
3. WHEN user enters name <2 characters THEN error SHALL display "Name must be at least 2 characters"
4. WHEN user enters invalid email THEN error SHALL display "Please enter a valid email address"
5. WHEN user enters invalid phone format THEN error SHALL display "Please enter a valid phone number"
6. WHEN user does not select function THEN error SHALL display "Please select a buyer function"
7. WHEN user uploads image >2MB THEN error SHALL display "Image must be less than 2MB"
8. WHEN user uploads non-image file THEN error SHALL display "Please upload an image file"
9. WHEN user uploads valid image THEN preview SHALL display in avatar
10. WHEN user clicks "Remove" THEN picture SHALL be cleared and initials SHALL display
11. WHEN user has no picture THEN avatar SHALL display initials (2 letters)
12. WHEN user has single-word name THEN initials SHALL use first 2 letters
13. WHEN first-time user completes profile THEN modal SHALL close and redirect to Project Initiation
14. WHEN returning user saves changes THEN modal SHALL close and App Header SHALL refresh
15. WHEN returning user clicks "Cancel" THEN changes SHALL be discarded and modal SHALL close
16. WHEN all required fields are valid THEN save button SHALL be enabled
17. WHEN any required field is invalid THEN save button SHALL remain enabled but show errors on click

### 8.2 UX Criteria

1. Modal opens with smooth animation (fade in)
2. All form fields have clear labels with required indicators (*)
3. Icons are displayed on left side of each input field
4. Error messages are displayed inline below relevant fields
5. Error messages are clear, specific, and actionable
6. Field borders turn red when validation fails
7. Real-time validation occurs on blur (when user leaves field)
8. Profile picture preview updates immediately after upload
9. Avatar displays consistent color for same name
10. Modal is centered on screen and responsive
11. Modal width is appropriate (max 500px)
12. All interactive elements have hover states
13. Tab navigation works correctly through all fields
14. Escape key closes modal (returning users only)
15. Loading indicator shown during save operation

### 8.3 Edge Cases

1. WHEN user enters name with multiple spaces THEN spaces SHALL be trimmed to single space
2. WHEN user enters name with leading/trailing spaces THEN spaces SHALL be trimmed
3. WHEN user enters email with uppercase letters THEN email SHALL be converted to lowercase
4. WHEN user uploads image exactly 2MB THEN upload SHALL succeed
5. WHEN user uploads image 2.1MB THEN error SHALL display
6. WHEN user enters phone with various formats THEN all valid formats SHALL be accepted
7. WHEN user changes function multiple times THEN last selection SHALL be saved
8. WHEN user uploads picture then removes it THEN initials SHALL display again
9. WHEN user has no name entered THEN avatar SHALL display user icon
10. WHEN user enters name with special characters THEN name SHALL be accepted
11. WHEN user tries to save without changes THEN save SHALL succeed (no-op)
12. WHEN network fails during save THEN error message SHALL display and data SHALL be retained
13. WHEN user refreshes page during profile creation THEN profile modal SHALL reopen
14. WHEN user has existing profile in localStorage THEN profile SHALL load automatically
15. WHEN localStorage is full THEN error SHALL be handled gracefully

## 9. Dependencies

### 9.1 Prerequisites
- User successfully authenticated (has valid session)
- Browser supports localStorage
- Browser supports FileReader API (for picture upload)

### 9.2 Backend/API Requirements

**Profile Management Endpoints:**
- `POST /api/users/profile` - Create new profile
- `PUT /api/users/profile/{id}` - Update existing profile
- `GET /api/users/profile/{id}` - Get profile by ID
- `POST /api/users/profile/picture` - Upload profile picture (alternative to base64)
- `DELETE /api/users/profile/picture/{id}` - Delete profile picture

**Data Structures:**

```typescript
interface BuyerProfile {
  id: string;
  name: string;
  email: string;
  phoneNumber: string;
  picture?: string; // Base64 data URL or image URL
  function: 'Commodity Buyer' | 'Project Buyer' | 'Sourcing Buyer' | 'Advance Sourcing Buyer';
  createdAt: Date;
  updatedAt: Date;
  srmIntegration?: {
    srmId: string;
    lastSync: Date;
  };
}

interface ProfileCreateRequest {
  name: string;
  email: string;
  phoneNumber?: string;
  function: string;
  picture?: string;
}

interface ProfileUpdateRequest {
  name?: string;
  email?: string;
  phoneNumber?: string;
  function?: string;
  picture?: string;
}

interface ProfileResponse {
  success: boolean;
  profile: BuyerProfile;
  error?: string;
}
```

### 9.3 Integration Points

**Local Storage:**
- Key: `buyerProfile`
- Value: JSON stringified BuyerProfile object
- Used for: Offline access, quick load, session persistence

**App Header:**
- Profile data displayed in header
- Header refreshes when profile updated
- Integration: Pass updated profile to header component

**SRM Integration (Future):**
- Import profile data from SRM system
- Sync profile changes back to SRM
- Map SRM fields to Optiroq profile fields
- Handle SRM authentication

**File Upload:**
- FileReader API for client-side image processing
- Base64 encoding for storage
- Alternative: Upload to S3 and store URL

## 10. Success Metrics

### 10.1 Completion Metrics
- **Profile Completion Rate:** >99% of first-time users complete profile
- **Time to Complete:** <2 minutes average for first-time users
- **Edit Frequency:** Average 1-2 profile edits per user per year
- **Picture Upload Rate:** >60% of users upload profile picture

### 10.2 Quality Metrics
- **Validation Error Rate:** <10% of submissions have validation errors
- **Save Success Rate:** >99% of save attempts succeed
- **Picture Upload Success Rate:** >95% of picture uploads succeed
- **Data Accuracy:** >98% of profiles have valid email and phone formats

### 10.3 User Experience Metrics
- **Modal Load Time:** <500ms to display modal
- **Save Response Time:** <2 seconds from click to confirmation
- **Picture Preview Time:** <1 second from upload to preview display
- **User Satisfaction:** >4.5/5 rating for profile management experience

## 11. Open Questions

1. **Email Verification:** Should email addresses be verified before allowing profile creation?
2. **Phone Format:** Should phone numbers be normalized to a standard format (E.164)?
3. **Picture Storage:** Should pictures be stored as base64 in database or uploaded to S3/CDN?
4. **Picture Size:** Is 2MB the right limit? Should we compress images automatically?
5. **Function Changes:** Can users change their function after creation, or should it be locked?
6. **Profile Deletion:** Should users be able to delete their profile, or only deactivate?
7. **Audit Trail:** Should profile changes be logged for audit purposes?
8. **SRM Integration:** What SRM systems need to be supported? (SAP, Oracle, etc.)
9. **Multi-Language:** Should profile support multiple languages for name/function?
10. **Company Field:** Should company name be part of profile or derived from authentication?
11. **Department Field:** Should department be added as an optional field?
12. **Role vs Function:** Is "function" sufficient or do we need separate "role" field for permissions?

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Jan 2, 2026 | Kiro | Initial screen requirements document |

