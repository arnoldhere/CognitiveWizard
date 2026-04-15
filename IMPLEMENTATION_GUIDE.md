# CognitiveWizardAI - Full Stack Implementation Guide

A smart, AI-powered quiz and exam preparation platform with responsive UI, JWT authentication, and role-based access control.

---

## Project Overview

**Frontend**: React + Vite + React Router + Axios  
**Backend**: FastAPI + SQLAlchemy + MySQL + JWT Authentication  
**AI Integration**: Hugging Face Inference API (Llama 3.1 8B Instruct)

## Backend Setup

### Prerequisites
- Python 3.8+
- MySQL Server running
- Hugging Face API key

### Installation

```bash
cd server
pip install -r requirements.txt
```

### Environment Configuration

Create a `.env` file in `/server`:

```env
# Hugging Face
HF_API_KEY=your_hf_api_key_here
QUIZ_GENERATOR_MODEL=meta-llama/Llama-3.1-8B-Instruct

# MySQL
DB_USER=root
DB_PASSWORD=your_db_password
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=cognitive_wizard

# JWT
JWT_SECRET_KEY=your-super-secret-key-change-this
ACCESS_TOKEN_EXPIRE_MINUTES=60
```

### Database Setup

```bash
# Create MySQL database
mysql -u root -p
> CREATE DATABASE cognitive_wizard;
> EXIT;

# Run the FastAPI server (it will auto-create tables)
python -m uvicorn main:app --reload
```

## Frontend Setup

### Prerequisites
- Node.js 16+
- npm or yarn

### Installation

```bash
cd client
npm install
```

### Environment Configuration

Create `.env` in `/client`:

```env
VITE_BACKEND_BASE_URL=http://localhost:8000
```

### Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

---

## Initial Proposed Project Structure

### Backend (`/server`)

```
📁 server/
├── api/
│   ├── auth_api.py         # Authentication routes
│   └── quiz_api.py         # Quiz generation routes
├── config/
│   ├── settings.py         # Configuration & env vars
│   └── hf_inference.py     # Hugging Face client
├── models.py               # SQLAlchemy User model
├── db.py                   # Database connection & session
├── schemas/
│   ├── auth_schema.py      # Pydantic models for auth
│   └── quiz_schema.py      # Pydantic models for quiz
├── services/
│   ├── auth_service.py     # User & password utilities
│   ├── quiz/
│   │   ├── quiz_generator.py
│   │   └── quiz_validator.py
│   └── sentiment/
├── utils/
│   ├── security.py         # JWT token creation/validation
│   ├── json_parser.py      # Response parsing
│   └── prompt_builder/
│       └── quiz_prompt.py
├── main.py                 # FastAPI app entry
├── requirements.txt        # Python dependencies
└── .env                    # Environment variables
```

### Frontend (`/client`)

```
📁 client/
├── src/
│   ├── contexts/
│   │   └── AuthContext.jsx # Global auth state
│   ├── pages/
│   │   ├── Home.jsx        # Landing page
│   │   ├── QuizPage.jsx    # Quiz builder (protected)
│   │   ├── Login.jsx       # Login form
│   │   ├── Signup.jsx      # Signup form
│   │   ├── About.jsx       # About page
│   │   ├── Contact.jsx     # Contact page
│   │   ├── Profile.jsx     # User profile (protected)
│   │   └── NotFound.jsx    # 404 page
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Navbar.jsx  # Responsive navigation
│   │   │   └── Footer.jsx
│   │   ├── quiz/
│   │   │   ├── QuizForm.jsx
│   │   │   └── QuizCard.jsx
│   │   └── utils/
│   │       ├── Loader.jsx
│   │       └── ErrorMessage.jsx
│   ├── hooks/
│   │   └── useQuiz.jsx     # Quiz generation hook
│   ├── services/
│   │   ├── api.js          # Quiz API calls
│   │   └── auth.js         # Auth API calls
│   ├── App.jsx             # Main app with routing
│   ├── App.css             # Global & responsive styles
│   ├── index.css           # Reset & base styles
│   └── main.jsx
├── package.json
├── vite.config.js
└── .env
```

