# TALQS - A Next.js and Python Application

This project is a full-stack application with a Next.js frontend and a Python backend.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the Application](#running-the-application)
- [Project Structure](#project-structure)

## Prerequisites

Before you begin, ensure you have the following installed:

- [Node.js](https://nodejs.org/) (v18 or later recommended)
- [Python](https://www.python.org/) (v3.8 or later recommended)
- [pip](https://pip.pypa.io/en/stable/installation/) (Python package installer)

## Installation

1.  **Clone the repository:**
    ```bash
    git clone <your-repository-url>
    cd <repository-name>
    ```

2.  **Install frontend dependencies:**
    Navigate to the root directory and run:
    ```bash
    npm install
    ```

3.  **Install backend dependencies:**
    Navigate to the `backend` directory and run:
    ```bash
    cd backend
    pip install -r requirements.txt
    cd ..
    ```

## Configuration

This project requires environment variables to run correctly. These variables handle things like database connections and authentication keys.

### Frontend Configuration

1.  In the root directory of the project, create a file named `.env.local`.

2.  Add the necessary environment variables to this file. You will need to provide your own values. Here is an example based on the project's dependencies:

    ```env
    # MongoDB Connection String
    MONGODB_URI=mongodb+srv://<user>:<password>@<cluster-url>/<database-name>?retryWrites=true&w=majority

    # NextAuth.js Configuration
    # You can generate a secret using `openssl rand -base64 32` on Linux/Mac or use an online generator
    NEXTAUTH_SECRET=
    NEXTAUTH_URL=http://localhost:3000

    # Google Provider for NextAuth.js
    # Get these from the Google Cloud Console for your project
    GOOGLE_CLIENT_ID=
    GOOGLE_CLIENT_SECRET=
    ```

### Backend Configuration

The Python backend might also require environment variables. Check the backend source code (`server.py`, `qa_server.py`, `app.py`) for any `os.getenv` or `os.environ.get` calls to see what is required.

## Running the Application

You need to run the backend servers and the frontend development server in separate terminals.

1.  **Start the Backend Servers:**
    Open a terminal, navigate to the `backend` directory, and run the following commands. It's recommended to run each in a separate terminal tab or window.

    ```bash
    # In the backend/ directory
    python server.py
    ```

    ```bash
    # In another terminal, in the backend/ directory
    python qa_server.py
    ```

2.  **Start the Frontend Development Server:**
    Open another terminal, navigate to the **root** directory of the project, and run:

    ```bash
    npm run dev
    ```
