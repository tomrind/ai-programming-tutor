import { useEffect, useState } from 'react';
import { api } from '../services/api.js';

export function ExercisePanel() {
  const [exercises, setExercises] = useState([]);
  const [current, setCurrent] = useState(null);

  useEffect(() => {
    api.getExercises().then((d) => setExercises(d.exercises)).catch(() => {});
    api.getCurrentExercise().then((d) => setCurrent(d.exercise)).catch(() => {});
  }, []);

  async function choose(id) {
    const { exercise } = await api.selectExercise(id);
    setCurrent(exercise);
  }

  return (
    <section className="panel">
      <h2>Aufgabe</h2>

      <select value={current?.id ?? ''} onChange={(e) => choose(e.target.value)}>
        <option value="" disabled>Aufgabe wählen…</option>
        {exercises.map((ex) => (
          <option key={ex.id} value={ex.id}>{ex.title}</option>
        ))}
      </select>

      {current && (
        <pre className="description">{current.description}</pre>
      )}
    </section>
  );
}