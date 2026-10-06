import React from 'react';
import { Sidebar } from './Sidebar';

export function AppShell({ children }) {
  return (
    <div id="app">
      <Sidebar />
      <main className="main">{children}</main>
    </div>
  );
}
