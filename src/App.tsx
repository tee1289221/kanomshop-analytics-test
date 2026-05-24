import { useState } from 'react';
import Nav, { type Page } from './components/Nav';
import Dashboard from './pages/Dashboard';
import YoY from './pages/YoY';
import './index.css';

const SOON = ({ name }: { name: string }) => (
  <div className="min-h-screen bg-bg0 flex items-center justify-center text-creamD text-lg">
    {name} — กำลังสร้าง…
  </div>
);

export default function App() {
  const [page, setPage] = useState<Page>('dashboard');

  return (
    <>
      <Nav current={page} onChange={setPage} />
      {page === 'dashboard' && <Dashboard />}
      {page === 'yoy'       && <YoY />}
      {page === 'forecast'  && <SOON name="Forecast" />}
      {page === 'price'     && <SOON name="Price Calculator" />}
      {page === 'recipe'    && <SOON name="Recipe Cost" />}
    </>
  );
}
