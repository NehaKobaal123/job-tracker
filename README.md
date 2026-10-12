# JobTrack — HTML/CSS/JS + Spring Boot + MySQL

A beginner-friendly full-stack Job Tracker inspired by the supplied dashboard screenshot.

## Stack

- Frontend: HTML, CSS, Vanilla JavaScript
- Backend: Java 17 + Spring Boot 3.5.x + Spring Data JPA + Spring Security
- Authentication: BCrypt + JWT
- Database: MySQL 8
- Local database: Docker Compose
- Source control: GitHub
- Deployment option: Render/Railway for backend + Aiven/Railway/Render for MySQL, or serve the frontend from Spring Boot.

## Folder structure

job-tracker/
├── backend/
│   ├── pom.xml
│   ├── Dockerfile
│   └── src/main/...
├── frontend/
│   ├── index.html
│   ├── login.html
│   ├── register.html
│   ├── css/
│   └── js/
├── database/
│   ├── docker-compose.yml
│   └── schema.sql
└── README.md

## Important

For a simple deployment, copy the frontend files into:
backend/src/main/resources/static/

Then Spring Boot serves the website and API from the same domain.

For local development, run Spring Boot on port 8080 and open the frontend with VS Code Live Server. The frontend automatically sends API requests to `http://localhost:8080/api` when served separately from localhost. To use a different API address, set `window.API_BASE` before loading `js/config.js`. When Spring Boot serves the frontend, API requests use the same-origin `/api` path.

## Deploy online with Railway

The backend serves the frontend from the same domain, so you only need one web
service and a MySQL database. The Dockerfile builds the Spring Boot application
from source; no JAR needs to be committed.

1. Push this project to a GitHub repository. Before pushing frontend changes,
   run `prepare-static.bat` from the project root so the copy served by Spring
   Boot is up to date.
2. In Railway, create a project from that GitHub repository and add a MySQL
   database service to the same project.
3. Configure the web service's **Root Directory** as `/backend`. Railway will
   build and run `backend/Dockerfile`.
4. Add these variables to the web service, replacing `MySQL` in the Railway
   references with the exact name of your database service if needed. These
   references connect the app to Railway's private MySQL host; without them,
   the app falls back to local development defaults and cannot start in Railway.

   ```text
   MYSQLHOST=${{MySQL.MYSQLHOST}}
   MYSQLPORT=${{MySQL.MYSQLPORT}}
   MYSQLDATABASE=${{MySQL.MYSQLDATABASE}}
   MYSQLUSER=${{MySQL.MYSQLUSER}}
   MYSQLPASSWORD=${{MySQL.MYSQLPASSWORD}}
   JWT_SECRET=<a-long-random-secret>
   ```

   The app builds its JDBC connection from `MYSQLHOST`, `MYSQLPORT`,
   `MYSQLDATABASE`, `MYSQLUSER`, and `MYSQLPASSWORD`. Confirm each reference
   resolves to a value in the web service's **Variables** tab. You can
   optionally set `DB_URL`, `DB_USERNAME`, and `DB_PASSWORD` to override
   individual connection settings. If deploy logs say `Access denied for user`,
   remove those `DB_*` overrides and make sure `MYSQLUSER` and `MYSQLPASSWORD`
   both reference the same MySQL service. Do not paste or share the password;
   use Railway's variable-reference picker.

   Generate a JWT secret locally with:

   ```powershell
   [Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
   ```

   Set the generated value in Railway's variable settings; do not commit it.
   Railway supplies `PORT`, which Spring Boot uses automatically.
5. Deploy the service and open its Railway-provided public URL. The login page,
   other frontend pages, and `/api` are served by the same service.

Keep the MySQL service private to the Railway project. Do not put database
passwords or the JWT secret in source files or share them publicly.

Resumes uploaded from the profile are limited to PDF, DOC, or DOCX files up to 5 MB. The backend stores them under `backend/uploads/resumes` by default; set `UPLOAD_DIR` to choose another storage directory. Use persistent storage for this directory when deploying the app.

Never commit real database passwords or JWT secrets. Use environment variables for deployment.
