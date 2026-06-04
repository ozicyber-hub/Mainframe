# OziReport - Penetration Testing Reporting Portal

A comprehensive penetration testing reporting portal similar to Plextrac, built for OziCyber.

## Features

- **Authentication**: Email/password login with Google OAuth SSO support
- **Multi-tenant Architecture**: Organizations isolated from each other with RBAC
- **Dashboard**: Overview of engagements, findings, and deadlines
- **Organization Management**: Create and manage client organizations
- **Client Management**: Add client contacts with notification preferences
- **Engagement Management**: Create penetration testing projects with team assignments
- **Findings Management**: 
  - Full CVSS 3.1 calculator
  - Severity ratings (Informational, Low, Medium, High, Critical)
  - Status tracking (Draft, Open, In Review, Published, Remediated)
  - Configurable text fields (Details, Description, Impact, Likelihood, Recommendations, Evidence)
  - Custom fields support
- **Finding Repository**: Reusable finding templates with search functionality
- **Client Portal**: Real-time view of published findings with commenting
- **Email Notifications**: Alerts when findings are added/updated
- **Report Generation**: Templates with OziCyber branding
- **Export**: PDF, Word (DOCX), Excel (XLSX) formats

## Tech Stack

### Backend
- Django 5.0
- Django REST Framework
- PostgreSQL
- JWT Authentication
- Google OAuth
- Celery (for async email sending)

### Frontend
- React 18
- Material-UI (MUI)
- React Router
- TanStack Query
- Zustand (state management)

### Infrastructure
- Docker & Docker Compose
- Redis (for Celery)

## Branding

- **Primary Color**: OziCyber Green `#24483E`
- **Secondary Color**: OziCyber Gold `#FFF1AA`

## Getting Started

### Prerequisites

- Docker & Docker Compose
- Git

### Quick Start

1. **Clone the repository** (or navigate to the project directory):
   ```bash
   cd ozireport
   ```

2. **Configure environment variables**:
   ```bash
   cp backend/.env.example backend/.env
   ```
   Edit `backend/.env` and add your Google OAuth credentials.

3. **Start the application**:
   ```bash
   docker-compose up --build
   ```

4. **Access the application**:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - Django Admin: http://localhost:8000/admin
   - API Docs (Swagger): http://localhost:8000/swagger/

### Default Credentials

After first run, create a superuser:
```bash
docker-compose exec backend python manage.py createsuperuser
```

## Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Go to Credentials > Create Credentials > OAuth Client ID
5. Application type: Web Application
6. Authorized redirect URIs: `http://localhost:8000/auth/google/callback/`
7. Copy Client ID and Client Secret to your `.env` file

## Project Structure

```
ozireport/
├── backend/
│   ├── accounts/          # User authentication & RBAC
│   ├── organizations/     # Multi-tenant organization management
│   ├── engagements/       # Penetration test engagements
│   ├── findings/          # Security findings with CVSS
│   ├── repository/        # Finding templates repository
│   ├── reports/           # Report generation & export
│   ├── comments/          # Comment system
│   ├── notifications/     # Email & in-app notifications
│   └── ozireport/         # Django project settings
├── frontend/
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Page components
│   │   ├── store/         # State management (Zustand)
│   │   ├── utils/         # Utilities & API client
│   │   └── theme.js       # MUI theme with OziCyber branding
│   └── public/
└── docker-compose.yml
```

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `/api/auth/login/` | User login |
| `/api/auth/google-login/` | Google OAuth login |
| `/api/auth/register/` | User registration |
| `/api/organizations/` | Organization CRUD |
| `/api/engagements/` | Engagement CRUD |
| `/api/findings/` | Finding CRUD |
| `/api/repository/templates/` | Finding templates |
| `/api/reports/` | Report generation |
| `/api/comments/` | Comments on findings |

## Development

### Running Backend Only

```bash
cd backend
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

### Running Frontend Only

```bash
cd frontend
npm install
npm start
```

### Creating Migrations

```bash
docker-compose exec backend python manage.py makemigrations
docker-compose exec backend python manage.py migrate
```

### Running Tests

```bash
docker-compose exec backend python manage.py test
```

## Security Considerations

- All passwords are hashed using Django's PBKDF2
- JWT tokens for API authentication
- Organization-level data isolation
- RBAC for fine-grained access control
- Internal comments (not visible to clients)
- Email notifications for finding updates

## Next Steps / Future Enhancements

- [ ] Full report PDF generation with branding
- [ ] Real-time collaboration (WebSockets)
- [ ] Advanced RBAC with custom permissions
- [ ] Two-factor authentication
- [ ] Audit logging
- [ ] Finding attachments/screenshots
- [ ] Remediation tracking
- [ ] Executive dashboard with charts
- [ ] API rate limiting
- [ ] Scheduled report delivery

## License

Proprietary - OziCyber

## Support

For issues or questions, contact the OziCyber development team.
