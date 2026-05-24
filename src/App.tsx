import { useState } from 'react';
import Nav, { type Page } from './components/Nav';
import Dashboard from './pages/Dashboard';
import YoY from './pages/YoY';
import Forecast from './pages/Forecast';
import PriceCalc from './pages/PriceCalc';
import RecipeCost from './pages/RecipeCost';
import './index.css';

export default function App() {
  const [page, setPage] = useState<Page>('dashboard');

  return (
    <>
      <Nav current={page} onChange={setPage} />
      {page === 'dashboard' && <Dashboard />}
      {page === 'yoy'       && <YoY />}
      {page === 'forecast'  && <Forecast />}
      {page === 'price'     && <PriceCalc />}
      {page === 'recipe'    && <RecipeCost />}
    </>
  );
}
