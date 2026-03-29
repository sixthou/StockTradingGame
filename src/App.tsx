import { theme } from './styles/theme';
import { useGameStore } from './state/gameStore';
import { StartScreen } from './components/StartScreen';
import { GameScreen } from './components/GameScreen';
import { ResultScreen } from './components/ResultScreen';

export default function App() {
  const screen = useGameStore((s) => s.screen);

  return (
    <div style={{
      backgroundColor: theme.bg.primary,
      color: theme.text.primary,
      minHeight: '100vh',
      fontFamily: "'SF Mono', 'Fira Code', 'Consolas', monospace",
    }}>
      {screen === 'start' && <StartScreen />}
      {screen === 'game' && <GameScreen />}
      {screen === 'result' && <ResultScreen />}
    </div>
  );
}
