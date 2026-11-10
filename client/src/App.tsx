import { Link, Route, Routes } from "react-router-dom";
import { TicketDetailPage } from "./pages/TicketDetailPage";
import { TicketListPage } from "./pages/TicketListPage";

export function App() {
  return (
    <Routes>
      <Route path="/" element={<TicketListPage />} />
      <Route path="/tickets/:id" element={<TicketDetailPage />} />
      <Route
        path="*"
        element={
          <main>
            <h1>Page not found</h1>
            <Link to="/">Go to the ticket queue</Link>
          </main>
        }
      />
    </Routes>
  );
}
