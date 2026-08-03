import { createFileRoute } from '@tanstack/react-router';
import PlatformProjectsPage from '@/components/PlatformProjectsPage';

export const Route = createFileRoute('/community')({
  component: PlatformProjectsPage,
  head: () => ({
    meta: [
      { title: 'مشاريع المنصة | IDEA BUSINESS' },
      {
        name: 'description',
        content:
          'مشاريع المنصة في IDEA BUSINESS: مجتمع، مشاريع، مزايدات، مناقصات، عروض مباشرة وشراء مباشر في قسم واحد.',      },
    ],
  }),
});
