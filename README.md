# CleanCity — Garbage Overflow Reporting Portal

A no-backend, no-database demonstration application. It is built with plain HTML, CSS and JavaScript, so it can be uploaded directly to GitHub and deployed to Vercel without installing npm packages or configuring a build command.

## Deploy to Vercel

1. Extract this ZIP.
2. Create a new GitHub repository.
3. Upload **all files inside this folder** to the repository root (not the ZIP itself).
4. In Vercel, choose **Add New → Project** and import that repository.
5. Select **Other** as the framework preset. Leave Build Command and Output Directory empty; set the Root Directory to `.`.
6. Deploy. No environment variables, database, API key or build step are required.

## Run locally

Open `index.html` in a browser. For a local web server, run `python -m http.server 8080` from this directory and open `http://localhost:8080`.

## Demo accounts

| Role | Email | Password |
|---|---|---|
| Administrator | `admin@cleancity.demo` | `Admin@123` |
| Worker | `worker@cleancity.demo` | `Worker@123` |
| Citizen | `citizen@cleancity.demo` | `Citizen@123` |

A citizen can also register a new local demo account from the sign-in screen. Administrators can create worker accounts, assign reports and update statuses. Workers can start and resolve assigned work. Citizens can submit and track reports. The administrator can export all browser demo data as JSON and reset the sample dataset.

## Storage behaviour and limitations

- Application records are saved in this browser's `localStorage`; the current signed-in session is stored in `sessionStorage`.
- Data persists across refreshes in the same browser profile until site data is cleared or the user resets the demo.
- Data is **not** shared across browsers, devices or different users. Deploying this static site to Vercel does not create a shared database.
- Browser storage is user-controlled and can be edited or deleted through browser developer tools. Demo credentials and role checks are visible in client-side code.
- Do not use real personal information, passwords, addresses, photos or operational data in this version.

## CIA security note

This database-free client-only edition is intended for a college demonstration. It includes basic input validation, UI role separation, status history, defensive storage parsing, storage-quota error handling and safe HTML escaping. It **cannot provide production-grade Confidentiality, Integrity or Availability**: client-side authentication and authorization can be bypassed, local records can be changed by the browser user, and data may be lost if browser storage is cleared. Real CIA guarantees require a trusted server and shared persistent storage, which this version intentionally does not use.

## Included files

- `index.html` — application shell and sign-in / registration views
- `styles.css` — responsive layout and styling
- `app.js` — authentication demo, reports, workers, assignments, status updates, export/reset, validation and error handling
- `vercel.json` — single-page fallback routing
- `.gitignore` — excludes local development and deployment files
