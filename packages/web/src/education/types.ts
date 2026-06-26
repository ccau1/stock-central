export interface EducationLink {
  type: "link";
  slug: string;
  label: string;
  icon?: string;
  file: string;
}

export interface EducationGroup {
  type: "group";
  label: string;
  icon?: string;
  children: EducationItem[];
}

export type EducationItem = EducationLink | EducationGroup;

export interface EducationConfig {
  title: string;
  description: string;
  items: EducationItem[];
}
