# Skill Navigator

Students often know they want a career in technology but do not know what skills they are missing, what

projects they should build or how to structure their learning journey. Build SkillForge, an AI-powered platform

that evaluates a student's current skills and generates a practical development roadmap.

Core Users

Student — can create a profile, add skills, add projects, upload a CV/resume, set a career goal, take a skill

assessment, receive a roadmap, and ask the AI career assistant.

Mentor/Admin — can view student profiles, create learning resources, create assessments, and recommend

resources.

Required Features

Student Profile

Include name, education, skills, projects, certifications, career goal, and experience level.

Skill Assessment

Create a basic assessment system covering areas such as Python, Web Development, Git, DevOps, AI, and

Database, generating a simple score.

Career Roadmap

Current Level

↓

Skill Gap

↓

Recommended Topics

LoopLab · Looplearn Hackathon 2026 Page 12

↓

Projects

↓

Resources

↓

Target Role

AI Requirements

Generative AI

"I know Python and basic web development. I want to become an AI engineer. What should I learn next?"

The AI generates a roadmap.

RAG

Knowledge base could contain learning resources, technology documentation, career roadmaps, project ideas,

skill descriptions, and course information. The assistant must ground recommendations in this knowledge base.

Agentic AI — Career Planning Agent

Tools: analyze student skills, search learning resources, generate skill gap, create roadmap.

"Analyze my profile and tell me what I should learn next."

The agent should retrieve the user's skills, identify gaps, and recommend resources.

Python + OOP

Python service such as SkillAnalyzer, SkillGapCalculator, or RoadmapGenerator — e.g. a SkillAnalyzer with

calculate_score(), identify_gaps(), and recommend_topics().

Web Development

Build a dashboard containing skill cards, progress bars, a roadmap timeline, a project portfolio, assessment

results, and the AI assistant.

Authentication & Authorization

Roles: Student, Mentor, Admin. For example: a student can edit their own profile, a mentor can review assigned

students, and an admin can manage resources.

Microservices

React

↓

API GatewayAuth Service / Profile API / AI Service

↓

Python Analyzer / Skill Service

DevOps Requirements

GitHub, Linux shell script, Docker, Kubernetes manifests, Terraform, deployment, and basic CI/CD

documentation. A real CI/CD pipeline is a bonus, not mandatory.

Submission for PS-03

■ GitHub repository

■ Live application

■ Student dashboard

■ Admin/mentor dashboard

■ AI assistant

■ RAG knowledge base

■ Agent implementation

■ Python service

■ API documentation

■ Architecture diagram

■ Docker files

■ Kubernetes manifests

■ Terraform files

■ Linux shell script

■ Database schema

■ Demo video

■ Presentation

■ README

Required Demo

Create account

↓

Create student profile

↓

Add skills

↓

Take assessment

↓

LoopLab · Looplearn Hackathon 2026 Page 14

View skill gaps

↓

Generate AI roadmap

↓

Ask RAG assistant

↓

Career Agent analyzes profile

↓

Show deployment/containerization

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://future-ready-dev.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/c826384d-ed98-41e0-8bb7-aec49e3c1e4c).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
