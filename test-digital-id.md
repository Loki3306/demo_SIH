# Digital ID Registration System - Test Scenarios

## Overview
This document provides test scenarios to validate the Digital ID Registration System implementation.

## Environment Setup
- Development server running on: http://localhost:8081/
- Backend server running on: http://localhost:8080/ (via vite proxy)
- Blockchain mock service: http://localhost:5002/ (fallback mock responses available)

## Test Scenarios

### 1. Registration Flow Test
**Objective**: Test the complete multi-step registration process

**Steps**:
1. Navigate to http://localhost:8081/auth/register
2. Complete Step 1 - Personal Information:
   - Full Name: "Test User"
   - Email: "test@example.com"
   - Phone: "+91 98765 43210"
   - Password: "password123"
3. Complete Step 2 - Travel Details:
   - Itinerary: "Planning to visit Golden Triangle - Delhi, Agra, Jaipur"
   - Emergency Contact Name: "Emergency Contact"
   - Emergency Contact Phone: "+91 98765 43211"
4. Complete Step 3 - Document Verification:
   - Select Document Type: Aadhaar
   - Document Number: "1234 5678 9012"
   - Upload Document: Any image file (JPG/PNG) or PDF
5. Complete Step 4 - Terms & Consent:
   - Check consent checkbox
   - Submit application

**Expected Results**:
- Form validation works at each step
- File upload accepts valid file types
- Success page shows with application ID
- New user entry created in backend

### 2. Profile View Test
**Objective**: Test the My Profile page functionality

**Steps**:
1. Navigate to http://localhost:8081/profile
2. Verify profile data loads correctly
3. Check Digital ID card display
4. Test QR code functionality (if verified user)

**Expected Results**:
- Profile information displays correctly
- Verification status badge shows appropriate color/icon
- QR code displays for verified users
- Blockchain information shows when available

### 3. Admin Verification Test
**Objective**: Test admin verification workflow

**Steps**:
1. Navigate to http://localhost:8081/admin
2. View pending verifications list
3. Click "View" on a pending application
4. Review application details in modal
5. Add admin notes
6. Approve or reject application

**Expected Results**:
- Pending applications list loads
- Application details modal shows complete information
- Document viewer opens (if available)
- Approval creates blockchain ID
- History updates with admin action

### 4. Tourist Dashboard Integration Test
**Objective**: Test enhanced dashboard with Digital ID status

**Steps**:
1. Navigate to http://localhost:8081/tourist/dashboard
2. Verify Digital ID status card displays
3. Check integration with other dashboard components

**Expected Results**:
- Digital ID status card shows current verification status
- QR code displays for verified users
- Quick info shows user details
- Dashboard layout remains functional

### 5. Authentication Flow Test
**Objective**: Test login functionality and redirects

**Steps**:
1. Navigate to http://localhost:8081/auth/login
2. Use quick access buttons for different roles
3. Test form-based login with email/password

**Expected Results**:
- Quick access buttons redirect to appropriate dashboards
- Form login processes and redirects correctly
- Authentication state is maintained

## API Endpoint Tests

### Backend API Validation
Test these endpoints using browser dev tools or curl:

1. **Registration**: `POST /api/auth/register`
2. **Profile Data**: `GET /api/tourist/profile/:userId`
3. **Digital ID Info**: `GET /api/tourist/digital-id/:userId`
4. **Admin Verification**: `GET /api/admin/pending-verifications`
5. **Blockchain Health**: `GET /api/bridge/blockchain/health`

## Data Validation

### Seed Data Testing
The system should load with these test users:
- t123: Arjun Kumar (verified)
- t124: Sarah Johnson (pending)
- t125: Rahul Sharma (rejected)
- t126: Emily Chen (pending)
- t127: Vikram Singh (verified)

### Verification Status States
Test all verification states:
- **Pending**: Yellow badge, clock icon, pending message
- **Verified**: Green badge, check icon, QR code displayed
- **Rejected**: Red badge, X icon, rejection message
- **Archived**: Gray badge, archive icon

## Browser Compatibility
Test on:
- Chrome (latest)
- Firefox (latest)
- Edge (latest)
- Safari (if available)

## Mobile Responsiveness
Test responsive design on:
- Mobile devices (320px - 768px)
- Tablets (768px - 1024px)
- Desktop (1024px+)

## Performance Validation
- Page load times under 3 seconds
- Form submissions under 2 seconds
- Smooth animations and transitions
- No console errors

## Security Validation
- File upload restrictions working
- Form validation preventing invalid submissions
- Proper error handling for failed requests
- No sensitive data exposed in client-side code

## Notes
- Blockchain service may show fallback responses if mock service is unavailable
- Document upload is simulated for development
- Email notifications are logged to console in development mode
- All authentication is mocked for development purposes