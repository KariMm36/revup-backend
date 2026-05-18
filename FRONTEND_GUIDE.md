# RevUp Frontend API Integration Guide

This guide is designed to help the React Frontend Developer quickly understand and integrate the core RevUp APIs.

## 🔑 1. Authentication & Headers

All protected routes require a JWT token to be sent in the **Authorization Header**.

```javascript
// Example Axios Configuration
const api = axios.create({
  baseURL: 'https://revup-backend-production.up.railway.app/api'
});

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

---

## 📄 2. AI CV Parser & Profile

### **Upload CV (AI Powered)**
*   **Endpoint:** `POST /users/resume`
*   **Auth Required:** Yes (Seeker)
*   **Content-Type:** `multipart/form-data`
*   **What it does:** Uploads the PDF to Cloudinary, extracts data using the AI, and permanently saves Skills, Bio, Experience, Education, and Certifications to the database.

**Axios Example:**
```javascript
const formData = new FormData();
formData.append('resume', selectedPdfFile);

const response = await api.post('/users/resume', formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
});
```

**Response (`response.data.data`):**
```json
{
  "id": 1,
  "name": "Karim Mustafa",
  "bio": "Extracted bio from AI...",
  "resume_url": "https://res.cloudinary.com/...",
  "skills": [{ "id": 5, "name": "Node.js" }, { "id": 12, "name": "React" }],
  "experience": [{ "title": "React Intern", "company": "DEPI", "duration": "2025" }],
  "education": [{ "degree": "B.Sc.", "university": "New Mansoura" }],
  "certifications": [{ "name": "Node.js Diploma" }]
}
```

### **Get Full Profile**
*   **Endpoint:** `GET /users/profile`
*   **Auth Required:** Yes
*   **Response:** Returns the exact same JSON structure as above. Use this on page load to populate the user's dashboard!

---

## 🎯 3. Job Feeds

### **Get All Jobs / Latest Jobs**
*   **Endpoints:** `GET /jobs` and `GET /jobs/latest`
*   **Auth Required:** No (Public)
*   **Response:** An array of job objects. Every job includes the company details and an array of required skills.

### **Get AI Recommended Jobs**
*   **Endpoint:** `GET /jobs/recommended`
*   **Auth Required:** Yes (Seeker)
*   **What it does:** Uses the skills and bio from the Seeker's profile to ask the AI for the best matching jobs.
*   **Response:**
```json
{
  "success": true,
  "data": [
    {
      "job": {
        "id": 4,
        "title": "Junior Backend Developer",
        "salary": "2000",
        "company": { "name": "TechCorp", "logo": "https://res.cloudinary.com/..." },
        "skills": [{ "name": "Node.js" }]
      },
      "score": 53
    }
  ]
}
```
*(Note: Display the `score` as a percentage match badge on the UI!)*

---

## 📷 4. Uploading Images (Profile Pics & Logos)

*   **Seeker Profile Pic:** `POST /users/profile-pic`
*   **Company Logo:** `PUT /companies`
*   **Format:** Both require `multipart/form-data` with the field name **`logo`**.

**Axios Example:**
```javascript
const formData = new FormData();
formData.append('logo', selectedImageFile);

const response = await api.post('/users/profile-pic', formData);
```

---

## 📝 5. Quick Tips for Frontend
1. **Never construct Cloudinary URLs manually.** The API will always return the full, secure `https://res.cloudinary.com/...` URL for images and resumes. Just plug it directly into `<img src={url} />` or `<a href={url}>`.
2. **Handle Errors Gracefully:** If the AI CV parser fails for some reason, the API will *still succeed* (Status 200) and return `message: "Resume uploaded, but AI parsing failed."` The CV will still be saved.
3. **Swagger UI:** If you need to test the APIs directly, go to `https://revup-backend-production.up.railway.app/api-docs` to see the full Swagger documentation.
