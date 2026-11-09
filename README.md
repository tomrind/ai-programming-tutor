# ai-programming-tutor
Prototype of an AI Tutor for beginner programmers

# Installation
Repository klonen und in das Projektverzeichnis wechseln:

```bash
git clone <Repository-URL>
cd ai-programming-tutor


Backend installieren:
cd backend
npm ci
cp .env.example .env
cd ..


Frontend installieren:
cd frontend
npm ci
cd ..


KI-Modell herunterladen (einmalig, ca. 2,5 GB):
ollama pull qwen3:4b-instruct


Starten
Ollama muss bereits laufen (über die Menüleisten-App oder mit ollama serve).

Anschließend Backend und Frontend in zwei separaten Terminals starten.

Terminal 1 – Backend:
cd backend
npm run dev


Terminal 2 – Frontend:
cd frontend
npm run dev


Anwendung öffnen
Anschließend die Anwendung im Browser öffnen:

http://localhost:5173

Die Statusleiste am oberen Rand zeigt an, ob das KI-Modell, das Projekt und der Compiler bereit sind.
