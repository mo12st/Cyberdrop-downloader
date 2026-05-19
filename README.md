## 🚀 Cyberdrop Downloader
<img width="824" height="640" alt="Screenshot 2026-05-19 225519" src="https://github.com/user-attachments/assets/7a1f555b-71b8-4888-9df0-8cc542660158" />

An efficient, user-friendly Full-Stack Web Application designed to streamline and automate the process of fetching and downloading media from Cyberdrop links. Built with a robust Node.js backend and a clean, responsive front-end interface, this tool is fully containerized and production-ready.

🌐 **Live Demo:** [cyberdrop-downloader.vercel.app](https://cyberdrop-downloader.vercel.app)

---

## ✨ Features

* **Seamless URL Parsing:** Automatically detects and processes valid media links.
* **Full-Stack Architecture:** Separated backend logic and frontend UI for better scalability.
* **Modern UI/UX:** Clean, intuitive, and responsive interface that looks great on any device.
* **Docker Support:** Fully containerized using Docker for consistent environment replication and easy deployment.
* **Multi-Platform Deployment Ready:** Built-in configurations for seamless hosting on Vercel and Render.

---

## 🛠️ Tech Stack

* **Frontend:** HTML5, CSS3, JavaScript (Vanilla)
* **Backend:** Node.js, Express
* **DevOps & Cloud:** Docker, Vercel, Render

---

## 🚀 Getting Started

Follow these instructions to get a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

Make sure you have Node.js and npm installed:
```bash
node -v
npm -v

```

### Installation & Local Run

1. **Clone the repository:**
```bash
git clone [https://github.com/mo12st/Cyberdrop-downloader.git](https://github.com/mo12st/Cyberdrop-downloader.git)
cd Cyberdrop-downloader

```


2. **Install dependencies:**
```bash
npm install

```


3. **Start the server:**
```bash
npm start

```


Open `http://localhost:3000` in your browser to see the app running.

---

## 🐳 Running with Docker

This project includes a `Dockerfile`, making it incredibly easy to run as an isolated container.

1. **Build the Docker Image:**
```bash
docker build -t cyberdrop-downloader .

```


2. **Run the Container:**
```bash
docker run -p 3000:3000 cyberdrop-downloader

```


The application will be accessible at `http://localhost:3000`.

---

## 📦 Cloud Deployment Configurations

The repository comes pre-configured for modern cloud hosting platforms:

* **Vercel:** Optimized via `vercel.json` for serverless frontend/backend hosting.
* **Render:** Infrastructure defined via `render.yaml` for rapid, automated blueprints deployment.

---

## 👤 Author

* **mo12st** - [GitHub Profile](https://www.google.com/search?q=https://github.com/mo12st)

---

*💡 Developed with focus on clean code, containerization, and seamless automation.*
