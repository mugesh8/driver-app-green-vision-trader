import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Header from '../components/Header';
import BottomNav from '../components/BottomNav';
import Drawer from '../components/Drawer';

export default function MainLayout() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#1A1A1A] pb-20">
      <Header onMenuClick={() => setIsDrawerOpen(true)} />
      <main>
        <Outlet />
      </main>
      <BottomNav />
      <Drawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />
    </div>
  );
}
