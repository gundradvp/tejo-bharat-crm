import React from 'react';
import { useNavigate } from 'react-router-dom';
import { App as QuotationApp } from './App';
import './print.css';

export default function BillingModule() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0a1128] text-slate-100 flex flex-col font-sans">
      <QuotationApp
        basePath="/billing"
        onBackToCrm={() => navigate('/')}
      />
    </div>
  );
}
