import { AppRouter } from "./windows/app-router";
import { SettingsScreen } from "./features/settings/settings-screen";

export default function App() {
  return <AppRouter renderSettings={() => <SettingsScreen />} />;
}
