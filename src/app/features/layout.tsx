import FeatureList from './FeatureList';

export default function FeaturesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full min-h-screen">
      <FeatureList />
      <div className="flex-1 relative">{children}</div>
    </div>
  );
} 