---

## Authentication Flow

### User Registration

1. User fills signup form (`/signup`)
2. Frontend sends POST to `/auth/signup` with `{ email, password, full_name }`
3. Backend hashes password, saves user to MySQL
4. Redirect to login

### User Login

1. User fills login form (`/login`)
2. Frontend sends POST to `/auth/login` with `{ email, password }`
3. Backend validates credentials, issues JWT token
4. Token stored in localStorage as `cw_token`
5. AuthContext updates with user data
6. Redirect to dashboard/quiz page

### Protected Routes

- All API requests include JWT in Authorization header: `Bearer {token}`
- Backend validates token in `get_current_user()` dependency
- Role-based access via `require_role(['user', 'admin'])` decorator

---

## Quiz Generation Flow

1. User navigates to `/quiz` (protected route)
2. Fills form: topic, difficulty (easy/medium/hard), num_questions
3. Frontend calls `/quiz/generate` endpoint (includes JWT token)
4. Backend uses Hugging Face API to generate JSON quiz
5. Response parsed & validated
6. QuizCard component renders questions with options

---

## Responsive Design

### Mobile-First Approach

- **Breakpoints**: 
  - Desktop: 1120px max container
  - Tablet: 900px (grid →stack)
  - Mobile: 640px (full-width)

- **Navigation**: 
  - Desktop: Horizontal nav + profile dropdown
  - Mobile: Hamburger menu + slide-down nav

- **Forms**: 
  - Two-column grids collapse to single column on mobile

---

## Security Features

✅ **Password Hashing**: bcrypt via passlib  
✅ **JWT Tokens**: HS256 algorithm, configurable expiry  
✅ **CORS Protection**: Configured for localhost origins  
✅ **RBAC**: Role-based access control in decorators  
✅ **Token Storage**: Client-side localStorage (secure httpOnly cookies optional)

---

## Running the Full Application

### Terminal 1: Backend

```bash
cd server
python -m uvicorn main:app --reload
```

Server runs at `http://localhost:8000`

### Terminal 2: Frontend

```bash
cd client
npm run dev
```

App runs at `http://localhost:5173`

---

## Common Command Reference

### Backend

```bash
# Install deps
pip install -r requirements.txt

# Database: create
mysql -u root -p -e "CREATE DATABASE cognitive_wizard;"

# Start server
python -m uvicorn main:app --reload --port 8000

# Check health
curl http://localhost:8000/health
```

### Frontend

```bash
# Install deps
npm install

# Dev server
npm run dev

# Build for production
npm run build

# Lint
npm run lint
```

---

## Deployment

### Backend (FastAPI)

Deploy to AWS, Heroku, Render, or self-hosted:
- Use `gunicorn` or `uvicorn` as ASGI server
- Set production environment variables
- Configure real database (AWS RDS, etc.)
- SSL/TLS certificates

### Frontend (Vite)

Deploy to Netlify, Vercel, GitHub Pages, or S3:
- Run `npm run build` to generate `/dist`
- Set `VITE_BACKEND_BASE_URL` to production API
- Configure CORS on backend accordingly

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| JWT token expired | Client logs out automatically; user logs back in |
| CORS errors | Check `CORSMiddleware` in `main.py` |
| Database connection fails | Verify MySQL running, credentials in `.env` |
| Quiz generation timeout | Check Hugging Face API key & model availability |
| Navbar dropdown not showing | Check CSS active state & z-index |

---

## Next Steps

- [ ] Add dark mode support
- [ ] Implement quiz scoring & analytics
- [ ] Email verification for signup
- [ ] Password reset functionality
- [ ] Admin dashboard for user management
- [ ] Quiz history & progress tracking
- [ ] Social sharing features

---

## Support

For issues or questions, open a GitHub issue or contact the team.

**Built with** ❤️ using FastAPI, React, and AI.
