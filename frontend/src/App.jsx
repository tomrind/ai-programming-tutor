import { useBackendStatus } from './hooks/useBackendStatus.js';
import { StatusBar } from './components/StatusBar.jsx';
import { ProjectSelector } from './components/ProjectSelector.jsx';
import { ExercisePanel } from './components/ExercisePanel.jsx';
import { ChatWindow } from './components/ChatWindow.jsx';
import './styles.css';

export default function App() {
  const { health, project, diagnostics, error, refresh } = useBackendStatus();

  return (
    <div className="app">
      <header>
        <h1>KI-Tutor</h1>
        <StatusBar health={health} project={project} diagnostics={diagnostics} />
      </header>

      {error && <p className="error banner">Backend nicht erreichbar: {error}</p>}

      <main>
        <aside>
          <ProjectSelector project={project} onChange={refresh} />
          <ExercisePanel />
        </aside>

        <ChatWindow ready={Boolean(project?.selected)} /> 
      </main>
    </div>
  );
}