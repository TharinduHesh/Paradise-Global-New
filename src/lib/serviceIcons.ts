import {
  Briefcase, Building2, Compass, FileCheck, Hammer, HardHat, Home, Hotel, KeyRound, Landmark, MapPin, PenTool, Scale, Shield, Star, Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/** Icons an admin can choose for a service. Unknown names fall back to FileCheck. */
export const serviceIcons: Record<string, LucideIcon> = {
  FileCheck, Home, Building2, Scale, PenTool, HardHat, Hotel, Briefcase, Landmark, Hammer, Compass, KeyRound, MapPin, Users, Shield, Star,
};

export const serviceIcon = (name: string) => serviceIcons[name] ?? FileCheck;
