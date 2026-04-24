# 🚀 Multi-Tenant Task Manager

A scalable backend system that allows multiple organizations to manage tasks independently with strict data isolation and role-based access control (RBAC).

---

## 📌 Features

- 🏢 Multi-Tenancy  
  Each organization has isolated data, and users can only access their own organization’s tasks.

- 🔐 Authentication & Security  
  JWT-based authentication with secure password hashing using bcrypt.

- 👥 Role-Based Access Control (RBAC)  
  - Admin → Manage all tasks within the organization  
  - Member → Manage only their own tasks  

- 📝 Task Management  
  - Create tasks  
  - View tasks (organization-specific)  
  - Delete tasks (based on permissions)

- 🧾 Audit Logs  
  Tracks task creation and deletion for activity history.

- 🐳 Docker Support  
  Containerized backend with Docker and docker-compose.

---

## 🛠️ Tech Stack

- Backend: Node.js, Express  
- Authentication: JWT, bcrypt  
- Containerization: Docker  

---

## 📂 Project Structure
