# Sevora CRM - Product Requirements Document

## Original Problem Statement
Create CRM tool for Sevora, a stylist-led affordable luxury fashion app with:
- Lead Capture System (Online + Offline with QR codes, source tracking)
- Customer Profile System
- Wedding Fashion Planner
- CRM & Lead Pipeline
- Channel Performance Dashboard
- WhatsApp Follow-Up & Email Notifications

## User Personas
1. **Admin**: Full access, manages all users and settings
2. **Stylist**: Manages assigned leads, creates wedding plans
3. **Sales Team**: Lead follow-up, pipeline management
4. **Customer Experience**: Customer profile management

## Core Requirements (Static)
- JWT-based authentication
- Lead source attribution tracking
- QR code generation for offline marketing
- Wedding event planning with outfit budgets
- Kanban-style pipeline management
- Multi-channel analytics dashboard
- WhatsApp (Twilio) integration
- Email notifications (SendGrid)

## What's Been Implemented (Jan 7, 2026)
### Backend (FastAPI + MongoDB)
- ✅ User authentication (register/login/JWT)
- ✅ Leads CRUD with source tracking
- ✅ Customer profiles with journey history
- ✅ Wedding plans with event/outfit planning
- ✅ QR code generation with scan tracking
- ✅ Dashboard statistics API
- ✅ Channel performance analytics
- ✅ Stylist performance tracking
- ✅ WhatsApp message sending (Twilio)
- ✅ Email notifications (SendGrid)
- ✅ Public lead capture endpoint

### Frontend (React + Tailwind + shadcn/ui)
- ✅ Login/Registration page
- ✅ Dashboard with charts (Recharts)
- ✅ Leads management with filters
- ✅ Customer profiles
- ✅ Wedding fashion planner
- ✅ Kanban pipeline board
- ✅ Analytics dashboard
- ✅ QR code generator
- ✅ Public lead capture form
- ✅ Settings page

## Design System
- **Primary**: Deep Emerald #064E3B
- **Accent**: Metallic Gold #D4AF37
- **Typography**: Playfair Display (headings), Manrope (body)
- **Style**: Sharp edges (0px radius), luxury editorial aesthetic

## Integrations
- Twilio WhatsApp API (configured)
- SendGrid Email API (configured)
- MongoDB for data storage

## Prioritized Backlog

### P0 (Critical) - COMPLETE
- [x] Lead capture with source tracking
- [x] Pipeline management
- [x] Customer profiles
- [x] QR code generation

### P1 (High)
- [ ] Bulk lead import/export (CSV)
- [ ] Advanced filtering and search
- [ ] Lead assignment automation
- [ ] Real-time notifications

### P2 (Medium)
- [ ] Stylist scheduling calendar
- [ ] Outfit recommendations
- [ ] Customer feedback collection
- [ ] Revenue tracking per lead

### P3 (Low)
- [ ] Mobile app version
- [ ] WhatsApp chatbot
- [ ] Integration with e-commerce
- [ ] Advanced reporting exports

## Next Tasks
1. Add bulk CSV import for leads
2. Implement real-time notifications (WebSocket)
3. Add stylist scheduling calendar
4. Build mobile-responsive tablet mode improvements
5. Add revenue attribution to lead lifecycle

## Technical Stack
- Backend: FastAPI, Motor (async MongoDB), PyJWT
- Frontend: React 19, Tailwind CSS, shadcn/ui, Recharts
- Database: MongoDB
- Integrations: Twilio, SendGrid
