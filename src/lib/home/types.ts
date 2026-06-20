export type HomeSlideshowImage = {
  src: string;
  alt: string;
};

export type HomeDepartment = {
  name: string;
  role: string;
  description: string;
};

export type HomeSection = {
  id: string;
  title: string;
  subtitle?: string;
  paragraphs?: string[];
  bullets?: string[];
  departments?: HomeDepartment[];
  showDiscordCta?: boolean;
};

export type HomePageContent = {
  hero: {
    motto: string;
    lead: string;
  };
  slideshowImages: HomeSlideshowImage[];
  sections: HomeSection[];
};
