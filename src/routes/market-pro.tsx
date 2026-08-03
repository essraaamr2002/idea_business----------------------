import { createFileRoute, redirect } from '@tanstack/react-router';

// Merged into /market (tab: السوق الموازي · IDX)
export const Route = createFileRoute('/market-pro')({
  beforeLoad: () => {
    throw redirect({ to: '/market' });
  },
});
