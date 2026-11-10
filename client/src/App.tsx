import { Link, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { TicketDetailPage } from "./pages/TicketDetailPage";
import { TicketListPage } from "./pages/TicketListPage";

export function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<TicketListPage />} />
        <Route path="/tickets/:id" element={<TicketDetailPage />} />
        <Route
          path="*"
          element={
            <main className="page">
              <h1 className="page-title">Page not found</h1>
              <Link to="/">Go to the ticket queue</Link>
            </main>
          }
        />
      </Routes>
    </AppShell>
  );
}
