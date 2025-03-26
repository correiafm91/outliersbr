
import React from 'react';
import { Badge } from "@/components/ui/badge";

const VersionBadge: React.FC = () => {
  return (
    <Badge variant="outline" className="fixed top-2 right-2 z-50 bg-background/80 text-xs font-mono">
      Versão 1.0.0
    </Badge>
  );
};

export default VersionBadge;
